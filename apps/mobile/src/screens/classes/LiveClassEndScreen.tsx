// src/screens/classes/LiveClassEndScreen.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSession } from '../../hooks/useSession';
import { useMyProgress } from '../../hooks/useMyProgress';
import { useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { getUser } from '../../utils/authStorage';

type R = RouteProp<AuthStackParamList, 'LiveClassEnd'>;

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts * 1000; // epoch seconds
  const s = String(ts).replace(' ', 'T');
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  const iso = hasTZ ? s : s + 'Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export default function LiveClassEndScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;

  const session = useSession(classId);
  const prog = useMyProgress(classId);
  const lb = useLeaderboardRealtime(classId);

  const [myUserId, setMyUserId] = React.useState<number | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const me = await getUser();
        if (me?.userId) setMyUserId(Number(me.userId));
      } catch {}
    })();
  }, []);

  const type = (session?.workout_type ?? '').toUpperCase();

  const myScore = useMemo(() => {
    if (!session) return '';

    // canonical server time if available (keeps end screen == leaderboard)
    const serverElapsed = prog?.elapsed_seconds != null ? Number(prog.elapsed_seconds) : null;

    const startedSec =
      Number((session as any)?.started_at_s ?? 0) ||
      (session.started_at ? Math.floor(toMillis(session.started_at) / 1000) : 0);

    const finishedSec =
      Number((prog as any)?.finished_at_s ?? 0) ||
      (prog.finished_at ? Math.floor(toMillis(prog.finished_at) / 1000) : 0);

    // FOR_TIME shows time
    if (type === 'FOR_TIME' && (finishedSec || serverElapsed != null)) {
      const elapsed = serverElapsed ?? Math.max(0, finishedSec - startedSec);
      return `Time: ${fmt(elapsed)}`;
    }

    // AMRAP (existing logic)
    if (type === 'AMRAP') {
      const cum: number[] = (session.steps_cum_reps as number[]) ?? [];
      const within = (prog.current_step ?? 0) > 0 ? (cum[(prog.current_step! - 1)] ?? 0) : 0;
      const repsPerRound = cum.length ? cum[cum.length - 1] : 0;
      const serverTotal = (prog as any)?.total_reps as number | undefined;
      const total = serverTotal ?? (
        (Number(prog.rounds_completed ?? 0) * repsPerRound) +
        within +
        Number(prog.dnf_partial_reps ?? 0)
      );
      return `${total} reps`;
    }

     // EMOM
    if (type === 'EMOM') {
      const meRow = lb.find((r:any) => myUserId != null && String(r.user_id) === String(myUserId));
      if (meRow?.elapsed_seconds != null) {
        return `Time: ${fmt(Number(meRow.elapsed_seconds))}`;
      }
      return 'Time: —';
    }


    // TABATA / INTERVAL / EMOM — pull my total from the realtime leaderboard
    if (['TABATA','INTERVAL','EMOM'].includes(type)) {
      if (!myId) return '—';
      const mine = lb.find((r: any) => Number(r.user_id) === Number(myId));
      const reps = Number(mine?.total_reps ?? 0);
      return `${reps} reps`;
    }

    // Non-FOR_TIME fallback
    const cum: number[] = (session.steps_cum_reps as number[]) ?? [];
    const within = (prog.current_step ?? 0) > 0 ? (cum[(prog.current_step! - 1)] ?? 0) : 0;
    const reps = within + Number(prog.dnf_partial_reps ?? 0);
    return `${reps} reps`;
  }, [session, prog, lb, myUserId]);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={s.pad}>
        <Text style={s.title}>Nice work! 🎉</Text>
        <Text style={s.sub}>Your score</Text>
        <Text style={s.big}>{myScore}</Text>

        <View style={s.lb}>
          <Text style={s.lbTitle}>Leaderboard</Text>
          {lb.map((r: any, i: number) => {
            const displayName =
              (r.first_name || r.last_name)
                ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                : (r.name ?? `User ${r.user_id}`);
            return (
              <View key={`${r.user_id}-${i}`} style={s.row}>
                <Text style={s.pos}>{i + 1}</Text>
                <Text style={s.user}>{displayName}</Text>
                <Text style={s.score}>
                  {r.finished ? fmt(Number(r.elapsed_seconds ?? 0)) : `${Number(r.total_reps ?? 0)} reps`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#101010' },
  pad:{ flex:1, padding:20 },
  title:{ color:'#d8ff3e', fontWeight:'900', fontSize:28 },
  sub:{ color:'#9aa', marginTop:8 },
  big:{ color:'#fff', fontWeight:'900', fontSize:36, marginTop:4 },
  lb:{ backgroundColor:'#1a1a1a', borderRadius:14, padding:14, marginTop:20 },
  lbTitle:{ color:'#fff', fontWeight:'800', marginBottom:8 },
  row:{ flexDirection:'row', alignItems:'center', paddingVertical:6 },
  pos:{ width:26, color:'#d8ff3e', fontWeight:'900' },
  user:{ flex:1, color:'#e2e2e2' },
  score:{ color:'#fff', fontWeight:'800' }
});
