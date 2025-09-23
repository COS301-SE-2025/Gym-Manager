import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, StatusBar,
  ActivityIndicator, Animated, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { BlurView } from 'expo-blur';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { LbFilter, useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { useImmersiveBars } from '../../hooks/useImmersiveBars';


type R = RouteProp<AuthStackParamList, 'EmomLive'>;

function useNowSec() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250); return () => clearInterval(id); }, []);
  return now;
}
const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export default function EmomLiveScreen() {
  const route = useRoute<R>();
  const classId = Number(route.params.classId);
  const nav = useNavigation<any>();

  useFocusEffect(
    React.useCallback(() => {
      (async () => { try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT); } catch {} })();
      return () => { (async () => { try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch {} })(); };
    }, [])
  );

  if (!classId) {
    return (
      <View style={s.root}>
        <StatusBar hidden={true} />
        <SafeAreaView style={s.safeArea} edges={['left', 'right']}>
          <View style={{ padding: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Missing classId</Text>
            <Text style={{ color: '#aaa', marginTop: 6 }}>
              Ensure AuthStackParamList includes {'{ EmomLive: { classId: number } }'} and the navigator passes it.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const session = useSession(classId);

  const [scope, setScope] = useState<LbFilter>('ALL');
  const lb = useLeaderboardRealtime(classId, scope);

  // --- Steps with metadata fallback ---
  const stepsFromSession: any[] = Array.isArray((session as any)?.steps) ? ((session as any).steps as any[]) : [];

  // Optional metadata fallback: workout_metadata.emom_rounds = [ [ex, ex...], [ex, ex...] ]
  // Each ex can be a string or { name: string }
  const metaRounds: any[] | null = Array.isArray((session as any)?.workout_metadata?.emom_rounds)
    ? (session as any).workout_metadata.emom_rounds
    : null;

  const fallbackSteps: any[] = useMemo(() => {
    if (!metaRounds) return [];
    const built: any[] = [];
    let idx = 0;
    metaRounds.forEach((roundArr, rIdx) => {
      if (!Array.isArray(roundArr)) return;
      roundArr.forEach((ex: any, i: number) => {
        const name = typeof ex === 'string' ? ex : String(ex?.name ?? '');
        if (!name) return;
        built.push({
          index: idx++,
          round: rIdx + 1,
          subround: 1,
          name,
          duration: 60, // EMOM minute; UI doesn't rely on this, but handy to keep consistent
        });
      });
    });
    return built;
  }, [metaRounds]);

  const steps: any[] = stepsFromSession.length ? stepsFromSession : fallbackSteps;

  // ✅ Consider the session "ready" when we have a session row; exercises will appear as soon as steps arrive or fallback builds them.
  const ready = !!session;

  // group by round
  const rounds = useMemo(() => {
    const byRound: Record<number, any[]> = {};
    for (const s of steps) {
      const r = Number((s as any)?.round ?? 1);
      byRound[r] ??= [];
      byRound[r].push(s);
    }
    for (const k of Object.keys(byRound)) byRound[Number(k)].sort((a, b) => Number(a.index) - Number(b.index));
    return byRound;
  }, [steps]);

  // repeats from metadata (workout_metadata.emom_repeats) or default 1× per round
  const repeats: number[] = useMemo(() => {
    const j = (session as any)?.workout_metadata?.emom_repeats;
    if (Array.isArray(j) && j.every(x => Number.isFinite(Number(x)))) return j.map((x: any) => Number(x));
    const maxRound = Math.max(0, ...Object.keys(rounds).map(n => Number(n)));
    return Array.from({ length: maxRound }, () => 1);
  }, [session, rounds]);

  // minute plan: each entry is the round number for that minute
  const minutePlan: number[] = useMemo(() => {
    const arr: number[] = [];
    let r = 1;
    for (const rep of repeats) { for (let i = 0; i < rep; i++) arr.push(r); r += 1; }
    return arr;
  }, [repeats]);
  const totalMinutes = minutePlan.length;

  // pause-aware elapsed
  const nowSec = useNowSec();
  const startedAtSec = Number((session as any)?.started_at_s ?? 0);
  const pausedAtSec  = Number((session as any)?.paused_at_s  ?? 0);
  const pauseAccum   = Number((session as any)?.pause_accum_seconds ?? 0);
  const extraPaused  = session?.status === 'paused' && pausedAtSec ? Math.max(0, nowSec - pausedAtSec) : 0;
  const elapsed      = startedAtSec ? Math.max(0, (nowSec - startedAtSec) - (pauseAccum + extraPaused)) : 0;

  // time -> minute index (no wrap)
  const minuteIdxRaw = Math.floor(elapsed / 60);
  const minuteIdx    = Math.min(Math.max(0, minuteIdxRaw), Math.max(0, totalMinutes - 1));
  const secIntoMin   = elapsed - minuteIdx * 60;
  const plannedDone  = totalMinutes > 0 && elapsed >= totalMinutes * 60;

  const currentRoundNo = totalMinutes > 0 ? minutePlan[minuteIdx] : 1;
  const currentRound   = rounds[currentRoundNo] ?? [];
  const totalInRound   = currentRound.length;

  // local within the current minute
  const [localIdx, setLocalIdx] = useState(0);
  const [finishedThisMinute, setFinishedThisMinute] = useState(false);
  const sentForMinute = useRef<Set<number>>(new Set());

  const canAct =
    !!session?.class_id &&
    (session?.status === 'live' || session?.status === 'paused' || session?.status === 'ended') &&
    (totalMinutes > 0);

  // submit mark helper
  const mark = useCallback(async (finished: boolean, mIdx: number, completed: number, total: number, finishSeconds?: number) => {
    if (!canAct) return;
    try {
      const token = await getToken();
      await axios.post(
        `${config.BASE_URL}/live/${classId}/emom/mark`,
        {
          minuteIndex: mIdx,
          finished,
          finishSeconds: finished ? Math.max(0, Math.floor(finishSeconds || 0)) : null,
          exercisesCompleted: Math.max(0, completed),
          exercisesTotal: Math.max(0, total)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      sentForMinute.current.add(mIdx);
    } catch {
      // retry on next tick / boundary if needed
    }
  }, [canAct, classId]);

  // react to minute change: if we left the previous minute without finishing, submit a 60s (penalized) mark
  const prevMinuteRef = useRef<number>(minuteIdx);
  useEffect(() => {
    if (!canAct) return;
    const prev = prevMinuteRef.current;
    if (prev !== minuteIdx && !sentForMinute.current.has(prev) && !plannedDone) {
      const prevRoundNo = minutePlan[prev] ?? currentRoundNo;
      const totalPrev   = (rounds[prevRoundNo] ?? []).length;
      const completed   = Math.max(0, Math.min(localIdx, totalPrev));
      (async () => { await mark(false, prev, completed, totalPrev, 60); })();
    }
    if (prev !== minuteIdx) {
      prevMinuteRef.current = minuteIdx;
      setLocalIdx(0);
      setFinishedThisMinute(false);
    }
  }, [minuteIdx, canAct]); // eslint-disable-line react-hooks/exhaustive-deps

  // when user reaches the end within the minute, auto-mark with actual finish time
  useEffect(() => {
    if (!canAct || plannedDone || totalInRound === 0) return;
    if (finishedThisMinute) return;
    if (localIdx >= totalInRound) {
      setFinishedThisMinute(true);
      (async () => { await mark(true, minuteIdx, totalInRound, totalInRound, secIntoMin); })();
    }
  }, [localIdx, finishedThisMinute, canAct, plannedDone, minuteIdx, totalInRound, secIntoMin, mark]);

  // if plan is done: submit last partial (if not sent) then navigate to end screen
  const endNavRef = useRef(false);
  const goEnd = useCallback(() => {
    if (endNavRef.current) return;
    endNavRef.current = true;
    nav.replace('LiveClassEnd', { classId });
  }, [nav, classId]);

  useEffect(() => {
    if (!plannedDone || !canAct) return;
    (async () => {
      const prev = prevMinuteRef.current;
      if (!sentForMinute.current.has(prev)) {
        const roundNo   = minutePlan[prev] ?? currentRoundNo;
        const totalLast = (rounds[roundNo] ?? []).length;
        const completed = Math.max(0, Math.min(localIdx, totalLast));
        await mark(false, prev, completed, totalLast, 60);
      }
      goEnd();
    })();
  }, [plannedDone, canAct, goEnd, localIdx, currentRoundNo, minutePlan, rounds, mark]);

  // if coach ends early, submit current minute as penalized (if not sent) then navigate
  const endHandledRef = useRef(false);
  useEffect(() => {
    if (!canAct) return;
    if (session?.status === 'ended' && !endHandledRef.current) {
      endHandledRef.current = true;
      (async () => {
        const m = minuteIdx;
        if (!sentForMinute.current.has(m)) {
          const total = totalInRound;
          const completed = Math.max(0, Math.min(localIdx, total));
          await mark(false, m, completed, total, 60);
        }
        goEnd();
      })();
    }
  }, [session?.status, canAct, minuteIdx, localIdx, totalInRound, mark, goEnd]);

  // within-minute navigation (no wrap)
  const go = async (dir: 1 | -1) => {
    if (!canAct || session?.status !== 'live' || plannedDone) return;
    setLocalIdx(idx => Math.max(0, Math.min(totalInRound, idx + (dir === 1 ? 1 : -1))));
  };

  // pause overlay animation
  const pausedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pausedAnim, { toValue: session?.status === 'paused' ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [session?.status]);
  const fadeOpacity = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const scaleIn     = pausedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  const current = totalInRound > 0 && localIdx < totalInRound ? currentRound[localIdx] : undefined;
  const next    = totalInRound > 0 && localIdx + 1 < totalInRound ? currentRound[localIdx + 1] : undefined;

  const elapsedClamped = Math.min(elapsed, totalMinutes * 60 || elapsed);

  const lbTop = lb.slice(0, 6);

  return (
    <View style={s.root}>
      <StatusBar hidden={true} />
      <SafeAreaView style={s.safeArea} edges={['left', 'right']}>

      {/* timer */}
      <View pointerEvents="none" style={s.topOverlay}>
        <Text style={s.timeTop}>{fmt(elapsedClamped)}</Text>
      </View>

      {/* centered content */}
      <View pointerEvents="box-none" style={s.centerOverlay}>
        {!ready ? (
          <>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={{ color: '#a5a5a5', marginTop: 10, fontWeight: '700' }}>Getting class ready…</Text>
          </>
        ) : (
          <>
            <Text style={s.stepCounter}>
              {totalMinutes > 0 ? (
                <>Round {String(Math.min(minuteIdx + 1, totalMinutes)).padStart(2,'0')} / {String(totalMinutes).padStart(2,'0')}</>
              ) : (
                <>Waiting for coach…</>
              )}
            </Text>

            <Text style={s.score}>
              {totalInRound > 0
                ? `${String(Math.min(localIdx, totalInRound)).padStart(2,'0')} / ${String(totalInRound).padStart(2,'0')} exercises`
                : 'No exercises yet'}
            </Text>

            {plannedDone ? (
              <>
                <Text style={s.current}>CLASS ENDED</Text>
                <Text style={s.nextLabel}>Great work — leaderboard updating…</Text>
              </>
            ) : finishedThisMinute ? (
              <>
                <Text style={s.current}>WAIT FOR NEXT ROUND</Text>
                <Text style={s.nextLabel}>Starts at {fmt((minuteIdx + 1) * 60)}</Text>
              </>
            ) : (
              <>
                <Text style={s.current}>{current?.name ?? '—'}</Text>
                <Text style={s.nextLabel}>Next: {next?.name ?? '—'}</Text>
              </>
            )}

            <View style={[s.lb, { zIndex: 50, elevation: 6 }]} pointerEvents="auto">
              <Text style={s.lbTitle}>Leaderboard</Text>

              {/* RX/SC filter */}
              <View style={{ flexDirection:'row', justifyContent:'center', gap:6, marginBottom:8 }}>
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

              {lbTop.map((r: any, i: number) => {
                const displayName =
                  (r.first_name || r.last_name)
                    ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                    : (r.name ?? `User ${r.user_id}`);
                return (
                  <View key={`${r.user_id}-${i}`} style={s.lbRow}>
                    <Text style={s.lbPos}>{i+1}</Text>
                    <Text style={s.lbUser}>
                      {displayName} <Text style={{ color:'#9aa' }}>({(r.scaling ?? 'RX')})</Text>
                    </Text>
                    <Text style={s.lbScore}>{fmt(Number(r.elapsed_seconds ?? 0))}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* press zones */}
      <View style={s.row}>
        <Pressable style={s.back} android_ripple={{color:'#000'}} onPress={() => go(-1)} disabled={!ready || session?.status !== 'live' || plannedDone || totalInRound===0} />
        <Pressable style={s.next} android_ripple={{color:'#0a0'}} onPress={() => go(1)} disabled={!ready || session?.status !== 'live' || plannedDone || totalInRound===0} />
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
});
