import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import config from '../../config';
import apiClient from '../../utils/apiClient';

type R = RouteProp<AuthStackParamList, 'CoachLive'>;

async function call(path: string) {
  await apiClient.post(`${path}`, {});
}

export default function CoachScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;

  const session = useSession(classId);
  const lb = useLeaderboardRealtime(classId);

  const allFinished = useMemo(
    () => lb.length > 0 && lb.every((r:any) => !!r.finished),
    [lb]
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={s.pad}>
        <Text style={s.title}>Coach Controls</Text>
        <Text style={s.meta}>Class #{classId}</Text>
        <Text style={s.meta}>Status: {session?.status ?? '—'}</Text>
        <Text style={s.meta}>Type: {session?.workout_type ?? '—'}</Text>

        <View style={{ height: 12 }} />
        {session?.status !== 'live' && session?.status !== 'paused' ? (
          <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/start`)}>
            <Text style={s.btnPrimaryText}>Start Workout</Text>
          </TouchableOpacity>
        ) : null}

        {session?.status === 'live' && !allFinished ? (
          <View style={s.row}>
            <TouchableOpacity style={s.btn} onPress={() => call(`/coach/live/${classId}/pause`)}>
              <Text style={s.btnText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Text style={s.btnTextAlt}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {(session?.status === 'paused' || (session?.status === 'live' && allFinished)) ? (
          <View style={{gap:10}}>
            {session?.status === 'paused' && (
              <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/resume`)}>
                <Text style={s.btnPrimaryText}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btnPrimary, {backgroundColor:'#ff5c5c'}]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Text style={[s.btnPrimaryText, {color:'#fff'}]}>Finish Workout</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 18 }} />
        <Text style={s.section}>Leaderboard</Text>
        <View style={s.lb}>
          {lb.map((r:any,i:number)=>(
            <View key={`${r.user_id}-${i}`} style={s.lbRow}>
              <Text style={s.pos}>{i+1}</Text>
              <Text style={s.user}>
                {(r.first_name || r.last_name) ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() : (r.name ?? `User ${r.user_id}`)}
              </Text>
              <Text style={s.score}>
                {r.finished ? fmt(Number(r.elapsed_seconds ?? 0)) : `${Number(r.total_reps ?? 0)} reps`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s/60);
  const ss = s%60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#101010' },
  pad:{ flex:1, padding:18 },
  title:{ color:'#d8ff3e', fontSize:24, fontWeight:'900' },
  meta:{ color:'#9aa', marginTop:4 },
  section:{ color:'#fff', marginTop:16, fontWeight:'800' },
  btnPrimary:{ backgroundColor:'#d8ff3e', padding:14, borderRadius:10, alignItems:'center' },
  btnPrimaryText:{ color:'#111', fontWeight:'900' },
  row:{ flexDirection:'row', gap:10, marginTop:8 },
  btn:{ flex:1, backgroundColor:'#2a2a2a', padding:14, borderRadius:10, alignItems:'center' },
  btnDanger:{ backgroundColor:'#ff5c5c' },
  btnText:{ color:'#fff', fontWeight:'900' },
  btnTextAlt:{ color:'#fff', fontWeight:'900' },
  lb:{ backgroundColor:'#1a1a1a', borderRadius:10, padding:10, marginTop:8 },
  lbRow:{ flexDirection:'row', alignItems:'center', paddingVertical:4 },
  pos:{ width:24, color:'#d8ff3e', fontWeight:'900' },
  user:{ flex:1, color:'#e1e1e1' },
  score:{ color:'#fff', fontWeight:'800' }
});
