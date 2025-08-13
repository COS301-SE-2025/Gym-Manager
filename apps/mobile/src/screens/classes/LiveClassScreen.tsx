import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, TextInput, ActivityIndicator, FlatList } from 'react-native';
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

export default function LiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params?.classId as number;
  const workoutId = params?.liveClassData?.class?.workoutId as number | undefined;

  const session = useLiveSession(classId);
  const { progress } = useMyProgress(classId);
  const { advance, submitPartial } = useProgressActions(classId);
  const leaderboard = useLeaderboard(classId);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!session?.started_at) return;
    const startMs = new Date(session.started_at).getTime();
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000))), 500);
    return () => clearInterval(id);
  }, [session?.started_at]);

  // Fallback steps for View 1 (before class_sessions exists)
  const [fallbackSteps, setFallbackSteps] = useState<Step[]>([]);
  useEffect(() => {
    const fetchFallback = async () => {
      if (!workoutId || session) return; // if session exists we'll use its steps
      const token = await getToken();
      const { data } = await axios.get(`${config.BASE_URL}/workout/${workoutId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFallbackSteps((data?.steps ?? []) as Step[]);
    };
    fetchFallback();
  }, [session, workoutId]);

  const cap = session?.time_cap_seconds ?? 0;
  const inCap = cap === 0 ? true : elapsed <= cap;

  const steps = (session?.steps as Step[] | undefined) ?? fallbackSteps;
  const currentIdx = progress.current_step ?? 0;
  const current = steps[currentIdx];
  const next = steps[currentIdx + 1];

  // If we have neither session nor fallback yet, show spinner
  if (!session && steps.length === 0) {
    return screen(<ActivityIndicator size="large" />);
  }

  // VIEW 1 — overview (no session yet, or session.status==='ready')
  if (!session || session.status === 'ready') {
    return screen(
      <>
        <Text style={styles.heading}>For Time</Text>
        {session?.time_cap_seconds ? (
          <Text style={styles.subtle}>Time cap: {fmtTime(session.time_cap_seconds)}</Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workout of the Day</Text>
          <FlatList
            data={steps}
            keyExtractor={(s) => String(s.index)}
            renderItem={({ item }) => (
              <Text style={styles.stepText}>
                R{item.round} · {item.name}
              </Text>
            )}
          />
        </View>

        <MiniLB rows={leaderboard} />
        <Text style={styles.hint}>Waiting for coach to start…</Text>
      </>
    );
  }

  // VIEW 2 — live
  if (session.status === 'live' && inCap) {
    return screen(
      <>
        <Text style={styles.timer}>{fmtTime(elapsed)}</Text>
        <Text style={styles.round}>Round {current?.round ?? 1}</Text>
        <Text style={styles.current}>{current?.name ?? '—'}</Text>
        <Text style={styles.next}>Next: {next?.name ?? '—'}</Text>

        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navBtn, styles.back]} onPress={() => advance('prev')}>
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, styles.nextBtn]} onPress={() => advance('next')}>
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
        </View>

        <MiniLB rows={leaderboard} />
      </>
    );
  }

  // VIEW 3 — finished or capped
  return <FinishScreen submitPartial={submitPartial} leaderboard={leaderboard} />;
}

function screen(children: React.ReactNode) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.pad}>{children}</View>
    </SafeAreaView>
  );
}

function fmtTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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

function FinishScreen({
  submitPartial,
  leaderboard,
}: {
  submitPartial: (n: number) => Promise<void>;
  leaderboard: any[];
}) {
  const [val, setVal] = useState('');
  const n = useMemo(() => Number(val) || 0, [val]);

  return screen(
    <>
      <Text style={styles.heading}>Time’s up!</Text>
      <Text style={styles.subtle}>Enter reps completed on your last exercise</Text>

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

      <TouchableOpacity style={styles.submitBtn} onPress={() => submitPartial(n)}>
        <Text style={styles.submitText}>Submit Score</Text>
      </TouchableOpacity>

      <MiniLB rows={leaderboard} />
    </>
  );
}

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
  navText: { color: '#111', fontWeight: '800' },
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
