import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useMyProgress } from '../../hooks/useMyProgress';
import { useProgressActions } from '../../hooks/useProgressActions';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useIntervalLeaderboard } from '../../hooks/useIntervalLeaderboard';
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
  is_rest?: boolean;
};

export default function LiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params?.classId as number;
  const workoutId = params?.liveClassData?.class?.workoutId as number | undefined;
  const workoutTypeFromRoute = params?.liveClassData?.class?.workoutType as
    | 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA' | 'INTERVAL' | undefined;

  const session = useLiveSession(classId);
  const { progress, refresh: refreshProgress, setProgress } = useMyProgress(classId);
  const { advance, submitPartial } = useProgressActions(classId);
  const { rows: timeLb } = useLeaderboard(classId);           // FOR_TIME
  const { rows: intervalLb } = useIntervalLeaderboard(classId); // TABATA/INTERVAL

  // stopwatch
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
  const [fallbackType, setFallbackType] = useState<'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA'|'INTERVAL'>('FOR_TIME');

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

  const steps: Step[] = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const mode: 'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA'|'INTERVAL' =
    (session?.workout_type as any) ?? workoutTypeFromRoute ?? fallbackType;
  const status = session?.status ?? 'ready';

  const timeCap = session?.time_cap_seconds ?? 0;
  const inCap = timeCap === 0 ? true : elapsed <= timeCap;

  /* ================= FOR_TIME / AMRAP existing path ================= */

  const ftOrAmrap = mode === 'FOR_TIME' || mode === 'AMRAP';
  const stepCount = steps.length;
  const currentIdx = Math.max(0, Math.min(stepCount, progress.current_step ?? 0));
  const ft_next =
    stepCount === 0 ? undefined :
    mode === 'AMRAP' ? steps[(currentIdx + 1) % stepCount] : steps[currentIdx + 1];

  const logicallyFinishedFT = currentIdx >= stepCount;
  const finishedFT = mode === 'FOR_TIME'
    ? Boolean(progress.finished_at) || logicallyFinishedFT
    : false;

  // AMRAP completed-partial toggle
  const [submittedPartial, setSubmittedPartial] = useState(false);

  /* ================= INTERVAL/TABATA path (auto-timed) ================ */

  const intervalMode = mode === 'TABATA' || mode === 'INTERVAL';

  // durations per step (must be defined for interval workouts)
  const durations = useMemo(
    () => steps.map(s => Number(s.duration ?? 0)),
    [steps]
  );
  const cycleSeconds = useMemo(
    () => durations.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    [durations]
  );

  // compute which step should be active by time
  const intervalIdx = useMemo(() => {
    if (!intervalMode || !cycleSeconds) return 0;
    const t = timeCap ? Math.min(elapsed, timeCap) : elapsed;
    const mod = cycleSeconds ? (t % cycleSeconds) : t;

    let acc = 0;
    for (let i = 0; i < durations.length; i++) {
      const d = durations[i] || 0;
      if (mod < acc + d) return i;
      acc += d;
    }
    return Math.max(0, durations.length - 1);
  }, [intervalMode, elapsed, timeCap, durations, cycleSeconds]);

  const intervalTimeLeft = useMemo(() => {
    if (!intervalMode || !cycleSeconds) return 0;
    const t = timeCap ? Math.min(elapsed, timeCap) : elapsed;
    const mod = t % (cycleSeconds || 1);
    let acc = 0;
    for (let i = 0; i < durations.length; i++) {
      const d = durations[i] || 0;
      if (mod < acc + d) return Math.max(0, Math.floor(acc + d - mod));
      acc += d;
    }
    return 0;
  }, [intervalMode, elapsed, timeCap, durations, cycleSeconds]);

  // detect step boundary → prompt for reps if previous step was a WORK step
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptVal, setPromptVal] = useState('');
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const prevIdx = useRef<number>(-1);

  useEffect(() => {
    if (!intervalMode || status !== 'live' || !inCap || durations.length === 0) return;

    const cur = intervalIdx;
    const prev = prevIdx.current;

    // boundary crossed
    if (prev !== -1 && cur !== prev && !promptOpen) {
      const justEnded = prev;
      const endedStep = steps[justEnded];

      // only collect reps for WORK steps (not rest)
      const workLike = endedStep && !endedStep.is_rest;
      if (workLike) {
        setPendingIndex(justEnded);
        setPromptVal('');
        setPromptOpen(true);
      }
    }
    prevIdx.current = cur;
  }, [intervalMode, intervalIdx, status, inCap, durations.length, steps, promptOpen]);

  // After time cap or ended: if a prompt is still open we let them submit;
  // once submitted, show final leaderboard.

  /* ================= Render helpers ================= */

  const label = intervalMode ? (mode === 'TABATA' ? 'TABATA' : 'INTERVAL')
              : (mode === 'AMRAP' ? 'AMRAP' : 'For Time');

  const timerText = intervalMode
    ? fmtTime(Math.max(0, (session?.time_cap_seconds ?? 0) - elapsed))  // countdown class
    : (mode === 'AMRAP' ? fmtTime(Math.max(0, (session?.time_cap_seconds ?? 0) - elapsed))
                        : fmtTime(elapsed));                              // FT: stopwatch

  const LB = intervalMode ? intervalLb : timeLb;

  /* ================= Render ================= */

  if ((!session && steps.length === 0) || (!steps || steps.length === 0)) {
    return shell(<ActivityIndicator size="large" />);
  }

  // VIEW 1 — overview
  if (!session || status === 'ready') {
    return shell(
      <>
        <Text style={styles.heading}>{label}</Text>
        {!!session?.time_cap_seconds && (
          <Text style={styles.subtle}>Time cap: {fmtTime(session.time_cap_seconds)}</Text>
        )}
        <WorkoutCard steps={steps} />
        <MiniLB rows={LB} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // ended / capped
  const classEnded = status === 'ended';
  const cappedByTimer = !inCap;

  if (classEnded || cappedByTimer) {
    // FOR_TIME → partial if not finished; AMRAP → needs partial until submittedPartial
    if (ftOrAmrap) {
      const needsPartial = (mode === 'FOR_TIME' ? !finishedFT : !submittedPartial);
      return needsPartial
        ? shell(
            <CappedCard
              mode={mode as any}
              onSubmit={async n => {
                await submitPartial(n);
                if (mode === 'AMRAP') setSubmittedPartial(true);
                await refreshProgress();
              }}
              leaderboard={LB}
            />
          )
        : shell(<CompletedCard leaderboard={LB} />);
    }

    // INTERVAL/TABATA: just show final LB (we’ve been collecting per-interval reps)
    if (!promptOpen) {
      return shell(<CompletedCard leaderboard={LB} />);
    }
    // if a prompt is still open, show the prompt so the last interval can be recorded
  }

  // LIVE — FOR_TIME/AMRAP path
  if (status === 'live' && ftOrAmrap) {
    const nextLabel =
      stepCount === 0 ? '—' :
      mode === 'AMRAP' ? steps[(currentIdx + 1) % stepCount]?.name ?? '—'
                       : steps[currentIdx + 1]?.name ?? '—';

    const canGoNext = (mode === 'AMRAP' ? stepCount > 0 : currentIdx < stepCount) && inCap && !finishedFT;
    const canGoBack = (mode === 'AMRAP'
      ? (stepCount > 0 && (currentIdx > 0 || (progress.rounds_completed ?? 0) > 0))
      : currentIdx > 0) && inCap && !finishedFT;

    const current = steps[currentIdx];

    return shell(
      <>
        <Text style={styles.timer}>{timerText}</Text>
        {mode === 'AMRAP' ? (
          <Text style={styles.round}>Rounds: {progress.rounds_completed ?? 0}</Text>
        ) : (
          <Text style={styles.round}>Round {current?.round ?? 1}</Text>
        )}
        <Text style={styles.current}>{current?.name ?? '—'}</Text>
        <Text style={styles.next}>Next: {nextLabel}</Text>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, canGoBack ? styles.back : styles.disabled]}
            disabled={!canGoBack}
            onPress={async () => {
              if (!canGoBack) return;
              if (mode === 'AMRAP' && stepCount > 0) {
                setProgress(p => {
                  const cur = p.current_step ?? 0;
                  if (cur > 0) return { ...p, current_step: cur - 1 };
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
            }}
          >
            <Text style={[styles.navText, !canGoBack && styles.navTextDisabled]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, canGoNext ? styles.nextBtn : styles.disabled]}
            disabled={!canGoNext}
            onPress={async () => {
              if (!canGoNext) return;
              if (mode === 'AMRAP' && stepCount > 0) {
                setProgress(p => {
                  const cur = p.current_step ?? 0;
                  const next = (cur + 1) % stepCount;
                  const addRound = (cur + 1) >= stepCount ? 1 : 0;
                  return { ...p, current_step: next, rounds_completed: (p.rounds_completed ?? 0) + addRound };
                });
              } else {
                setProgress(p => ({ ...p, current_step: Math.min(stepCount, (p.current_step ?? 0) + 1) }));
              }
              try { await advance('next'); } finally { await refreshProgress(); }
            }}
          >
            <Text style={[styles.navTextDark, !canGoNext && styles.navTextDisabledDark]}>Next</Text>
          </TouchableOpacity>
        </View>

        <MiniLB rows={LB} />
      </>
    );
  }

  // LIVE — INTERVAL/TABATA path
  if (status === 'live' && intervalMode) {
    const cur = steps[intervalIdx];
    const next = steps[(intervalIdx + 1) % steps.length];

    return shell(
      <>
        <Text style={styles.timer}>{timerText}</Text>
        <Text style={styles.round}>
          Interval {intervalIdx + 1} / {steps.length} · {intervalTimeLeft}s left
        </Text>
        <Text style={styles.current}>{cur?.name ?? '—'}</Text>
        <Text style={styles.next}>Next: {next?.name ?? '—'}</Text>

        <MiniLB rows={LB} />

        {/* Prompt modal after each work interval */}
        <Modal visible={promptOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Enter reps for "{steps[pendingIndex ?? 0]?.name}"</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={promptVal}
                onChangeText={setPromptVal}
                placeholder="0"
                placeholderTextColor="#666"
                autoFocus
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={async () => {
                  const reps = Math.max(0, Number(promptVal) || 0);
                  const token = await getToken();
                  await axios.post(
                    `${config.BASE_URL}/live/${classId}/interval/score`,
                    { stepIndex: pendingIndex, reps },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  setPromptOpen(false);
                  setPendingIndex(null);
                  setPromptVal('');
                }}
              >
                <Text style={styles.submitText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#333', marginTop: 8 }]}
                onPress={() => {
                  // allow skipping (records nothing)
                  setPromptOpen(false);
                  setPendingIndex(null);
                  setPromptVal('');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return shell(<Text style={styles.subtle}>Loading…</Text>);
}

/* ------- UI helpers ------- */
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
          <Text style={styles.stepText}>
            {item.name}{item.is_rest ? ' (Rest)' : ''}
          </Text>
        )}
      />
    </View>
  );
}

function MiniLB({ rows }: { rows: any[] }) {
  return (
    <View style={styles.lbCard}>
      <Text style={styles.lbTitle}>Leaderboard</Text>
      {rows.slice(0, 6).map((r, i) => (
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
      <Text style={styles.heading}>Session Complete 🎉</Text>
      <MiniLB rows={leaderboard} />
    </>
  );
}

function CappedCard({
  onSubmit, leaderboard, mode,
}: {
  onSubmit: (n: number) => Promise<void>;
  leaderboard: any[];
  mode: 'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA'|'INTERVAL';
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
  current: { color: '#fff', fontSize: 32, textAlign: 'center', fontWeight: '800', marginTop: 10 },
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

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#1b1b1b', borderRadius: 12, padding: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
});
