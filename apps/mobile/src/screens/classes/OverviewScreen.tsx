// apps/mobile/src/screens/classes/OverviewScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import apiClient from '../../utils/apiClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

type R = RouteProp<AuthStackParamList, 'Overview'>;

type FlatStep = {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
  quantityType?: 'reps' | 'duration';
};

async function setMyScaling(classId: number, scaling: 'RX' | 'SC') {
  await apiClient.post(`/live/${classId}/scaling`, { scaling });
}

async function getMyScaling(classId: number): Promise<'RX'|'SC'> {
  try {
    const { data } = await apiClient.get(`/live/${classId}/scaling`);
    const s = (data?.scaling ?? 'RX').toUpperCase();
    return s === 'SC' ? 'SC' : 'RX';
  } catch { return 'RX'; }
}

function fmtExerciseLabel(step: FlatStep) {
  // The database already stores the exercise names with quantity info (e.g., "12x Situps", "Squats 10s")
  // so we just return the name directly without additional formatting
  return step.name;
}

function fmtHMS(sec: number) {
  const t = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function OverviewScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<R>();
  const classId = params.classId as number;

  // from navigation prefetch (used only as fallback hints)
  const liveClassData: any = (params as any).liveClassData ?? {};
  const preWorkoutId: number | undefined = liveClassData?.class?.workoutId;
  const preWorkoutName: string | undefined = liveClassData?.class?.workoutName;
  const preDurationSeconds: number =
    (Number(liveClassData?.class?.durationMinutes ?? 0) * 60) || 0;
  const preType: string | undefined = liveClassData?.class?.workoutType;

  const session = useSession(classId);

  const [myScaling, setScaling] = useState<'RX'|'SC'>('RX');
  useEffect(() => { getMyScaling(classId).then(setScaling).catch(()=>{}); }, [classId]);

  const chooseScaling = async (val: 'RX' | 'SC') => {
    setScaling(val);
    try { await setMyScaling(classId, val); } catch {}
  };

  // ---- ALWAYS load builder steps for accurate round/subround & quantity type ----
  const [builderSteps, setBuilderSteps] = useState<FlatStep[]>([]);
  const [builderMeta, setBuilderMeta] = useState<{ number_of_rounds?: number; number_of_subrounds?: number; duration_seconds?: number; time_limit?: number; emom_repeats?: number[]; tabata_total_seconds?: number } | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    if (!preWorkoutId) return;
    let stop = false;
    (async () => {
      try {
        setFallbackLoading(true);
        const { data } = await apiClient.get(`/workout/${preWorkoutId}/steps`);
        if (stop) return;
        const steps: FlatStep[] = Array.isArray(data?.steps) ? data.steps : [];
        setBuilderSteps(steps.map((s,i) => ({
          index: typeof s.index === 'number' ? s.index : i,
          name: s.name,
          reps: typeof s.reps === 'number' ? s.reps : (s as any)?.quantity,
          duration: typeof s.duration === 'number' ? s.duration : undefined,
          round: Number(s.round ?? (s as any).roundNumber ?? 1),
          subround: Number(s.subround ?? (s as any).subroundNumber ?? 1),
          quantityType: (s as any)?.quantityType ?? (typeof s.reps === 'number' ? 'reps' : (typeof s.duration === 'number' ? 'duration' : undefined))
        })));
        const meta = (data?.metadata && typeof data.metadata === 'object') ? data.metadata : null;
        setBuilderMeta(meta);
      } catch { /* noop */ }
      finally { setFallbackLoading(false); }
    })();
    return () => { stop = true; };
  }, [preWorkoutId]);

  const displaySteps: FlatStep[] = useMemo(() => {
    if (builderSteps.length > 0) return builderSteps;
    const ssteps = (Array.isArray(session?.steps) ? session!.steps! : []) as any[];
    return ssteps.map((s, i) => ({
      index: i,
      name: s?.name ?? `Step ${i+1}`,
      reps: typeof s?.reps === 'number' ? s.reps : undefined,
      duration: typeof s?.duration === 'number' ? s.duration : undefined,
      round: Number(s?.round ?? 1),
      subround: Number(s?.subround ?? 1),
      quantityType: s?.quantityType
    })) as FlatStep[];
  }, [builderSteps, session?.steps]);

  const workoutType: string =
    (session?.workout_type as string) ||
    (preType as string) ||
    'FOR_TIME';


  const capSeconds: number = useMemo(() => {
    const t = (workoutType || '').toUpperCase();

    // EMOM: total repeats × 60
    if (t === 'EMOM' && builderMeta?.emom_repeats && Array.isArray(builderMeta.emom_repeats)) {
      const totalRepeats = builderMeta.emom_repeats.reduce((sum, n) => sum + (Number(n) || 0), 0);
      return totalRepeats * 60;
    }

    // TABATA / INTERVAL: sum durations of *every* step
    if (t === 'TABATA' || t === 'INTERVAL') {
      const stepsToSum = (builderSteps.length > 0 ? builderSteps : (Array.isArray(session?.steps) ? session!.steps! : [])) as Array<{ duration?: number }>;
      const sum = stepsToSum.reduce((acc, s) => acc + (Number(s?.duration) || 0), 0);
      if (sum > 0) return sum;
      // fallback only if builder lacks per-step durations
      return Number(builderMeta?.duration_seconds || 0) ||
             Number(session?.time_cap_seconds || 0) ||
             preDurationSeconds;
    }

    // FOR_TIME / AMRAP etc.
    return Number(builderMeta?.time_limit ?? 0) * 60 ||
           Number(builderMeta?.duration_seconds ?? 0) ||
           Number(session?.time_cap_seconds ?? 0) ||
           preDurationSeconds;
  }, [workoutType, builderMeta, builderSteps, session?.steps, session?.time_cap_seconds, preDurationSeconds]);


  const workoutName: string =
    (preWorkoutName as string) ||
    'Workout';

  // route when class goes live / ends
  useEffect(() => {
    if (!session?.status) return;
    const t = (workoutType || '').toUpperCase();

    if (session.status === 'live') {
      if (t === 'FOR_TIME') nav.replace('ForTimeLive', { classId });
      if (t === 'AMRAP')   nav.replace('AmrapLive',   { classId });
      if (t == 'TABATA')   nav.replace('IntervalLive', { classId });
      if (t === 'EMOM')    nav.replace('EmomLive', { classId });
    }
    if (session.status === 'ended') {
      nav.replace('LiveClassEnd', { classId });
    }
  }, [session?.status, workoutType, nav, classId]);

  // group by round/subround for UI
  const grouped = useMemo(() => {
    const byRound: Record<number, Record<number, FlatStep[]>> = {};
    for (const s of displaySteps) {
      byRound[s.round] = byRound[s.round] || {};
      byRound[s.round][s.subround] = byRound[s.round][s.subround] || [];
      byRound[s.round][s.subround].push(s);
    }
    return byRound;
  }, [displaySteps]);

  const declaredRounds = Number(builderMeta?.number_of_rounds ?? 0);
  const inferredRounds = Object.keys(grouped).length;
  const roundCount = declaredRounds > 0 ? declaredRounds : inferredRounds;

  const goBackSmart = () => {
    try {
      if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
        nav.goBack();
        return;
      }
    } catch {}
    try { nav.navigate('Home'); return; } catch {}
    try { nav.navigate('Root'); return; } catch {}
    nav.popToTop();
  };

  return (
    <SafeAreaProvider>
    <SafeAreaView style={s.root} edges={['top', 'left', 'right'] as const}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Back button */}
        <TouchableOpacity style={s.backBtn} onPress={goBackSmart} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color="#d8ff3e" />
        </TouchableOpacity>

        <View style={s.headerBadge}>
          <Text style={s.headerText}>LIVE CLASS</Text>
          <Text style={s.headerRight}>{workoutName}</Text>
        </View>

        <Text style={s.timeLabel}>Time Cap:</Text>
        <Text style={s.timeBig}>{fmtHMS(capSeconds)}</Text>

        <Text style={s.sectionTitle}>Workout of the Day:</Text>

        <View style={s.typeRow}>
          <TypePill label={(workoutType || 'FOR_TIME').replace('_', ' ')} active />
          <TypePill label="Extreme" />
          <Text style={s.roundCount}>
            {roundCount > 0 ? `${roundCount} ROUNDS` : '—'}
          </Text>
        </View>

        <View style={[s.typeRow, { marginTop: 6 }]}>
          <Text style={{ color:'#aaa', marginRight:8, fontWeight:'800' }}>Scaling:</Text>
          <TouchableOpacity
            onPress={() => chooseScaling('RX')}
            style={[s.pill, myScaling === 'RX' && s.pillActive]}
          >
            <Text style={[s.pillText, myScaling === 'RX' && s.pillTextActive]}>RX</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => chooseScaling('SC')}
            style={[s.pill, myScaling === 'SC' && s.pillActive]}
          >
            <Text style={[s.pillText, myScaling === 'SC' && s.pillTextActive]}>Scaled</Text>
          </TouchableOpacity>
        </View>

        {(displaySteps.length === 0 && fallbackLoading) ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>
              Loading workout…
            </Text>
          </View>
        ) : (
          Object.keys(grouped).map((rKey) => {
            const r = Number(rKey);
            const sub = grouped[r];
            return (
              <View key={`round-${r}`} style={s.roundBox}>
                {Object.keys(sub).map((srKey) => {
                  const sr = Number(srKey);
                  const exs = sub[sr];
                  return (
                     <View key={`sub-${r}-${sr}`} style={s.subroundBox}>
                       {workoutType.toUpperCase() === 'EMOM' && builderMeta?.emom_repeats && Array.isArray(builderMeta.emom_repeats) && builderMeta.emom_repeats[sr - 1] && (
                         <View style={s.multiplierContainer}>
                           <Text style={s.multiplierText}>×{builderMeta.emom_repeats[sr - 1]}</Text>
                         </View>
                       )}
                       {exs.map((e) => (
                         <Text key={`step-${e.index}`} style={s.exerciseText}>
                           {fmtExerciseLabel(e)}
                         </Text>
                       ))}
                     </View>
                  );
                })}
              </View>
            );
          })
        )}

        {session?.status === 'paused' ? (
          <View style={s.paused}>
            <Text style={s.pausedText}>PAUSED</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TypePill({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[s.pill, active && s.pillActive]}>
      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },
  scroll: { padding: 16, paddingBottom: 40, paddingTop: 8 },

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    padding: 4,
  },

  headerBadge: {
    backgroundColor: '#d8ff3e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerText: { fontWeight: '900', color: '#111', letterSpacing: 0.5 },
  headerRight: { color: '#111', opacity: 0.8 },

  timeLabel: { color: '#aaa', marginTop: 18, marginBottom: 6 },
  timeBig: { color: '#bfbfbf', fontSize: 48, fontWeight: '900', letterSpacing: 2 },

  sectionTitle: { color: '#bbb', marginTop: 22, marginBottom: 10, fontWeight: '800' },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#2a2a2a'
  },
  pillActive: { backgroundColor: '#2e3500', borderColor: '#d8ff3e' },
  pillText: { color: '#9aa', fontWeight: '700', fontSize: 12 },
  pillTextActive: { color: '#d8ff3e' },
  roundCount: { marginLeft: 'auto', color: '#aaa', fontWeight: '800' },

  roundBox: { backgroundColor: '#161616', borderRadius: 16, padding: 12, marginTop: 12 },
  subroundBox: {
    borderWidth: 1.5, borderColor: '#EAE2C6', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: 'transparent'
  },
  multiplierContainer: {
    backgroundColor: '#2e3500',
    borderWidth: 1,
    borderColor: '#d8ff3e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  multiplierText: {
    color: '#d8ff3e',
    fontWeight: '900',
    fontSize: 12
  },
  exerciseText: { color: '#ddd', paddingVertical: 4 },

  paused: { marginTop: 14, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10, alignItems:'center' },
  pausedText: { color: '#fff', fontWeight: '800' },
});