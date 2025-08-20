import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar,
  Modal, TextInput, TouchableOpacity, ActivityIndicator, Animated
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { BlurView } from 'expo-blur';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { useMyProgress } from '../../hooks/useMyProgress';
import { useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type R = RouteProp<AuthStackParamList, 'AmrapLive'>;

function useNowSec() {
  const [now, setNow] = React.useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function AmrapLiveScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;
  const nav = useNavigation<any>();

  // lock to LANDSCAPE while this screen is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT); } catch {}
      })();
      return () => {
        (async () => {
          try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch {}
        })();
      };
    }, [])
  );

  const session = useSession(classId);                // realtime + light poll
  const progress = useMyProgress(classId);            // realtime + light poll
  const lb = useLeaderboardRealtime(classId);

  const steps: any[] = (session?.steps as any[]) ?? [];
  const cum: number[] = (session?.steps_cum_reps as any[]) ?? [];
  const ready = Array.isArray(steps) && steps.length > 0;
  const stepCount = steps.length;

  // local optimistic step index (AMRAP wraps)
  const [localIdx, setLocalIdx] = useState(0);
  useEffect(() => {
    if (!ready) return;
    // keep in [0..stepCount-1]; server drives rounds_completed
    const sv = Number(progress.current_step ?? 0);
    const safe = stepCount > 0 ? Math.max(0, Math.min(stepCount - 1, sv)) : 0;
    setLocalIdx(safe);
  }, [ready, progress.current_step, stepCount]);

  // pause-aware timer
  const nowSec       = useNowSec();
  const startedAtSec = Number((session as any)?.started_at_s ?? 0);
  const pausedAtSec  = Number((session as any)?.paused_at_s ?? 0);
  const pauseAccum   = Number((session as any)?.pause_accum_seconds ?? 0);
  const extraPaused  = session?.status === 'paused' && pausedAtSec ? Math.max(0, nowSec - pausedAtSec) : 0;
  const elapsed      = startedAtSec ? Math.max(0, (nowSec - startedAtSec) - (pauseAccum + extraPaused)) : 0;

  const cap    = session?.time_cap_seconds ?? 0;
  const timeUp = cap > 0 && elapsed >= cap;

  // AMRAP never "finishes" early; only ends when coach stops or cap reached
  const finished = false;

  // per-round total reps = last cumulative value (0 if no reps)
  const repsPerRound = useMemo(() => {
    if (!ready) return 0;
    if (!Array.isArray(cum) || cum.length === 0) return 0;
    return Number(cum[cum.length - 1] ?? 0);
  }, [ready, cum]);

  const withinRound = useMemo(() => {
    if (!ready) return 0;
    if (localIdx <= 0) return 0;
    return Number(cum[localIdx - 1] ?? 0);
  }, [ready, localIdx, cum]);

  const scoreSoFar = useMemo(() => {
    if (!ready) return undefined;
    const roundsDone = Number(progress.rounds_completed ?? 0);
    const partial = Number(progress.dnf_partial_reps ?? 0);
    return (roundsDone * repsPerRound) + withinRound + partial;
  }, [ready, progress.rounds_completed, progress.dnf_partial_reps, repsPerRound, withinRound]);

  // We always ask for partial reps at end/stop for AMRAP
  const askPartial = ready && (timeUp || session?.status === 'ended');

  const [modalOpen, setModalOpen] = useState(false);
  const [partial, setPartial] = useState('');
  useEffect(() => { if (askPartial && !modalOpen) setModalOpen(true); }, [askPartial, modalOpen]);

  const sendPartial = async () => {
    const token = await getToken();
    await axios.post(`${config.BASE_URL}/live/${classId}/partial`, {
      reps: Math.max(0, Number(partial) || 0)
    }, { headers: { Authorization: `Bearer ${token}` } });
    setModalOpen(false);
    if (session?.status === 'ended' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      nav.replace('LiveClassEnd', { classId });
    }
  };

  const go = async (dir: 1 | -1) => {
    if (!ready) return;
    if (session?.status !== 'live') return; // locked during pause/ended
    if (stepCount === 0) return;

    // optimistic wrap for AMRAP
    setLocalIdx(idx => {
      const next = (idx + (dir === 1 ? 1 : -1) + stepCount) % stepCount;
      return next;
    });

    try {
      const token = await getToken();
      await axios.post(`${config.BASE_URL}/live/${classId}/advance`, {
        direction: dir === 1 ? 'next' : 'prev'
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // on failure, undo optimistic change (wrap back)
      setLocalIdx(idx => {
        const prev = (idx + (dir === 1 ? -1 : 1) + stepCount) % stepCount;
        return prev;
      });
    }
  };

  // navigate to end exactly once (after partial submitted if needed)
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (hasNavigatedRef.current || !ready) return;
    if (session?.status === 'ended' && !askPartial) {
      hasNavigatedRef.current = true;
      nav.replace('LiveClassEnd', { classId });
    }
  }, [ready, session?.status, askPartial, nav, classId]);

  // pause overlay animation
  const pausedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pausedAnim, { toValue: session?.status === 'paused' ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [session?.status, pausedAnim]);
  const fadeOpacity = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const scaleIn = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  const current  = ready ? steps[localIdx] : undefined;
  const next     = ready ? steps[(localIdx + 1) % Math.max(1, stepCount)] : undefined;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d150f" />

      {/* single timer */}
      <View pointerEvents="none" style={s.topOverlay}>
        <Text style={s.timeTop}>{fmt(elapsed)}</Text>
      </View>

      {/* centered content */}
      <View pointerEvents="none" style={s.centerOverlay}>
        {!ready ? (
          <>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={{ color: '#a5a5a5', marginTop: 10, fontWeight: '700' }}>Getting class ready…</Text>
          </>
        ) : (
          <>
            <Text style={s.stepCounter}>
              {String(localIdx + 1).padStart(2,'0')} / {String(stepCount).padStart(2,'0')}
              {typeof progress.rounds_completed === 'number' ? `   •   Rounds: ${progress.rounds_completed}` : ''}
            </Text>
            {!!scoreSoFar && <Text style={s.score}>{scoreSoFar} reps</Text>}
            <Text style={s.current}>{current?.name ?? '—'}</Text>
            <Text style={s.nextLabel}>Next: {next?.name ?? '—'}</Text>

            <View style={s.lb}>
              <Text style={s.lbTitle}>Leaderboard</Text>
              {lb.slice(0, 6).map((r: any, i: number) => {
                const displayName =
                  (r.first_name || r.last_name)
                    ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                    : (r.name ?? `User ${r.user_id}`);
                return (
                  <View key={`${r.user_id}-${i}`} style={s.lbRow}>
                    <Text style={s.lbPos}>{i+1}</Text>
                    <Text style={s.lbUser}>{displayName}</Text>
                    <Text style={s.lbScore}>
                      {r.finished ? fmt(Number(r.elapsed_seconds ?? 0)) : `${Number(r.total_reps ?? 0)} reps`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* press zones */}
      <View style={s.row}>
        <Pressable style={s.back} android_ripple={{color:'#000'}} onPress={() => go(-1)} disabled={!ready || session?.status !== 'live'} />
        <Pressable style={s.next} android_ripple={{color:'#0a0'}} onPress={() => go(1)}  disabled={!ready || session?.status !== 'live'} />
      </View>

      {/* pause overlay */}
      {session?.status === 'paused' && (
        <View style={s.pausedOverlay} pointerEvents="auto">
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor:'#000', opacity: fadeOpacity }]} />
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={{ alignItems:'center', transform:[{ scale: scaleIn }] }}>
            <Text style={s.pausedTitle}>PAUSED</Text>
            <Text style={s.pausedSub}>waiting for coach...</Text>
          </Animated.View>
        </View>
      )}

      {/* partial reps prompt */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={()=>{}}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Time’s up — last exercise reps</Text>
            <TextInput
              value={partial} onChangeText={setPartial} keyboardType="numeric"
              style={s.modalInput} placeholder="0" placeholderTextColor="#7a7a7a"
            />
            <TouchableOpacity style={s.modalBtn} onPress={sendPartial}>
              <Text style={s.modalBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d150f' },
  row: { flex: 1, flexDirection: 'row' },
  back: { flex: 1, backgroundColor: '#2b0f0f' },
  next: { flex: 3, backgroundColor: '#0f1a13' },

  topOverlay: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  centerOverlay: { position: 'absolute', top: '20%', left: 20, right: 20, alignItems: 'center', zIndex: 9 },

  timeTop: { color:'#e6e6e6', fontWeight:'900', fontSize: 26 },
  stepCounter: { color:'#d8ff3e', fontWeight:'900', marginBottom: 6 },
  score: { color:'#cfd7cf', fontWeight:'900', marginTop: 2 },
  current: { color:'#fff', fontSize: 44, fontWeight:'900', marginTop: 6, textAlign:'center' },
  nextLabel: { color:'#9aa59b', fontWeight:'800', marginTop: 6 },

  lb: { marginTop: 16, width:'80%', backgroundColor:'#111', borderRadius:12, padding:12 },
  lbTitle: { color:'#fff', fontWeight:'800', marginBottom: 6, textAlign:'center' },
  lbRow: { flexDirection:'row', alignItems:'center', paddingVertical:4 },
  lbPos: { width: 22, color:'#d8ff3e', fontWeight:'900' },
  lbUser:{ flex:1, color:'#dedede' },
  lbScore:{ color:'#fff', fontWeight:'800' },

  pausedOverlay: { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center', zIndex: 20 },
  pausedTitle: { color:'#fff', fontWeight:'900', fontSize: 44, letterSpacing: 2, textAlign:'center' },
  pausedSub:   { color:'#eaeaea', fontWeight:'700', marginTop: 6, fontSize: 14, textAlign:'center' },

  modalWrap: { flex:1, backgroundColor:'rgba(0,0,0,0.65)', alignItems:'center', justifyContent:'center' },
  modalCard: { backgroundColor:'#151515', borderRadius:14, padding:18, width:'80%' },
  modalTitle:{ color:'#fff', fontWeight:'800', marginBottom:12, textAlign:'center' },
  modalInput:{ backgroundColor:'#222', borderRadius:10, color:'#fff', fontSize:24, fontWeight:'900', paddingVertical:8, textAlign:'center' },
  modalBtn:{ backgroundColor:'#d8ff3e', borderRadius:10, paddingVertical:14, marginTop:12 },
  modalBtnText:{ color:'#111', fontWeight:'900', textAlign:'center' },
});
