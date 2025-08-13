import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, ActivityIndicator, FlatList, Modal, KeyboardAvoidingView, Platform
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
type Step = { index:number; name:string; reps?:number; duration?:number; round:number; subround:number };

async function submitIntervalRepsApi(classId: number, stepIndex: number, reps: number) {
  const token = await getToken();
  await axios.post(
    `${config.BASE_URL}/live/${classId}/interval/score`,
    { stepIndex, reps },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export default function LiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params?.classId as number;
  const workoutId = params?.liveClassData?.class?.workoutId as number | undefined;

  const session = useLiveSession(classId);
  const { progress, refresh: refreshProgress, setProgress } = useMyProgress(classId);
  const { advance, submitPartial } = useProgressActions(classId);
  const { rows: leaderboard } = useLeaderboard(classId);

  // ===== Shared timer for the session =====
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

  // ===== Fallback steps pre-start =====
  const [fallbackSteps, setFallbackSteps] = useState<Step[]>([]);
  useEffect(() => {
    const fetchFallback = async () => {
      if (!workoutId || session) return;
      const token = await getToken();
      const { data } = await axios.get(`${config.BASE_URL}/workout/${workoutId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFallbackSteps((data?.steps ?? []) as Step[]);
    };
    fetchFallback();
  }, [session, workoutId]);

  const steps = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const stepCount = steps.length;

  // ===== Workout type detection =====
  const workoutType = (session?.['workout_type'] as string | undefined)?.toUpperCase?.();
  const inferredInterval =
    steps.length > 0 && steps.every(s => typeof s.duration === 'number' && !s.reps);
  const isInterval = workoutType === 'INTERVAL' || workoutType === 'TABATA' || inferredInterval;

  // ===== FOR TIME / AMRAP state (unchanged) =====
  const cap = session?.time_cap_seconds ?? 0;
  const inCap = cap === 0 ? true : elapsed <= cap;
  const status = session?.status ?? 'ready';

  const currentIdx = Math.max(0, Math.min(stepCount, progress.current_step ?? 0));
  const current = steps[currentIdx];
  const nextStep = steps[currentIdx + 1];

  const logicallyFinished = currentIdx >= stepCount;
  const finished = Boolean(progress.finished_at) || logicallyFinished;

  const canGoBack = !finished && status === 'live' && inCap && currentIdx > 0;
  const canGoNext = !finished && status === 'live' && inCap && currentIdx < stepCount;

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

  // ===== INTERVAL/TABATA derived by time =====
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

  // Prompt when a work step ends (index advances)
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
        setPromptForStep(justEndedIdx);
        setPromptValue('');
        setPromptOpen(true);
      }
      prevIdxRef.current = nowIdx;
    }
  }, [isInterval, status, intervalIdx, steps, scoredSteps]);

  // If the class ends or cap hits while still inside a WORK step, prompt once
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
      // After final save at session end/cap -> results view appears automatically
    } catch {
      /* keep modal open on error */
    }
  };

  // ====== render branches ======
  if (!session && steps.length === 0) {
    return shell(<ActivityIndicator size="large" />);
  }

  // VIEW 1 — overview
  if (!session || status === 'ready') {
    return shell(
      <>
        <Text style={styles.heading}>
          {isInterval ? 'Interval / Tabata' : 'For Time'}
        </Text>
        {session?.time_cap_seconds ? (
          <Text style={styles.subtle}>Time cap: {fmtTime(session.time_cap_seconds)}</Text>
        ) : null}
        <WorkoutCard steps={steps} />
        <MiniLB rows={leaderboard} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // ===== INTERVAL/TABATA =====
  if (isInterval) {
    // If time ended or coach stopped: show prompt if needed, otherwise results
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
            title={`Enter reps for: ${steps[promptForStep ?? 0]?.name ?? ''}`}
            value={promptValue}
            onChange={setPromptValue}
            onClose={() => setPromptOpen(false)}
            onSubmit={submitIntervalReps}
          />
        </>
      );
    }

    // Live interval screen
    return shell(
      <>
        <Text style={styles.timer}>{fmtTime(elapsed)}</Text>
        <Text style={styles.round}>
          Step {intervalIdx + 1} / {stepCount}
        </Text>
        <Text style={styles.current}>{intervalCurrent?.name ?? '—'}</Text>
        <Text style={styles.next}>Next: {intervalNext?.name ?? '—'}</Text>
        <MiniLB rows={leaderboard} />
        <IntervalPrompt
          open={promptOpen}
          title={`Enter reps for: ${steps[promptForStep ?? 0]?.name ?? ''}`}
          value={promptValue}
          onChange={setPromptValue}
          onClose={() => setPromptOpen(false)}
          onSubmit={submitIntervalReps}
        />
      </>
    );
  }

  // ===== FOR TIME / AMRAP =====
  if (status === 'ended') {
    return finished
      ? shell(<CompletedCard leaderboard={leaderboard} />)
      : shell(<CappedCard onSubmit={async n => { await submitPartial(n); await refreshProgress(); }} leaderboard={leaderboard} />);
  }

  if (!inCap) {
    return finished
      ? shell(<CompletedCard leaderboard={leaderboard} />)
      : shell(<CappedCard onSubmit={async n => { await submitPartial(n); await refreshProgress(); }} leaderboard={leaderboard} />);
  }

  if (status === 'live') {
    if (finished) return shell(<CompletedCard leaderboard={leaderboard} />);
    return shell(
      <>
        <Text style={styles.timer}>{fmtTime(elapsed)}</Text>
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
            <Text style={[styles.navTextDark, !canGoNext && styles.navTextDisabledDark]}>Next</Text>
          </TouchableOpacity>
        </View>

        <MiniLB rows={leaderboard} />
      </>
    );
  }

  return shell(<Text style={styles.subtle}>Loading…</Text>);
}

/* ------- tiny UI helpers ------- */
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
  const m = Math.floor(t / 60); const s = t % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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
            {r.finished ? `${fmtTime(Number(r.elapsed_seconds ?? 0))}` : `${Number(r.total_reps ?? 0)} reps`}
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
  onSubmit, leaderboard,
}: { onSubmit: (n: number) => Promise<void>; leaderboard: any[] }) {
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

/* ====== Interval Reps Prompt ====== */
function IntervalPrompt({
  open, title, value, onChange, onClose, onSubmit
}: {
  open: boolean;
  title: string;
  value: string;
  onChange: (v: string) => void;
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
            <TouchableOpacity style={styles.modalSubmit} onPress={onSubmit}>
              <Text style={styles.modalSubmitText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  current: { color: '#fff', fontSize: 32, textAlign: 'center', fontWeight: '800', marginTop: 8 },
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
  submitBtn: { backgroundColor: '#d8ff3e', paddingVertical: 16, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#111', fontWeight: '800' },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1b1b1b', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalRow: { flexDirection: 'row', marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#2a2a2a', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { color: '#ddd', fontWeight: '800' },
  modalSubmit: { flex: 1, backgroundColor: '#d8ff3e', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalSubmitText: { color: '#111', fontWeight: '800' },
});
