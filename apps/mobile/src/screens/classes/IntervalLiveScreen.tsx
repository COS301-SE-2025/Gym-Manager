import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type R = RouteProp<AuthStackParamList, 'IntervalLive'>;

function useNowSec() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now()/1000)), 250); return () => clearInterval(id); }, []);
  return now;
}

function useIntervalTicker(session: any | null) {
  const nowSec = useNowSec();

  // pause-aware elapsed across the whole session
  const startedAtSec = Number((session as any)?.started_at_s ?? 0);
  const pausedAtSec  = Number((session as any)?.paused_at_s  ?? 0);
  const pauseAccum   = Number((session as any)?.pause_accum_seconds ?? 0);
  const extraPaused  = session?.status === 'paused' && pausedAtSec ? Math.max(0, nowSec - pausedAtSec) : 0;
  const elapsed = startedAtSec ? Math.max(0, (nowSec - startedAtSec) - (pauseAccum + extraPaused)) : 0;

  const steps: any[] = Array.isArray(session?.steps) ? session!.steps! : [];
  const durations: number[] = steps.map(s => Math.max(0, Number(s.duration ?? 0)));

  // Treat only duration-steps as interval timing contributors
  const contributors = durations.map((d, i) => ({ i, d })).filter(x => x.d > 0);
  const totalCycle = contributors.reduce((a, b) => a + b.d, 0);

  // If nothing has duration, just pin to step 0
  if (!startedAtSec || totalCycle <= 0) {
    return { elapsed, idx: 0, nextIdx: steps.length > 1 ? 1 : 0, stepElapsed: 0, stepRemaining: 0 };
  }

  const within = elapsed % totalCycle;

  let acc = 0, idx = contributors[0].i, stepElapsed = 0, stepRemaining = contributors[0].d;
  for (const c of contributors) {
    if (within < acc + c.d) {
      idx = c.i;
      stepElapsed = within - acc;
      stepRemaining = c.d - stepElapsed;
      break;
    }
    acc += c.d;
  }

  // next timed step
  const pos = contributors.findIndex(c => c.i === idx);
  const nextIdx = contributors[(pos + 1) % contributors.length].i;

  return { elapsed, idx, nextIdx, stepElapsed, stepRemaining };
}

function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

