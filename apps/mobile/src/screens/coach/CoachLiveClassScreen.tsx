import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import type { ApiLiveClassResponse } from '../HomeScreen';
import { Ionicons } from '@expo/vector-icons';

const CoachLiveClassScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'CoachLiveClass'>>();
  const { liveClassData } = route.params;
  const [scores, setScores] = useState<{ [userId: number]: string }>(
    () => Object.fromEntries(liveClassData.participants?.map(p => [p.userId, p.score?.toString() || '']) || [])
  );

  const handleScoreChange = (userId: number, value: string) => {
    setScores(prev => ({ ...prev, [userId]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.liveClassBanner}>
          <View style={styles.liveClassLeft}>
            <View style={styles.liveIndicator} />
            <View>
              <Text style={styles.liveLabel}>LIVE CLASS</Text>
              <Text style={styles.liveClassName}>{liveClassData.class.workoutName}</Text>
            </View>
          </View>
          <View style={styles.liveClassRight}>
            <Text style={styles.liveInstructor}>Coach</Text>
            <Text style={styles.liveCapacity}>{liveClassData.participants?.length ?? 0}/30</Text>
          </View>
        </View>
        {liveClassData.participants?.map((p, idx) => (
          <View key={p.userId} style={styles.participantRow}>
            <Text style={styles.participantName}>{`John Pork ${idx + 1}:`}</Text>
            <TextInput
              style={styles.scoreInput}
              value={scores[p.userId]}
              onChangeText={val => handleScoreChange(p.userId, val)}
              placeholder="input time"
            />
          </View>
        ))}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit Scores</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  backButton: { backgroundColor: '#2a2a2a', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  liveClassBanner: { backgroundColor: '#D8FF3E', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  liveClassLeft: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#20C934', marginRight: 12 },
  liveLabel: { color: '#1a1a1a', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  liveClassName: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
  liveClassRight: { alignItems: 'flex-end' },
  liveInstructor: { color: '#1a1a1a', fontSize: 12, fontWeight: '500' },
  liveCapacity: { color: '#1a1a1a', fontSize: 10, fontWeight: '700', marginTop: 2 },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  participantName: { color: 'white', fontSize: 16, flex: 1 },
  scoreInput: { backgroundColor: '#222', color: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, minWidth: 100, textAlign: 'center', fontSize: 16 },
  submitButton: { backgroundColor: '#D8FF3E', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 40 },
  submitButtonText: { color: '#1a1a1a', fontSize: 20, fontWeight: 'bold' },
});

export default CoachLiveClassScreen; 