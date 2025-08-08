import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { coachStart, coachStop } from '../../hooks/useProgressActions';
import { useClassTimer } from '../../hooks/useClassTimer';

type CoachRoute = RouteProp<AuthStackParamList, 'CoachLiveClass'>;

export default function CoachLiveClassScreen() {
  const { params } = useRoute<CoachRoute>();
  const classId = params.classId;

  const session = useLiveSession(classId);
  const leaderboard = useLeaderboard(classId);
  const timer = useClassTimer(session?.started_at ?? null, session?.time_cap_seconds);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.h}>Coach Panel</Text>
      <Text style={s.sub}>Status: {session?.status ?? '—'}</Text>
      <Text style={s.sub}>Timer: <Text style={s.timer}>{timer.fmt}</Text></Text>

      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={() => coachStart(classId)}><Text style={s.btnTxt}>Start</Text></TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={() => coachStop(classId)}><Text style={s.btnTxt}>Stop</Text></TouchableOpacity>
      </View>

      <Text style={s.h}>Leaderboard</Text>
      <FlatList
        data={leaderboard}
        keyExtractor={(r) => `${r.user_id}`}
        renderItem={({ item, index }) => (
          <View style={s.lbRow}>
            <Text style={s.rank}>{index+1}</Text>
            <Text style={s.score}>{item.display_score}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#1a1a1a', padding:16, gap:12 },
  h:{ color:'white', fontSize:22, fontWeight:'800' },
  sub:{ color:'#aaa' },
  timer:{ color:'#D8FF3E', fontWeight:'800' },
  row:{ flexDirection:'row', gap:10 },
  btn:{ backgroundColor:'#D8FF3E', padding:12, borderRadius:8 },
  btnTxt:{ color:'#111', fontWeight:'800' },
  lbRow:{ flexDirection:'row', justifyContent:'space-between', backgroundColor:'#222', padding:12, borderRadius:8, marginVertical:6 },
  rank:{ color:'#D8FF3E', fontWeight:'900' },
  score:{ color:'white', fontWeight:'700' },
});
