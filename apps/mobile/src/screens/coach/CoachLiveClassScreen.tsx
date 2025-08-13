import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { coachStart, coachStop } from '../../hooks/useProgressActions';

type R = RouteProp<AuthStackParamList, 'CoachLiveClass'>;

export default function CoachLiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params?.classId as number;

  const session = useLiveSession(classId);
  const leaderboard = useLeaderboard(classId);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={s.pad}>
        <Text style={s.title}>Coach Controls</Text>
        <Text style={s.meta}>Class #{classId}</Text>
        <Text style={s.meta}>Status: {session?.status ?? '—'}</Text>

        <View style={{ height: 12 }} />

        {session?.status !== 'live' ? (
          <TouchableOpacity style={s.primary} onPress={() => coachStart(classId)}>
            <Text style={s.primaryText}>Start Workout</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.danger} onPress={() => coachStop(classId)}>
            <Text style={s.dangerText}>Stop</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />

        <Text style={s.section}>Leaderboard</Text>
        {leaderboard.slice(0, 10).map((r, i) => (
          <View key={`${r.user_id}-${i}`} style={s.row}>
            <Text style={s.pos}>{i + 1}</Text>
            <Text style={s.user}>User {r.user_id}</Text>
            <Text style={s.score}>{r.display_score}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  pad: { flex: 1, padding: 20 },
  title: { color: '#d8ff3e', fontSize: 24, fontWeight: '800' },
  meta: { color: '#aaa', marginTop: 4 },
  section: { color: '#fff', marginTop: 20, marginBottom: 8, fontWeight: '700' },
  primary: { backgroundColor: '#d8ff3e', padding: 16, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#111', fontWeight: '800' },
  danger: { backgroundColor: '#ff5c5c', padding: 16, borderRadius: 10, alignItems: 'center' },
  dangerText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  pos: { width: 20, color: '#d8ff3e', fontWeight: '800' },
  user: { flex: 1, color: '#ddd' },
  score: { color: '#fff', fontWeight: '700' },
});