export default function IntervalLiveScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;
  const nav = useNavigation<any>();

  const session = useSession(classId);
  const lb = useLeaderboardRealtime(classId);

  const ready = Array.isArray(session?.steps) && (session!.steps! as any[]).length > 0;

  // which step is “live” right now
  const { elapsed, idx: liveIdx, nextIdx } = useIntervalTicker(session);
  const steps: any[] = (session?.steps as any[]) ?? [];
  const current = ready ? steps[liveIdx] : undefined;
  const next = ready ? steps[nextIdx] : undefined;

  // per-step local rep inputs + submitted markers
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  const setInput = (i: number, v: string) => setInputs(prev => ({ ...prev, [i]: v }));

  const submit = useCallback(async (stepIndex: number) => {
    const reps = Math.max(0, Number(inputs[stepIndex] ?? 0) || 0);
    try {
      const token = await getToken();
      await axios.post(`${config.BASE_URL}/live/${classId}/interval/score`, { stepIndex, reps }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(prev => ({ ...prev, [stepIndex]: true }));
    } catch (e) {
      // no-op UI—could toast in the future
    }
  }, [classId, inputs]);

  // auto-route to end when session ends
  const navOnce = useRef(false);
  useEffect(() => {
    if (!session) return;
    if (session.status === 'ended' && !navOnce.current) {
      navOnce.current = true;
      nav.replace('LiveClassEnd', { classId });
    }
  }, [session?.status, nav, classId]);

  // group steps similar to OverviewScreen
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

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#101010" />

      <View style={s.topHeader}>
        <Text style={s.timer}>{fmtClock(elapsed)}</Text>
        <Text style={s.curLabel}>Current exercise:</Text>
        {ready ? (
          <>
            <Text style={s.current}>{current?.name ?? '—'}</Text>
            <Text style={s.next}>Next: {next?.name ?? '—'}</Text>
          </>
        ) : (
          <View style={{ alignItems:'center', paddingVertical: 16 }}>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={{ color:'#8d8d8d', marginTop:8, fontWeight:'700' }}>Getting class ready…</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* rounds/subrounds like Overview */}
        {Object.keys(grouped).map(rKey => {
          const r = Number(rKey);
          const subs = grouped[r];
          return (
            <View key={`round-${r}`} style={s.roundBox}>
              {Object.keys(subs).map(srKey => {
                const sr = Number(srKey);
                const exs = subs[sr];
                return (
                  <View key={`sub-${r}-${sr}`} style={s.subBox}>
                    {exs.map((e: any) => {
                      const i = Number(e.index);
                      const isLive = i === liveIdx;
                      return (
                        <View key={`step-${i}`} style={[s.row, isLive && s.rowLive]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.exName, isLive && s.exNameLive]}>{e.name}</Text>
                          </View>
                          <TextInput
                            value={inputs[i] ?? ''}
                            onChangeText={v => setInput(i, v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#777"
                            style={[s.input, submitted[i] && s.inputSaved]}
                          />
                          <TouchableOpacity style={[s.tick, submitted[i] && s.tickSaved]} onPress={() => submit(i)}>
                            <Text style={[s.tickText, submitted[i] && s.tickTextSaved]}>✓</Text>
                          </TouchableOpacity>
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
        <View style={s.lb}>
          <Text style={s.lbTitle}>Leaderboard</Text>
          {lb.map((r: any, i: number) => {
            const displayName =
              (r.first_name || r.last_name)
                ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                : (r.name ?? `User ${r.user_id}`);
            return (
              <View key={`${r.user_id}-${i}`} style={s.lbRow}>
                <Text style={s.lbPos}>{i + 1}</Text>
                <Text style={s.lbUser}>{displayName}</Text>
                <Text style={s.lbScore}>{Number(r.total_reps ?? 0)} reps</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },

  topHeader: { paddingTop: 8, alignItems:'center' },
  timer:     { color:'#e6e6e6', fontWeight:'900', fontSize: 30, letterSpacing: 2 },
  curLabel:  { color:'#aaa', marginTop: 10, fontWeight:'800' },
  current:   { color:'#fff', fontSize: 36, fontWeight:'900', marginTop: 4 },
  next:      { color:'#8fa08f', fontWeight:'800', marginTop: 4 },

  roundBox:  { backgroundColor:'#161616', borderRadius:16, padding:12, marginTop:12 },
  subBox:    { borderWidth:1.5, borderColor:'#EAE2C6', borderRadius:12, padding:10, marginBottom:10 },

  row: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:6 },
  rowLive: { backgroundColor:'#1c1f12', borderRadius:10, paddingHorizontal:8 },
  exName: { color:'#ddd', fontWeight:'700' },
  exNameLive: { color:'#d8ff3e' },

  input: { width:70, backgroundColor:'#1f1f1f', borderColor:'#2a2a2a', borderWidth:1, borderRadius:8, color:'#fff', textAlign:'center', fontWeight:'900', paddingVertical:6 },
  inputSaved: { borderColor:'#2f3f12' },

  tick: { width:38, height:38, borderRadius:999, backgroundColor:'#222', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#2a2a2a' },
  tickSaved: { backgroundColor:'#d8ff3e', borderColor:'#a7bf2a' },
  tickText: { color:'#9aa', fontWeight:'900' },
  tickTextSaved: { color:'#111' },

  lb: { backgroundColor:'#1a1a1a', borderRadius:12, padding:12, marginTop:16 },
  lbTitle: { color:'#fff', fontWeight:'800', marginBottom:6, textAlign:'center' },
  lbRow: { flexDirection:'row', alignItems:'center', paddingVertical:4 },
  lbPos: { width:22, color:'#d8ff3e', fontWeight:'900' },
  lbUser:{ flex:1, color:'#dedede' },
  lbScore:{ color:'#fff', fontWeight:'800' },
});
