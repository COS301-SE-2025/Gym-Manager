import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { LbFilter, useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { BlurView } from 'expo-blur';
import { useImmersiveBars } from '../../hooks/useImmersiveBars';

type R = RouteProp<AuthStackParamList, 'IntervalLive'>;

const isRestStep = (step: any) => /\brest\b/i.test(String(step?.name ?? ''));

const isTimeOnlyStep = (step: any) => String(step?.quantityType ?? '').toLowerCase() === 'duration';

function useNowSec() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}
function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Pause-aware ticker:
 * - steps advance by their `duration` (REST included in timing)
 * - clamps at end of total planned durations (no wrapping), returns done=true
 * - when done=true: timer is clamped; we deliberately DO NOT disable inputs
 */
function useIntervalTicker(session: any | null) {
  const nowSec = useNowSec();

  const startedAtSec = Number((session as any)?.started_at_s ?? 0);
  const pausedAtSec = Number((session as any)?.paused_at_s ?? 0);
  const pauseAccum = Number((session as any)?.pause_accum_seconds ?? 0);
  const extraPaused =
    session?.status === 'paused' && pausedAtSec ? Math.max(0, nowSec - pausedAtSec) : 0;

  const elapsedRaw = startedAtSec
    ? Math.max(0, nowSec - startedAtSec - (pauseAccum + extraPaused))
    : 0;

  const steps: any[] = Array.isArray(session?.steps) ? (session!.steps as any[]) : [];
  const durations: number[] = steps.map((s) => Math.max(0, Number(s.duration ?? 0)));
  const timed = durations.map((d, i) => ({ i, d })).filter((x) => x.d > 0);

  if (!startedAtSec || timed.length === 0) {
    return { displayElapsed: 0, idx: -1, nextIdx: -1, done: false, totalPlanned: 0 };
  }

  const totalPlanned = timed.reduce((a, b) => a + b.d, 0);

  if (elapsedRaw >= totalPlanned) {
    return { displayElapsed: totalPlanned, idx: -1, nextIdx: -1, done: true, totalPlanned };
  }

  // within planned window
  let acc = 0,
    idx = timed[0].i;
  for (const t of timed) {
    if (elapsedRaw < acc + t.d) {
      idx = t.i;
      break;
    }
    acc += t.d;
  }
  const pos = timed.findIndex((t) => t.i === idx);
  const nextIdx = timed[Math.min(pos + 1, timed.length - 1)]?.i ?? -1;

  return { displayElapsed: elapsedRaw, idx, nextIdx, done: false, totalPlanned };
}

