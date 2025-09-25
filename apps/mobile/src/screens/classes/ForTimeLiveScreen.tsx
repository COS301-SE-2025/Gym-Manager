// apps/mobile/src/screens/classes/ForTimeLiveScreen.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, StatusBar,
  Modal, TextInput, TouchableOpacity, ActivityIndicator, Animated
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { BlurView } from 'expo-blur';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { useMyProgress } from '../../hooks/useMyProgress';
import { LbFilter, useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken, getUser } from '../../utils/authStorage';
import config from '../../config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HypeToast } from '../../components/HypeToast';
import { useLeaderboardHype } from '../../hooks/useLeaderboardHype';


type R = RouteProp<AuthStackParamList, 'ForTimeLive'>;

function useNowSec() {
  const [now, setNow] = React.useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

function toEpochSecMaybe(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  const s = String(ts).replace(' ', 'T');
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  const iso = hasTZ ? s : s + 'Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms/1000) : 0;
}

// "10 x Pushups"  or  "10 sec — Plank"
function fmtStepLabel(step: any): string {
  const qtyType = step?.quantityType ?? (typeof step?.reps === 'number' ? 'reps' : (typeof step?.duration === 'number' ? 'duration' : undefined));
  if (qtyType === 'reps' && typeof step?.reps === 'number') {
    return `${step.reps} x ${step?.name ?? '—'}`;
  }
  if (qtyType === 'duration' && typeof step?.duration === 'number') {
    return `${step.duration} sec — ${step?.name ?? '—'}`;
  }
  return step?.name ?? '—';
}

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

export default function ForTimeLiveScreen() {
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


  const session = useSession(classId);
  const progress = useMyProgress(classId);
  
  const [scope, setScope] = useState<LbFilter>('ALL');
  const lb = useLeaderboardRealtime(classId, scope);

  // More reliable user ID detection using the same method as useMyProgress
  const [myUserId, setMyUserId] = useState<number | null>(null);
  useEffect(() => {
    const fetchUserId = async () => {
      const user = await getUser();
      const userId = user?.userId || user?.id;
      setMyUserId(userId || null);
    };
    fetchUserId();
  }, []);

  const hypeOptedOut =
    (session as any)?.workout_metadata?.hype_opt_out === true ||
    (progress as any)?.hype_opt_out === true ||
    false;

  const hype = useLeaderboardHype(lb, myUserId || undefined, hypeOptedOut);


  const steps: any[] = (session?.steps as any[]) ?? [];
  const cum: number[] = (session?.steps_cum_reps as any[]) ?? [];
  const ready = Array.isArray(steps) && steps.length > 0;

  // local, optimistic step index synced from server progress
  const [localIdx, setLocalIdx] = useState(0);
  useEffect(() => {
    if (!ready) return;
    setLocalIdx(Math.max(0, Math.min(steps.length, Number(progress.current_step ?? 0))));
  }, [ready, progress.current_step, steps.length]);

  // pause-aware elapsed seconds (robust if epoch helpers missing)
  const nowSec = useNowSec();
  const startedAtSec = Number((session as any)?.started_at_s ?? 0) || toEpochSecMaybe((session as any)?.started_at);
  const pausedAtSec  = Number((session as any)?.paused_at_s  ?? 0) || toEpochSecMaybe((session as any)?.paused_at);
  const pauseAccum   = Number((session as any)?.pause_accum_seconds ?? 0);
  const extraPaused  = session?.status === 'paused' && pausedAtSec ? Math.max(0, nowSec - pausedAtSec) : 0;
  const elapsed      = startedAtSec ? Math.max(0, (nowSec - startedAtSec) - (pauseAccum + extraPaused)) : 0;

  const cap = session?.time_cap_seconds ?? 0;
  const timeUp = cap > 0 && elapsed >= cap;

  const current = ready ? steps[localIdx] : undefined;
  const next = ready ? steps[localIdx + 1] : undefined;
  const finished =
    !!(progress as any)?.finished_at_s ||
    !!progress.finished_at ||
    (ready ? localIdx >= steps.length : false);

  const scoreSoFar = useMemo(() => {
    if (!ready) return undefined;
    if (finished && (session?.workout_type ?? '').toUpperCase() === 'FOR_TIME') return undefined;
    const within = localIdx > 0 ? (cum[localIdx - 1] ?? 0) : 0;
    return within + (progress.dnf_partial_reps ?? 0);
  }, [ready, finished, localIdx, cum, progress.dnf_partial_reps, session?.workout_type]);

  const askPartial = ready && !finished && (timeUp || session?.status === 'ended');

  const [modalOpen, setModalOpen] = useState(false);
  const [partial, setPartial] = useState('');
  useEffect(() => {
    if (askPartial && !modalOpen) setModalOpen(true);
  }, [askPartial, modalOpen]);

  const sendPartial = async () => {
    const token = await getToken();
    await axios.post(`${config.BASE_URL}/live/${classId}/partial`, {
      reps: Math.max(0, Number(partial) || 0)
    }, { headers: { Authorization: `Bearer ${token}` } });
    setModalOpen(false);

    // If coach already ended the class, go to end now that we have the partial
    if (session?.status === 'ended' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      nav.replace('LiveClassEnd', { classId });
    }
  };

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const go = async (dir: 1 | -1) => {
    if (!ready) return;
    if (session?.status !== 'live') return; // locked during pause/ended

    setLocalIdx(idx => clamp(idx + (dir === 1 ? 1 : -1), 0, steps.length));
    try {
      const token = await getToken();
      await axios.post(`${config.BASE_URL}/live/${classId}/advance`, {
        direction: dir === 1 ? 'next' : 'prev'
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      setLocalIdx(idx => clamp(idx + (dir === 1 ? -1 : 1), 0, steps.length));
    }
  };

  // navigate to end exactly once, respecting partial prompt
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (hasNavigatedRef.current || !ready) return;

    // finished by user (before coach ends)
    if (finished && session?.status !== 'ended') {
      hasNavigatedRef.current = true;
      nav.replace('LiveClassEnd', { classId });
      return;
    }

    // coach ended: only auto-navigate if we DON'T need partial
    if (session?.status === 'ended' && !askPartial) {
      hasNavigatedRef.current = true;
      nav.replace('LiveClassEnd', { classId });
    }
  }, [ready, finished, session?.status, askPartial, nav, classId]);

  const totalSteps = steps.length;

  // animated fade for pause overlay
  const pausedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pausedAnim, {
      toValue: session?.status === 'paused' ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [session?.status, pausedAnim]);
  const fadeOpacity = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const scaleIn = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  return (
    <View style={s.root}>
      <StatusBar hidden={true} />
      <SafeAreaView style={s.safeArea} edges={['left', 'right']}>

      {/* single timer */}
      <View pointerEvents="none" style={s.topOverlay}>
        <Text style={s.timeTop} pointerEvents="none">{fmt(elapsed)}</Text>
      </View>

      <HypeToast text={hype.text} show={hype.show} style={{ position: 'absolute', top: 46 }} />

      {/* centered content */}
      <View pointerEvents="box-none" style={s.centerOverlay}>
        {!ready ? (
          <>
            <ActivityIndicator size="large" color="#D8FF3E" pointerEvents="none" />
            <Text style={{ color: '#a5a5a5', marginTop: 10, fontWeight: '700' }} pointerEvents="none">Getting class ready…</Text>
          </>
        ) : (
          <>
            <Text style={s.stepCounter} pointerEvents="none">{String(localIdx + 1).padStart(2,'0')} / {String(totalSteps).padStart(2,'0')}</Text>
            {!!scoreSoFar && <Text style={s.score} pointerEvents="none">{scoreSoFar} reps</Text>}
            <Text style={s.current} pointerEvents="none">{fmtStepLabel(current)}</Text>
            <Text style={s.nextLabel} pointerEvents="none">Next: {fmtStepLabel(next)}</Text>

            <View style={[s.lb, { zIndex: 50, elevation: 6 }]} pointerEvents="box-none">
              <Text style={s.lbTitle} pointerEvents="none">Leaderboard</Text>

              {/* RX/SC filter */}
              <View style={{ flexDirection:'row', justifyContent:'center', gap:6, marginBottom:8 }} pointerEvents="auto">
                {(['ALL','RX','SC'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={()=>setScope(opt)}
                    style={{
                      paddingHorizontal:10, paddingVertical:6, borderRadius:999,
                      backgroundColor: scope===opt ? '#2e3500' : '#1f1f1f',
                      borderWidth:1, borderColor: scope===opt ? '#d8ff3e' : '#2a2a2a'
                    }}
                  >
                    <Text style={{ color: scope===opt ? '#d8ff3e' : '#9aa', fontWeight:'800' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {lb.slice(0, 3).map((r: any, i: number) => {
                const displayName =
                  (r.first_name || r.last_name)
                    ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                    : (r.name ?? `User ${r.user_id}`);
                return (
                  <View key={`${r.user_id}-${i}`} style={s.lbRow} pointerEvents="none">
                    <Text style={s.lbPos} pointerEvents="none">{i+1}</Text>
                    <Text style={s.lbUser} pointerEvents="none">
                      {displayName} <Text style={{ color:'#9aa' }} pointerEvents="none">({(r.scaling ?? 'RX')})</Text>
                    </Text>
                    <Text style={s.lbScore} pointerEvents="none">
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
        <Pressable style={s.next} android_ripple={{color:'#0a0'}} onPress={() => go(1)} disabled={!ready || session?.status !== 'live'} />
      </View>

      {/* PAUSE overlay */}
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

      {/* DNF prompt */}
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
    </View>
  );

}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d150f' },
  safeArea: { flex: 1 },
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
