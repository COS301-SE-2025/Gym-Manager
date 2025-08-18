import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, ActivityIndicator, FlatList, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
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
  target_reps?: number; // for EMOM steps (optional)
};

async function submitIntervalRepsApi(classId: number, stepIndex: number, reps: number) {
  const token = await getToken();
  await axios.post(
    `${config.BASE_URL}/live/${classId}/interval/score`,
    { stepIndex, reps },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export default function LiveClassScreen() {
  const isFocused = useIsFocused();
  const { params } = useRoute<R>();
  const classId = params?.classId as number;
  const workoutId = params?.liveClassData?.class?.workoutId as number | undefined;
  const initialType = params?.liveClassData?.class?.workoutType;
  const [workoutType, setWorkoutType] = useState<string | undefined>(
    initialType ? initialType.toUpperCase() : undefined
  );

  const session = useLiveSession(classId, isFocused);
  const { progress, refresh: refreshProgress, setProgress } = useMyProgress(classId, isFocused);
  const { advance, submitPartial } = useProgressActions(classId);
  const { rows: leaderboard } = useLeaderboard(classId, isFocused);

  // Shared elapsed timer for live session
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!session?.started_at) return;
    const startMs = new Date(session.started_at).getTime();
    const timerId = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000))),
      500
    );
    return () => clearInterval(timerId);
  }, [session?.started_at]);

  // Pre-start: fetch workout steps and type if session not initialized yet
  const [fallbackSteps, setFallbackSteps] = useState<Step[]>([]);
  useEffect(() => {
    const fetchFallback = async () => {
      if (!workoutId || session) return;
      const token = await getToken();
      const { data } = await axios.get(`${config.BASE_URL}/workout/${workoutId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.steps) setFallbackSteps(data.steps as Step[]);
      if (data?.workoutType) setWorkoutType(String(data.workoutType).toUpperCase());
    };
    fetchFallback();
  }, [session, workoutId]);

  const steps = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const stepCount = steps.length;

  // Determine workout type and if it's an interval-based workout
  const normalizedType = workoutType?.toUpperCase();
  const inferredInterval = steps.length > 0 && steps.every(s => typeof s.duration === 'number' && !s.reps);
  const isInterval = normalizedType === 'INTERVAL' || normalizedType === 'TABATA' || normalizedType === 'EMOM' || inferredInterval;

  // Time cap and session status
  const cap = session?.time_cap_seconds ?? 0;
  const inCap = cap === 0 ? true : elapsed <= cap;
  const status = session?.status ?? 'ready';

  // Current step index and step info for FOR TIME / AMRAP logic
  const currentIdx = Math.max(0, Math.min(stepCount, progress.current_step ?? 0));
  const current = steps[currentIdx];
  const nextStep = steps[currentIdx + 1];

  const logicallyFinished = currentIdx >= stepCount;
  const finished = Boolean(progress.finished_at) || logicallyFinished;

  // Navigation availability (FOR TIME / AMRAP only; interval uses time-based progression)
  const canGoBack = !finished && status === 'live' && inCap && (
    currentIdx > 0 || (normalizedType === 'AMRAP' && (progress.rounds_completed ?? 0) > 0 && currentIdx === 0)
  );
  const canGoNext = !finished && status === 'live' && inCap && (
    normalizedType === 'AMRAP' || currentIdx < stepCount
  );

  const onBack = async () => {
    if (!canGoBack) return;
    // For AMRAP: if at start of a round and have completed rounds, go to end of previous round
    if (normalizedType === 'AMRAP' && currentIdx === 0 && (progress.rounds_completed ?? 0) > 0) {
      setProgress(p => ({
        ...p,
        current_step: stepCount - 1,
        finished_at: null,
        dnf_partial_reps: 0,
        rounds_completed: (p.rounds_completed ?? 0) - 1
      }));
    } else {
      setProgress(p => ({
        ...p,
        current_step: Math.max(0, (p.current_step ?? 0) - 1),
        finished_at: null,
        dnf_partial_reps: 0
      }));
    }
    try {
      await advance('prev');
    } finally {
      refreshProgress();
    }
  };

  const onNext = async () => {
    if (!canGoNext) return;
    // For AMRAP: wrap to next round if at last step of current round
    if (normalizedType === 'AMRAP' && currentIdx >= stepCount - 1) {
      setProgress(p => ({
        ...p,
        current_step: 0,
        finished_at: null,
        dnf_partial_reps: 0,
        rounds_completed: (p.rounds_completed ?? 0) + 1
      }));
    } else {
      setProgress(p => ({
        ...p,
        current_step: Math.min(stepCount, (p.current_step ?? 0) + 1),
        finished_at: null,
        // dnf_partial_reps stays 0 during normal progression
      }));
    }
    try {
      await advance('next');
    } finally {
      refreshProgress();
    }
  };

  // Interval/Tabata/EMOM time-based step index and timer within step
  const stepDurations = useMemo(() => steps.map(s => Math.max(0, Number(s.duration ?? 0))), [steps]);
  const intervalIdxInfo = useMemo(() => {
    if (!isInterval || steps.length === 0 || !session?.started_at) {
      return { idx: 0, within: 0, remain: 0 };
    }
    const ceiling = cap > 0 ? Math.min(elapsed, cap) : elapsed;
    let acc = 0;
    let idx = 0;
    while (idx < stepDurations.length && ceiling >= acc + stepDurations[idx]) {
      acc += stepDurations[idx];
      idx++;
    }
    const within = Math.max(0, ceiling - acc);
    const remain = Math.max(0, (stepDurations[idx] ?? 0) - within);
    return { idx: Math.min(idx, stepDurations.length - 1), within, remain };
  }, [isInterval, steps.length, session?.started_at, elapsed, cap, stepDurations]);

  const intervalIdx = intervalIdxInfo.idx;
  const intervalCurrent = steps[intervalIdx];
  const intervalNext = steps[intervalIdx + 1];

  const endOfIntervalTime = isInterval && (status === 'ended' || !inCap);

  function isRestStep(step?: Step) {
    const n = (step?.name ?? '').toLowerCase();
    return n.includes('rest');
  }

  // Prompt for reps when a timed work interval ends
  const prevIdxRef = useRef<number>(intervalIdx);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptForStep, setPromptForStep] = useState<number | null>(null);
  const [promptValue, setPromptValue] = useState<string>('');
  const [scoredSteps, setScoredSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isInterval || status !== 'live') return;
    const prev = prevIdxRef.current;
    const nowIdx = intervalIdx;
    if (nowIdx !== prev) {
      const justEndedIdx = prev;
      const justEnded = steps[justEndedIdx];
      if (justEnded && !isRestStep(justEnded) && !scoredSteps.has(justEndedIdx)) {
        // Work interval just ended and not yet scored: prompt for reps
        setPromptForStep(justEndedIdx);
        setPromptValue('');
        setPromptOpen(true);
      }
      prevIdxRef.current = nowIdx;
    }
  }, [isInterval, status, intervalIdx, steps, scoredSteps]);

  // If class ends or time cap hits during a work interval, prompt once for that interval's reps
  const endPromptedRef = useRef(false);
  useEffect(() => {
    if (!isInterval) return;
    if (!endOfIntervalTime) return;
    if (endPromptedRef.current) return;
    const step = intervalCurrent;
    if (step && !isRestStep(step) && !scoredSteps.has(intervalIdx) && !promptOpen) {
      setPromptForStep(intervalIdx);
      setPromptValue('');
      setPromptOpen(true);
      endPromptedRef.current = true;
    }
  }, [isInterval, endOfIntervalTime, intervalCurrent, intervalIdx, scoredSteps, promptOpen]);

  const submitIntervalReps = async () => {
    const n = Math.max(0, Number(promptValue) || 0);
    if (promptForStep == null) return;
    try {
      await submitIntervalRepsApi(classId, promptForStep, n);
      setScoredSteps(s => new Set(s).add(promptForStep));
      setPromptOpen(false);
      setPromptForStep(null);
      setPromptValue('');
      // If this was the final interval and session just ended, the results view will appear below
    } catch {
      // If an error occurs (e.g., network issue), keep the modal open for retry
    }
  };

  // Render branches for different states
  if (!session && steps.length === 0) {
    // Still loading initial data
    return shell(<ActivityIndicator size="large" />);
  }

  // BEFORE START: waiting for coach to start the class (overview)
  if (!session || status === 'ready') {
    const title = isInterval
      ? (normalizedType === 'EMOM' ? 'EMOM' : 'Interval / Tabata')
      : (normalizedType === 'AMRAP' ? 'AMRAP' : 'For Time');
    return shell(
      <>
        <Text style={styles.heading}>{title}</Text>
        {session?.time_cap_seconds ? (
          <Text style={styles.subtle}>Time cap: {fmtTime(session.time_cap_seconds)}</Text>
        ) : null}
        <WorkoutCard steps={steps} />
        <MiniLB rows={leaderboard} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // INTERVAL/TABATA/EMOM MODE
  if (isInterval) {
    // AFTER END: If time ended or coach stopped the class
    if (endOfIntervalTime) {
      return shell(
        <>
          {!promptOpen ? (
            <>
              <Text style={styles.heading}>Session complete</Text>
              <MiniLB rows={leaderboard} />
            </>
          ) : null}
          <IntervalPrompt
            open={promptOpen}
            title={mkPromptTitle(steps[promptForStep ?? 0])}
            value={promptValue}
            target={steps[promptForStep ?? 0]?.target_reps}
            onChange={setPromptValue}
            onQuickFill={(n) => setPromptValue(String(n))}
            onClose={() => setPromptOpen(false)}
            onSubmit={submitIntervalReps}
          />
        </>
      );
    }

    // LIVE INTERVAL SCREEN (class is active and time remaining)
    return shell(
      <>
        <Text style={styles.timer}>{fmtTime(elapsed)}</Text>
        <Text style={styles.round}>
          Step {intervalIdx + 1} / {stepCount}
        </Text>
        <Text style={styles.current}>
          {intervalCurrent?.name ?? '—'}
          {typeof intervalCurrent?.target_reps === 'number'
            ? ` · target ${intervalCurrent.target_reps} reps`
            : ''}
        </Text>
        <Text style={styles.next}>Next: {intervalNext?.name ?? '—'}</Text>
        <MiniLB rows={leaderboard} />
        <IntervalPrompt
          open={promptOpen}
          title={mkPromptTitle(steps[promptForStep ?? 0])}
          value={promptValue}
          target={steps[promptForStep ?? 0]?.target_reps}
          onChange={setPromptValue}
          onQuickFill={(n) => setPromptValue(String(n))}
          onClose={() => setPromptOpen(false)}
          onSubmit={submitIntervalReps}
        />
      </>
    );
  }

  // FOR TIME / AMRAP MODE
  if (status === 'ended' || !inCap) {
    // Class is over (either coach stopped or time cap reached)
    if (finished) {
      // If user already finished workout or has submitted final score
      return shell(<CompletedCard leaderboard={leaderboard} />);
    }
    // If user did not finish, prompt for final reps count at time cap (DNF scenario)
    return shell(
      <CappedCard
        onSubmit={async (n: number) => {
          await submitPartial(n);
          await refreshProgress();
          // Mark as finished locally so UI shows completion after submitting score
          setProgress(p => ({ ...p, finished_at: p.finished_at ?? new Date().toISOString() }));
        }}
        leaderboard={leaderboard}
      />
    );
  }

  if (status === 'live') {
    // Workout is ongoing (time remains and class is live)
    if (finished) {
      // User completed all steps before time cap (For Time scenario)
      return shell(<CompletedCard leaderboard={leaderboard} />);
    }
    // Ongoing FOR TIME or AMRAP workout, show current and next steps with navigation
    const roundLabel = normalizedType === 'AMRAP'
      ? `Round ${(progress.rounds_completed ?? 0) + 1}`
      : `Round ${current?.round ?? 1}`;
    return shell(
      <>
        <Text style={styles.timer}>{fmtTime(elapsed)}</Text>
        <Text style={styles.round}>{roundLabel}</Text>
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
            <Text style={[styles.navTextDark, !canGoNext && styles.navTextDisabledDark]}>Next</Text>
          </TouchableOpacity>
        </View>

        <MiniLB rows={leaderboard} />
      </>
    );
  }

  // Fallback loading state (should not usually reach here)
  return shell(<Text style={styles.subtle}>Loading…</Text>);
}

// Helper component wrappers and utilities

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
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
            R{item.round} · {item.name}
            {typeof item.target_reps === 'number' ? ` (target ${item.target_reps})` : ''}
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
      {rows.slice(0, 5).map((r, i) => (
        <View key={`${r.user_id}-${i}`} style={styles.lbRow}>
          <Text style={styles.lbPos}>{i + 1}</Text>
          <Text style={styles.lbUser}>User {r.user_id}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {typeof r.completed_minutes === 'number' && r.completed_minutes > 0 ? (
              <Text style={styles.lbBadge}>{r.completed_minutes}m ✓</Text>
            ) : null}
            <Text style={styles.lbScore}>
              {r.finished ? fmtTime(Number(r.elapsed_seconds ?? 0)) : `${Number(r.total_reps ?? 0)} reps`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function CompletedCard({ leaderboard }: { leaderboard: any[] }) {
  return (
    <>
      <Text style={styles.heading}>You’re done! 🎉</Text>
      <Text style={styles.subtle}>Waiting for others / coach for results…</Text>
      <MiniLB rows={leaderboard} />
    </>
  );
}

function CappedCard({
  onSubmit,
  leaderboard,
}: {
  onSubmit: (n: number) => Promise<void>;
  leaderboard: any[];
}) {
  const [val, setVal] = useState('');
  const n = Math.max(0, Number(val) || 0);

  return (
    <>
      <Text style={styles.heading}>Time’s up</Text>
      <Text style={styles.subtle}>Enter reps completed on your last exercise</Text>
      <View style={styles.bigInputWrap}>
        <TextInput
          style={styles.bigInput}
          keyboardType="numeric"
          value={val}
          onChangeText={setVal}
          placeholder="0"
          placeholderTextColor="#666"
          maxLength={6}
        />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={() => onSubmit(n)}>
        <Text style={styles.submitText}>Submit Score</Text>
      </TouchableOpacity>
      <MiniLB rows={leaderboard} />
    </>
  );
}

function mkPromptTitle(step?: Step) {
  if (!step) return 'Enter reps';
  const base = `Enter reps for: ${step.name}`;
  if (typeof step.target_reps === 'number') {
    return `${base} (target ${step.target_reps})`;
  }
  return base;
}

// Interval Reps Prompt Modal
function IntervalPrompt({
  open, title, value, target,
  onChange, onQuickFill, onClose, onSubmit
}: {
  open: boolean;
  title: string;
  value: string;
  target?: number;
  onChange: (v: string) => void;
  onQuickFill: (n: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.modalWrap}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.bigInputWrap}>
            <TextInput
              style={styles.bigInput}
              keyboardType="numeric"
              value={value}
              onChangeText={onChange}
              placeholder="0"
              placeholderTextColor="#666"
              maxLength={6}
              autoFocus
            />
          </View>
          <View style={styles.modalRow}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            {typeof target === 'number' ? (
              <>
                <TouchableOpacity style={styles.modalFill} onPress={() => onQuickFill(target)}>
                  <Text style={styles.modalFillText}>Completed</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
              </>
            ) : null}
            <TouchableOpacity style={styles.modalSubmit} onPress={onSubmit}>
              <Text style={styles.modalSubmitText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Styles
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
  current: { color: '#fff', fontSize: 28, textAlign: 'center', fontWeight: '800', marginTop: 8 },
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
  lbBadge: { color: '#d8ff3e', fontWeight: '800' },

  bigInputWrap: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  bigInput: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 6,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#d8ff3e',
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center'
  },
  submitText: { color: '#111', fontWeight: '800' },

  modalWrap: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20
  },
  modalCard: { backgroundColor: '#1b1b1b', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalRow: { flexDirection: 'row', marginTop: 8 },
  modalCancel: {
    backgroundColor: '#2a2a2a', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flex: 1
  },
  modalCancelText: { color: '#ddd', fontWeight: '800' },
  modalFill: {
    backgroundColor: '#444', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flex: 1
  },
  modalFillText: { color: '#fff', fontWeight: '800' },
  modalSubmit: {
    backgroundColor: '#d8ff3e', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flex: 1
  },
  modalSubmitText: { color: '#111', fontWeight: '800' },
});
