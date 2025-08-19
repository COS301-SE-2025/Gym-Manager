// src/screens/classes/OverviewScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type R = RouteProp<AuthStackParamList, 'Overview'>;

type FlatStep = {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
};

export default function OverviewScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<R>();
  const classId = params.classId as number;

  const liveClassData: any = (params as any).liveClassData ?? {};
  const preWorkoutId: number | undefined = liveClassData?.class?.workoutId;
  const preWorkoutName: string | undefined = liveClassData?.class?.workoutName;
  const preDurationSeconds: number =
    (Number(liveClassData?.class?.durationMinutes ?? 0) * 60) || 0;
  const preType: string | undefined = liveClassData?.class?.workoutType;

  const session = useSession(classId);

  // --- fallback steps before session exists ---
  const [fallbackSteps, setFallbackSteps] = useState<FlatStep[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    const shouldLoadFallback =
      (Array.isArray(session?.steps) ? session?.steps?.length === 0 : true) &&
      typeof preWorkoutId === 'number' &&
      fallbackSteps.length === 0 &&
      !fallbackLoading;

    if (!shouldLoadFallback) return;

    (async () => {
      try {
        setFallbackLoading(true);
        const token = await getToken();
        const { data } = await axios.get(
          `${config.BASE_URL}/workout/${preWorkoutId}/steps`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (Array.isArray(data?.steps)) {
          setFallbackSteps(data.steps as FlatStep[]);
        }
      } catch { /* noop */ }
      finally {
        setFallbackLoading(false);
      }
    })();
  }, [session?.steps, preWorkoutId, fallbackSteps.length, fallbackLoading]);

  const steps: FlatStep[] =
    (Array.isArray(session?.steps) && session!.steps!.length > 0
      ? (session!.steps as any[])
      : fallbackSteps) as FlatStep[];

  const workoutType: string =
    (session?.workout_type as string) ||
    (preType as string) ||
    'FOR_TIME';

  const capSeconds: number =
    (Number(session?.time_cap_seconds ?? 0)) || preDurationSeconds;

  const workoutName: string =
    (preWorkoutName as string) ||
    'Workout';

  // route when class goes live
  useEffect(() => {
    if (!session?.status) return;
    const t = (workoutType || '').toUpperCase();

    if (session.status === 'live') {
      if (t === 'FOR_TIME') nav.replace('ForTimeLive', { classId });
      if (t === 'AMRAP')   nav.replace('AmrapLive',   { classId });
    }
    if (session.status === 'ended') {
      nav.replace('LiveClassEnd', { classId });
    }
  }, [session?.status, workoutType, nav, classId]);

  // group steps
  const grouped = useMemo(() => {
    const byRound: Record<number, Record<number, FlatStep[]>> = {};
    for (const s of steps) {
      byRound[s.round] = byRound[s.round] || {};
      byRound[s.round][s.subround] = byRound[s.round][s.subround] || [];
      byRound[s.round][s.subround].push(s);
    }
    return byRound;
  }, [steps]);

  const roundCount = Object.keys(grouped).length;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <ScrollView contentContainerStyle={s.scroll}>

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

        {steps.length === 0 ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>
              Waiting for workout…
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
                      {exs.map((e) => (
                        <Text key={`step-${e.index}`} style={s.exerciseText}>
                          {e.name}
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
  );
}

function TypePill({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[s.pill, active && s.pillActive]}>
      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
    </View>
  );
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },
  scroll: { padding: 16, paddingBottom: 40 },

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
  exerciseText: { color: '#ddd', paddingVertical: 4 },

  paused: { marginTop: 14, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10, alignItems:'center' },
  pausedText: { color: '#fff', fontWeight: '800' },
});
