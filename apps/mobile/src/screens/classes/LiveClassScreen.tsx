import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, ActivityIndicator, FlatList
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useMyProgress } from '../../hooks/useMyProgress';
import { useProgressActions } from '../../hooks/useProgressActions';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import axios from 'axios';
import config from '../../config';
import { getToken } from '../../utils/authStorage';

type R = RouteProp<AuthStackParamList, 'LiveClass'>;

type Step = {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
};

export default function LiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params?.classId as number;
  const workoutId = params?.liveClassData?.class?.workoutId as number | undefined;
  const workoutTypeFromRoute = params?.liveClassData?.class?.workoutType as
    | 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA' | undefined;

  // Supabase session row (realtime)
  const session = useLiveSession(classId);

  // My progress (realtime)
  const { progress, refresh: refreshProgress, setProgress } = useMyProgress(classId);

  // Actions (API)
  const { advance, submitPartial } = useProgressActions(classId);

  // Leaderboard (polling)
  const { rows: leaderboard } = useLeaderboard(classId);

  // Local timers
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session?.started_at) return;
    const startMs = new Date(session.started_at).getTime();
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000))),
      500
    );
    return () => clearInterval(id);
  }, [session?.started_at]);

  // Pre-start: fallback steps + type (from API) so you can render View 1
  const [fallbackSteps, setFallbackSteps] = useState<Step[]>([]);
  const [fallbackType, setFallbackType] = useState<'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA'>('FOR_TIME');

  useEffect(() => {
    const fetchFallback = async () => {
      if (!workoutId || session) return; // if live session exists, it already has steps/type
      const token = await getToken();
      const { data } = await axios.get(
        `${config.BASE_URL}/workout/${workoutId}/steps`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFallbackSteps((data?.steps ?? []) as Step[]);
      if (data?.workoutType) setFallbackType(data.workoutType);
    };
    fetchFallback();
  }, [session, workoutId]);

  // Derived data
  const steps: Step[] = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const stepCount = steps.length;

  // Workout mode (FOR_TIME / AMRAP) from session, else route param, else fallback
  const mode: 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA' =
    (session?.workout_type as any) ?? workoutTypeFromRoute ?? fallbackType;

  const status = session?.status ?? 'ready';
  const currentIdx = Math.max(0, Math.min(stepCount, progress.current_step ?? 0));
  const current = steps[currentIdx];
  const nextStep = steps[currentIdx + 1];

  const cap = session?.time_cap_seconds ?? 0;
  const inCap = cap === 0 ? true : elapsed <= cap;

  // FOR_TIME can finish early (when user reaches last step),
  // AMRAP never finishes early (only at cap/stop); we still keep your finished_at handling for FOR_TIME.
  const logicallyFinishedFT = currentIdx >= stepCount;
  const finished =
    mode === 'FOR_TIME'
      ? Boolean(progress.finished_at) || logicallyFinishedFT
      : false;

  // UI labels & timer presentation
  const label = mode === 'AMRAP' ? 'AMRAP' : 'For Time';
  const timerText =
    mode === 'AMRAP'
      ? fmtTime(Math.max(0, (session?.time_cap_seconds ?? 0) - elapsed)) // countdown
      : fmtTime(elapsed);                                                // stopwatch

  // Buttons
  const canGoBack = status === 'live' && inCap && !finished && currentIdx > 0;
  const canGoNext = status === 'live' && inCap && !finished && currentIdx < stepCount;

  // Handlers (optimistic update + confirm)
  const onBack = async () => {
    if (!canGoBack) return;
    setProgress(p => ({ ...p, current_step: Math.max(0, (p.current_step ?? 0) - 1), finished_at: null }));
    try { await advance('prev'); } finally { refreshProgress(); }
  };

  const onNext = async () => {
    if (!canGoNext) return;
    setProgress(p => ({ ...p, current_step: Math.min(stepCount, (p.current_step ?? 0) + 1) }));
    try { await advance('next'); } finally { refreshProgress(); }
  };

  // ────────────────────── RENDER STATES ──────────────────────
  if (!session && steps.length === 0) {
    return shell(<ActivityIndicator size="large" />);
  }

  // VIEW 1 — overview (pre-start)
  if (!session || status === 'ready') {
    return shell(
      <>
        <Text style={styles.heading}>{label}</Text>
        {mode === 'AMRAP' ? (
          <Text style={styles.subtle}>
            Time cap: {fmtTime(session?.time_cap_seconds ?? 0)}
          </Text>
        ) : session?.time_cap_seconds ? (
          <Text style={styles.subtle}>Time cap: {fmtTime(session.time_cap_seconds)}</Text>
        ) : null}
        <WorkoutCard steps={steps} />
        <MiniLB rows={leaderboard} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // Coach stopped OR countdown expired → collect partials if needed, then show LB
  const classEnded = status === 'ended';
  const cappedByTimer = !inCap && mode !== 'FOR_TIME'; // AMRAP cap (For-Time uses finish/time-cap flow below)

  if (classEnded || cappedByTimer) {
    // For-Time: if user finished before stop → show completed; else ask partial reps.
    // AMRAP: always ask partial reps at cap/stop (users never "finish" early).
    const needsPartial = (mode === 'FOR_TIME' ? !finished : true);

    return needsPartial
      ? shell(
          <CappedCard
            mode={mode}
            onSubmit={async n => { await submitPartial(n); await refreshProgress(); }}
            leaderboard={leaderboard}
          />
        )
      : shell(<CompletedCard leaderboard={leaderboard} />);
  }

  // LIVE view (tap through exercises)
  if (status === 'live') {
    // For-Time: if finished early, show completed waiting card
    if (finished) return shell(<CompletedCard leaderboard={leaderboard} />);

    return shell(
      <>
        <Text style={styles.timer}>{timerText}</Text>
        <Text style={styles.round}>Round {current?.round ?? 1}</Text>
        <Text style={styles.current}>{current?.name ?? '—'}</Text>
        <Text style={styles.next}>Next: {nextStep?.name ?? '—'}</Text>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, canGoBack ? styles.back : styles.disabled]}
            disabled={!canGoBack}
            onPress={onBack}
          >
            <Text style={[styles.navText, !canGoBack && styles.navTextDisabled]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, canGoNext ? styles.nextBtn : styles.disabled]}
            disabled={!canGoNext}
            onPress={onNext}
          >
            <Text style={[styles.navTextDark, !canGoNext && styles.navTextDisabledDark]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        <MiniLB rows={leaderboard} />
      </>
    );
  }

  return shell(<Text style={styles.subtle}>Loading…</Text>);
}