export default function IntervalLiveScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;
  const nav = useNavigation<any>();

  const session = useSession(classId);

  const [scope, setScope] = useState<LbFilter>('ALL');
  const lb = useLeaderboardRealtime(classId, scope);

  const steps: any[] = (session?.steps as any[]) ?? [];
  const ready = Array.isArray(steps) && steps.length > 0;

  const { displayElapsed, idx: liveIdx, nextIdx, done } = useIntervalTicker(session);

  // Allow submissions only once a real class_session exists (prevents SESSION_NOT_FOUND)
  const canSubmit =
    !!session?.class_id && // session row exists
    (!!session?.started_at_s || session?.status === 'paused' || session?.status === 'ended') &&
    ready;

  // local input + submission states
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, boolean>>({});
  const [finishing, setFinishing] = useState(false);

  const setInput = (i: number, v: string) => setInputs((prev) => ({ ...prev, [i]: v }));

  // required = all TIMED, NON-REST, reps-only steps
  const requiredIdx = useMemo(() => {
    const arr: number[] = [];
    for (const s of steps) {
      const i = Number(s.index ?? 0);
      const timed = Number(s.duration ?? 0) > 0;
      if (timed && !isRestStep(s) && !isTimeOnlyStep(s)) arr.push(i);
    }
    return arr;
  }, [steps]);

  const allFilled = requiredIdx.every((i) => (inputs[i] ?? '').trim() !== '');
  const allSubmitted = requiredIdx.every((i) => !!submitted[i]);
  const noErrors = requiredIdx.every((i) => !errors[i]);

  const validateNumber = (raw?: string) => {
    if (raw == null) return false;
    const t = String(raw).trim();
    if (t === '') return false;
    if (!/^\d+$/.test(t)) return false;
    return Number(t) >= 0;
  };

  // handler: validate -> POST -> mark submitted
  const submit = useCallback(
    async (stepIndex: number) => {
      const step = steps?.[stepIndex];
      if (!canSubmit || isRestStep(step) || isTimeOnlyStep(step)) return;

      const raw = inputs[stepIndex];
      const valid = validateNumber(raw);
      setErrors((prev) => ({ ...prev, [stepIndex]: !valid }));
      if (!valid) return;

      const reps = Math.max(0, Number(raw));
      try {
        const token = await getToken();
        await axios.post(
          `${config.BASE_URL}/live/${classId}/interval/score`,
          { stepIndex, reps },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setSubmitted((prev) => ({ ...prev, [stepIndex]: true }));
        setErrors((prev) => ({ ...prev, [stepIndex]: false }));
      } catch {
        // Leave it unsubmitted; user can retry
        setErrors((prev) => ({ ...prev, [stepIndex]: true }));
      }
    },
    [classId, canSubmit, inputs, steps],
  );

  // Finish: only when inputs are filled AND every required step has - submitted
  const submitAllAndFinish = useCallback(async () => {
    if (!canSubmit || finishing) return;
    if (!(allFilled && allSubmitted && noErrors)) return;
    setFinishing(true);
    try {
      // No auto-submit: you asked that ALL - are clicked before enabling this
    } finally {
      setFinishing(false);
      nav.replace('LiveClassEnd', { classId });
    }
  }, [canSubmit, finishing, allFilled, allSubmitted, noErrors, nav, classId]);

  // group steps (matches Overview grouping feel)
  const grouped = useMemo(() => {
    const byRound: Record<number, Record<number, any[]>> = {};
    for (const s of steps) {
      const r = Number(s.round ?? 1);
      const sr = Number(s.subround ?? 1);
      byRound[r] ??= {};
      byRound[r][sr] ??= [];
      byRound[r][sr].push(s);
    }
    return byRound;
  }, [steps]);

  // Pause overlay animation (portrait)
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

  // Convenience for header
  const current = ready && liveIdx >= 0 ? steps[liveIdx] : undefined;
  const next = ready && nextIdx >= 0 ? steps[nextIdx] : undefined;

  return (
    <View style={s.root}>
      <StatusBar hidden={true} />
      <SafeAreaView style={s.safeArea} edges={['left', 'right']}>
        <View style={s.topHeader}>
          <Text style={s.timer}>{fmtClock(displayElapsed)}</Text>

          {!ready ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="large" color="#D8FF3E" />
              <Text style={{ color: '#8d8d8d', marginTop: 8, fontWeight: '700' }}>
                Getting class ready…
              </Text>
            </View>
          ) : done ? (
            <View style={s.endedBanner}>
              <Text style={s.endedBannerText}>Class ended — enter your reps and tap Finish</Text>
            </View>
          ) : (
            <>
              <Text style={s.curLabel}>Current exercise:</Text>
              <Text style={s.current}>{current?.name ?? '—'}</Text>
              <Text style={s.next}>Next: {next?.name ?? '—'}</Text>
            </>
          )}

          {!canSubmit && (
            <View style={s.notice}>
              <Text style={s.noticeText}>Waiting for coach to start…</Text>
            </View>
          )}
          {session?.status === 'ended' && !done && (
            <View style={s.notice}>
              <Text style={s.noticeText}>Coach ended session — finish when ready</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 26 }}>
          {Object.keys(grouped)
            .map(Number)
            .sort((a, b) => a - b)
            .map((r) => {
              const subs = grouped[r];
              return (
                <View key={`round-${r}`} style={s.roundBox}>
                  {Object.keys(subs)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((sr) => {
                      const exs = subs[sr];
                      return (
                        <View key={`sub-${r}-${sr}`} style={s.subBox}>
                          {exs.map((e: any) => {
                            const i = Number(e.index);
                            const isLive = !done && i === liveIdx;
                            const rest = isRestStep(e);
                            const timeOnly = !rest && isTimeOnlyStep(e);
                            const showError = !!errors[i];
                            return (
                              <View key={`step-${i}`} style={[s.row, isLive && s.rowLive]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[s.exName, isLive && s.exNameLive]}>{e.name}</Text>
                                </View>

                                {rest || timeOnly ? (
                                  <View style={s.restPill}>
                                    <Text style={s.restPillText}>{rest ? 'REST' : 'TIME'}</Text>
                                  </View>
                                ) : (
                                  <>
                                    <TextInput
                                      value={inputs[i] ?? ''}
                                      onChangeText={(v) => setInput(i, v)}
                                      keyboardType="numeric"
                                      placeholder="0"
                                      placeholderTextColor="#777"
                                      style={[
                                        s.input,
                                        submitted[i] && s.inputSaved,
                                        showError && s.inputError,
                                        !canSubmit && s.inputDisabled,
                                      ]}
                                      editable={canSubmit}
                                    />
                                    <TouchableOpacity
                                      style={[
                                        s.tick,
                                        submitted[i] && s.tickSaved,
                                        !canSubmit && s.tickDisabled,
                                      ]}
                                      onPress={() => submit(i)}
                                      disabled={!canSubmit}
                                    >
                                      <Text style={[s.tickText, submitted[i] && s.tickTextSaved]}>
                                        ✓
                                      </Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                </View>
              );
            })}

          {/* Leaderboard */}
          <View style={[s.lb, { zIndex: 50, elevation: 6 }]} pointerEvents="auto">
            <Text style={s.lbTitle}>Leaderboard</Text>

            {/* RX/SC filter */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 }}
            >
              {(['ALL', 'RX', 'SC'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setScope(opt)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: scope === opt ? '#2e3500' : '#1f1f1f',
                    borderWidth: 1,
                    borderColor: scope === opt ? '#d8ff3e' : '#2a2a2a',
                  }}
                >
                  <Text style={{ color: scope === opt ? '#d8ff3e' : '#9aa', fontWeight: '800' }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {lb.map((r: any, i: number) => {
              const displayName =
                r.first_name || r.last_name
                  ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                  : (r.name ?? `User ${r.user_id}`);
              return (
                <View key={`${r.user_id}-${i}`} style={s.lbRow}>
                  <Text style={s.lbPos}>{i + 1}</Text>
                  <Text style={s.lbUser}>
                    {displayName} <Text style={{ color: '#9aa' }}>({r.scaling ?? 'RX'})</Text>
                  </Text>
                  <Text style={s.lbScore}>{Number(r.total_reps ?? 0)} reps</Text>
                </View>
              );
            })}
          </View>

          <View style={{ height: 12 }} />
          <TouchableOpacity
            style={[
              s.finishBtn,
              (!canSubmit || !allFilled || !allSubmitted || !noErrors || finishing) &&
                s.finishBtnDisabled,
            ]}
            onPress={submitAllAndFinish}
            disabled={!canSubmit || !allFilled || !allSubmitted || !noErrors || finishing}
          >
            <Text style={s.finishBtnText}>
              {finishing
                ? 'Submitting…'
                : !canSubmit
                  ? 'Waiting for coach…'
                  : !allFilled
                    ? 'Fill all fields to finish'
                    : !allSubmitted
                      ? 'Tap ✓ for each exercise'
                      : !noErrors
                        ? 'Fix invalid fields to finish'
                        : 'Submit & Finish'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 18 }} />
        </ScrollView>

        {/* PAUSE overlay */}
        {session?.status === 'paused' && (
          <View style={s.pausedOverlay} pointerEvents="auto">
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: '#000', opacity: fadeOpacity },
              ]}
            />
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleIn }] }}>
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
  root: { flex: 1, backgroundColor: '#101010' },
  safeArea: { flex: 1 },

  topHeader: { paddingTop: 8, alignItems: 'center' },
  timer: { color: '#e6e6e6', fontWeight: '900', fontSize: 30, letterSpacing: 2 },

  curLabel: { color: '#aaa', marginTop: 10, fontWeight: '800' },
  current: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  next: { color: '#8fa08f', fontWeight: '800', marginTop: 4 },

  notice: {
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  noticeText: { color: '#bbb', fontWeight: '700' },

  endedBanner: {
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  endedBannerText: { color: '#fff', fontWeight: '800', textAlign: 'center' },

  roundBox: { backgroundColor: '#161616', borderRadius: 16, padding: 12, marginTop: 12 },
  subBox: {
    borderWidth: 1.5,
    borderColor: '#EAE2C6',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowLive: { backgroundColor: '#1c1f12', borderRadius: 10, paddingHorizontal: 8 },
  exName: { color: '#ddd', fontWeight: '700' },
  exNameLive: { color: '#d8ff3e' },

  input: {
    width: 70,
    backgroundColor: '#1f1f1f',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    paddingVertical: 6,
  },
  inputSaved: { borderColor: '#2f3f12' },
  inputError: { borderColor: '#ff5c5c' },
  inputDisabled: { opacity: 0.5 },

  tick: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tickSaved: { backgroundColor: '#d8ff3e', borderColor: '#a7bf2a' },
  tickDisabled: { opacity: 0.4 },
  tickText: { color: '#9aa', fontWeight: '900' },
  tickTextSaved: { color: '#111' },

  lb: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, marginTop: 16 },
  lbTitle: { color: '#fff', fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  lbPos: { width: 22, color: '#d8ff3e', fontWeight: '900' },
  lbUser: { flex: 1, color: '#dedede' },
  lbScore: { color: '#fff', fontWeight: '800' },

  finishBtn: {
    backgroundColor: '#d8ff3e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishBtnDisabled: { opacity: 0.5 },
  finishBtnText: { color: '#111', fontWeight: '900' },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  pausedTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 44,
    letterSpacing: 2,
    textAlign: 'center',
  },
  pausedSub: {
    color: '#eaeaea',
    fontWeight: '700',
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },

  restPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  restPillText: { color: '#9aa', fontWeight: '800' },
});
