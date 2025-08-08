import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, FlatList, Pressable, Dimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useLiveSession } from '../../hooks/useLiveSession';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useMyProgress } from '../../hooks/useMyProgress';
import { useProgressActions } from '../../hooks/useProgressActions';
import { useClassTimer } from '../../hooks/useClassTimer';

type LiveRoute = RouteProp<AuthStackParamList, 'LiveClass'>;
const { width, height } = Dimensions.get('window');

export default function LiveClassScreen() {
  const { params } = useRoute<LiveRoute>();
  const classId = params.classId;

  const session = useLiveSession(classId);
  const leaderboard = useLeaderboard(classId);
  const { progress } = useMyProgress(classId);
  const { advance, submitPartial } = useProgressActions(classId);
  const timer = useClassTimer(session?.started_at ?? null, session?.time_cap_seconds);
  const [partial, setPartial] = useState('0');

  // Lock to landscape during live
  useEffect(() => {
    if (session?.status === 'live') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.unlockAsync();
    }
    return () => { ScreenOrientation.unlockAsync(); };
  }, [session?.status]);

  const view: 'overview'|'active'|'partial'|'results' = useMemo(() => {
    if (!session) return 'overview';
    if (session.status === 'ready') return 'overview';
    if (session.status === 'live') return 'active';
    // ended:
    const finished = Boolean(progress.finished_at);
    return finished ? 'results' : 'partial';
  }, [session, progress.finished_at]);

  const steps = session?.steps ?? [];
  const current = steps[progress.current_step];
  const next = steps[progress.current_step + 1];

  return (
    <SafeAreaView style={s.container}>
      {!session && <Text style={s.h}>Loading…</Text>}

      {view === 'overview' && (
        <View style={s.block}>
          <Text style={s.h}>For Time</Text>
          <Text style={s.sub}>Workout overview</Text>
          <FlatList
            data={steps}
            keyExtractor={(it) => String(it.index)}
            renderItem={({ item }) => <View style={s.card}><Text style={s.cardText}>{item.name}</Text></View>}
          />
          <Text style={s.note}>Waiting for coach to start…</Text>
        </View>
      )}

      {view === 'active' && (
        <View style={s.activeRoot}>
          {/* Top bar: timer + mini leaderboard */}
          <View style={s.topBar}>
            <Text style={s.timer}>{timer.fmt}{session?.time_cap_seconds ? ` / ${Math.floor(session.time_cap_seconds/60)}m` : ''}</Text>
            <View style={s.lbMini}>
              {leaderboard.slice(0,3).map((r,i) => (
                <Text key={r.user_id} style={s.lbMiniText}>{i+1}. {r.display_score}</Text>
              ))}
            </View>
          </View>

          {/* Center labels */}
          <View style={s.centerLabels}>
            <Text style={s.label}>Current</Text>
            <Text style={s.big}>{current?.name ?? '—'}</Text>
            <Text style={s.label}>Next</Text>
            <Text style={s.bigSmall}>{next?.name ?? '—'}</Text>
          </View>

          {/* Full screen left/right tap zones */}
          <View style={s.tapsRow}>
            <Pressable
              style={s.tapLeft}
              onPress={() => advance('prev')}
              disabled={progress.current_step <= 0}
            />
            <Pressable
              style={[s.tapRight, timer.capped && { opacity: 0.4 }]}
              onPress={() => !timer.capped && advance('next')}
            />
          </View>
        </View>
      )}

      {view === 'partial' && (
        <View style={s.block}>
          <Text style={s.h}>Time’s up!</Text>
          <Text style={s.sub}>Enter reps completed on the last exercise:</Text>
          <TextInput style={s.input} value={partial} onChangeText={setPartial} keyboardType="numeric" />
          <TouchableOpacity style={s.cta} onPress={() => submitPartial(Number(partial))}>
            <Text style={s.ctaTxt}>Submit</Text>
          </TouchableOpacity>
          <Text style={s.note}>After you submit, the leaderboard will update automatically.</Text>
        </View>
      )}

      {view === 'results' && (
        <View style={s.block}>
          <Text style={s.h}>Results</Text>
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
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#1a1a1a', padding:16 },
  block:{ gap:12 },
  h:{ color:'white', fontSize:22, fontWeight:'800' },
  sub:{ color:'#aaa' },
  note:{ color:'#888' },
  card:{ backgroundColor:'#2a2a2a', padding:12, borderRadius:8, marginVertical:6 },
  cardText:{ color:'white' },

  activeRoot:{ flex:1, backgroundColor:'#1a1a1a' },
  topBar:{ position:'absolute', top:8, left:12, right:12, flexDirection:'row', justifyContent:'space-between', zIndex:2 },
  timer:{ color:'#D8FF3E', fontSize:22, fontWeight:'800' },
  lbMini:{ alignItems:'flex-end' },
  lbMiniText:{ color:'#D8FF3E', fontWeight:'800' },

  centerLabels:{ position:'absolute', top: height * 0.2, left: 16, right: 16, alignItems:'center', zIndex:1 },
  label:{ color:'#aaa', marginTop:6 },
  big:{ color:'white', fontSize:26, fontWeight:'700', textAlign:'center', marginVertical:6 },
  bigSmall:{ color:'#ddd', fontSize:18, fontWeight:'600', textAlign:'center' },

  tapsRow:{ flex:1, flexDirection:'row' },
  tapLeft:{ flex:1, backgroundColor:'transparent' },
  tapRight:{ flex:1, backgroundColor:'transparent' },

  input:{ backgroundColor:'#222', color:'white', padding:12, borderRadius:8, width:120 },
  cta:{ backgroundColor:'#D8FF3E', padding:14, borderRadius:10, alignItems:'center' },
  ctaTxt:{ color:'#111', fontWeight:'800' },

  lbRow:{ flexDirection:'row', justifyContent:'space-between', backgroundColor:'#222', padding:12, borderRadius:8, marginVertical:6 },
  rank:{ color:'#D8FF3E', fontWeight:'900' },
  score:{ color:'white', fontWeight:'700' },
});
