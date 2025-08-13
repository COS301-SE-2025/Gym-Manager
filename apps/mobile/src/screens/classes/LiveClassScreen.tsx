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

  const session = useLiveSession(classId);
  const { progress, refresh: refreshProgress, setProgress } = useMyProgress(classId);
  const { advance, submitPartial } = useProgressActions(classId);
  const { rows: leaderboard } = useLeaderboard(classId);

  // stopwatch / countdown
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

  // fallback steps/type pre-start
  const [fallbackSteps, setFallbackSteps] = useState<Step[]>([]);
  const [fallbackType, setFallbackType] = useState<'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA'>('FOR_TIME');

  useEffect(() => {
    const fetchFallback = async () => {
      if (!workoutId || session) return;
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

  // derived
  const steps: Step[] = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const stepCount = steps.length;
  const mode: 'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA' =
    (session?.workout_type as any) ?? workoutTypeFromRoute ?? fallbackType;

  const status = session?.status ?? 'ready';
  const currentIdx = Math.max(0, Math.min(stepCount, progress.current_step ?? 0));

  // choose next label per mode (AMRAP wraps)
  const nextStep =
    stepCount === 0 ? undefined :
    mode === 'AMRAP' ? steps[(currentIdx + 1) % stepCount] : steps[currentIdx + 1];

  const cap = session?.time_cap_seconds ?? 0;
  const inCap = cap === 0 ? true : elapsed <= cap;

  // FOR_TIME can "finish"; AMRAP never finishes early
  const logicallyFinishedFT = currentIdx >= stepCount;
  const finished = mode === 'FOR_TIME'
    ? Boolean(progress.finished_at) || logicallyFinishedFT
    : false;

  const label = mode === 'AMRAP' ? 'AMRAP' : 'For Time';
  const timerText = mode === 'AMRAP'
    ? fmtTime(Math.max(0, (session?.time_cap_seconds ?? 0) - elapsed)) // countdown
    : fmtTime(elapsed);                                                // stopwatch

  // navigation gating
  const canGoNext = status === 'live' && inCap && !finished &&
    (mode === 'AMRAP' ? stepCount > 0 : currentIdx < stepCount);
  const canGoBack = status === 'live' && inCap && !finished &&
    (mode === 'AMRAP' ? (stepCount > 0 && (currentIdx > 0 || (progress.rounds_completed ?? 0) > 0))
                      : currentIdx > 0);

  // optimistic actions that WRAP for AMRAP
  const onNext = async () => {
    if (!canGoNext) return;
    if (mode === 'AMRAP' && stepCount > 0) {
      setProgress(p => {
        const cur = p.current_step ?? 0;
        const next = (cur + 1) % stepCount;
        const addRound = (cur + 1) >= stepCount ? 1 : 0;
        return {
          ...p,
          current_step: next,
          rounds_completed: (p.rounds_completed ?? 0) + addRound
        };
      });
    } else {
      setProgress(p => ({ ...p, current_step: Math.min(stepCount, (p.current_step ?? 0) + 1) }));
    }
    try { await advance('next'); } finally { await refreshProgress(); }
  };

  const onBack = async () => {
    if (!canGoBack) return;
    if (mode === 'AMRAP' && stepCount > 0) {
      setProgress(p => {
        const cur = p.current_step ?? 0;
        if (cur > 0) {
          return { ...p, current_step: cur - 1 };
        }
        // cur === 0
        const hasPrevRound = (p.rounds_completed ?? 0) > 0;
        return {
          ...p,
          current_step: hasPrevRound ? stepCount - 1 : 0,
          rounds_completed: hasPrevRound ? Math.max(0, (p.rounds_completed ?? 0) - 1) : (p.rounds_completed ?? 0)
        };
      });
    } else {
      setProgress(p => ({ ...p, current_step: Math.max(0, (p.current_step ?? 0) - 1), finished_at: null }));
    }
    try { await advance('prev'); } finally { await refreshProgress(); }
  };

  // ===== FIX: after submitting partial reps, show Completed view =====
  const [submittedPartial, setSubmittedPartial] = useState(false);

  // ─────────── render ───────────
  if (!session && steps.length === 0) {
    return shell(<ActivityIndicator size="large" />);
  }

  // VIEW 1 — overview
  if (!session || status === 'ready') {
    return shell(
      <>
        <Text style={styles.heading}>{label}</Text>
        {!!session?.time_cap_seconds && (
          <Text style={styles.subtle}>
            Time cap: {fmtTime(session.time_cap_seconds)}
          </Text>
        )}
        <WorkoutCard steps={steps} />
        <MiniLB rows={leaderboard} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // stop/cap states
  const classEnded = status === 'ended';
  const cappedByTimer = mode === 'AMRAP' ? !inCap : false;

  if (classEnded || cappedByTimer) {
    // FOR_TIME needs partial only if not finished.
    // AMRAP needs partial until user has submitted; then show Completed.
    const needsPartial = (mode === 'FOR_TIME' ? !finished : !submittedPartial);

    return needsPartial
      ? shell(
          <CappedCard
            mode={mode}
            onSubmit={async n => {
              await submitPartial(n);   // writes dnf_partial_reps
              setSubmittedPartial(true); // ➜ switch to Completed view
              await refreshProgress();
            }}
            leaderboard={leaderboard}
          />
        )
      : shell(<CompletedCard leaderboard={leaderboard} />);
  }

  // LIVE
  const current = steps[currentIdx];
  if (status === 'live') {
    if (finished) return shell(<CompletedCard leaderboard={leaderboard} />);
    return shell(
      <>
        <Text style={styles.timer}>{timerText}</Text>
        {mode === 'AMRAP' ? (
          <Text style={styles.round}>Rounds: {progress.rounds_completed ?? 0}</Text>
        ) : (
          <Text style={styles.round}>Round {current?.round ?? 1}</Text>
        )}
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

/* ------- helpers ------- */
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
          <Text style={styles.lbScore}>{r.display_score}</Text>
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
  const [submitting, setSubmitting] = useState(false);
  const n = useMemo(() => Number(val) || 0, [val]);

  const subtitle =
    mode === 'AMRAP'
      ? 'Enter extra reps completed on your last exercise'
      : 'Enter reps completed on your last exercise';

  return (
    <>
      <Text style={styles.heading}>Time’s up</Text>
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
          editable={!submitting}
        />
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={async () => {
          if (submitting) return;
          setSubmitting(true);
          try { await onSubmit(n); } finally { setSubmitting(false); }
        }}
      >
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