/* ------- small UI helpers ------- */
function shell(children: React.ReactNode) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.pad}>{children}</View>
    </SafeAreaView>
  );
}

function fmtTime(total: number) {
  const t = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0
    ? [h, m, s].map(n => String(n).padStart(2,'0')).join(':')
    : [m, s].map(n => String(n).padStart(2,'0')).join(':');
}

function WorkoutCard({ steps }: { steps: Step[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Workout of the Day</Text>
      <FlatList
        data={steps}
        keyExtractor={(s) => String(s.index)}
        renderItem={({ item }) => (
          <Text style={styles.stepText}>R{item.round} · {item.name}</Text>
        )}
      />
    </View>
  );
}

function MiniLB({ rows }: { rows: any[] }) {
  return (
    <View style={styles.lbCard}>
      <Text style={styles.lbTitle}>Leaderboard</Text>
      {rows.slice(0, 5).map((r, i) => (
        <View key={`${r.user_id}-${i}`} style={styles.lbRow}>
          <Text style={styles.lbPos}>{i + 1}</Text>
          <Text style={styles.lbUser}>User {r.user_id}</Text>
          <Text style={styles.lbScore}>
            {r.finished ? r.display_score : r.display_score}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CompletedCard({ leaderboard }: { leaderboard: any[] }) {
  return (
    <>
      <Text style={styles.heading}>You’re done! 🎉</Text>
      <Text style={styles.subtle}>Waiting for others / coach results…</Text>
      <MiniLB rows={leaderboard} />
    </>
  );
}

function CappedCard({
  onSubmit, leaderboard, mode,
}: {
  onSubmit: (n: number) => Promise<void>;
  leaderboard: any[];
  mode: 'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA';
}) {
  const [val, setVal] = useState('');
  const n = useMemo(() => Number(val) || 0, [val]);

  // Copy explains what we’re asking for in each mode
  const title = mode === 'AMRAP' ? 'Time’s up' : 'Time’s up';
  const subtitle =
    mode === 'AMRAP'
      ? 'Enter extra reps completed on your last exercise'
      : 'Enter reps completed on your last exercise';

  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtle}>{subtitle}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Reps</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={val}
          onChangeText={setVal}
          placeholder="0"
          placeholderTextColor="#666"
        />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={() => onSubmit(n)}>
        <Text style={styles.submitText}>Submit Score</Text>
      </TouchableOpacity>
      <MiniLB rows={leaderboard} />
    </>
  );
}

/* ------- styles ------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  pad: { flex: 1, padding: 20 },

  heading: { color: '#d8ff3e', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtle: { color: '#aaa', marginBottom: 16 },

  card: { backgroundColor: '#222', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  stepText: { color: '#ddd', paddingVertical: 6 },
  hint: { color: '#888', marginTop: 10 },

  timer: { color: '#888', fontSize: 24, textAlign: 'center' },
  round: { color: '#777', textAlign: 'center', marginTop: 8 },
  current: { color: '#fff', fontSize: 36, textAlign: 'center', fontWeight: '800', marginTop: 8 },
  next: { color: '#888', textAlign: 'center', marginTop: 6 },

  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  navBtn: { flex: 1, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  back: { backgroundColor: '#333' },
  nextBtn: { backgroundColor: '#d8ff3e' },
  disabled: { backgroundColor: '#222', opacity: 0.5 },

  navText: { color: '#ddd', fontWeight: '800' },
  navTextDark: { color: '#111', fontWeight: '800' },
  navTextDisabled: { color: '#666' },
  navTextDisabledDark: { color: '#777' },

  lbCard: { backgroundColor: '#222', borderRadius: 12, padding: 12, marginTop: 20 },
  lbTitle: { color: '#fff', fontWeight: '700', marginBottom: 6 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  lbPos: { width: 20, color: '#d8ff3e', fontWeight: '800' },
  lbUser: { flex: 1, color: '#ddd' },
  lbScore: { color: '#fff', fontWeight: '700' },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  inputLabel: { color: '#fff', width: 70 },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12 },
  submitBtn: { backgroundColor: '#d8ff3e', paddingVertical: 16, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#111', fontWeight: '800' },
});
