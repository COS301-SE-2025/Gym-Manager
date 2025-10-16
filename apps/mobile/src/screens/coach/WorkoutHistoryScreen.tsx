import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import CoachHistorySheet from '../../components/CoachHistorySheet';

type ApiClassWithWorkout = {
  classId: number;
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:mm:ss'
  workoutId: number | null;
  workoutName?: string | null;
};

type WorkoutSummary = {
  workoutId: number;
  workoutName: string;
  uses: number;
  lastUsed: string; // ISO date
};

export default function WorkoutHistoryScreen() {
  const [classes, setClasses] = useState<ApiClassWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ApiClassWithWorkout | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiClassWithWorkout[]>('/coach/classes-with-workouts');

      // only include classes that actually have a workout assigned
      const items = res.data.filter((c) => c.workoutId != null);
      // newest first
      items.sort((a, b) => {
        const da = new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime();
        const db = new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime();
        return db - da;
      });

      setClasses(items);
    } catch (e: any) {
      setError('Failed to load workout history.');
      console.error('WorkoutHistory fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openSheet = (item: ApiClassWithWorkout) => {
    setSelectedClass(item);
    setSheetVisible(true);
  };

  const renderItem = ({ item }: { item: ApiClassWithWorkout }) => {
    const dt = new Date(`${item.scheduledDate}T${item.scheduledTime}`);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          <Text style={s.workoutName}>{item.workoutName || 'Workout'}</Text>
        </View>
        <Text style={s.subtle}>
          {dateStr} • {timeStr}
        </Text>
        <Text style={s.subtle}>Class ID #{item.classId}</Text>

        <Text style={s.viewDetails} onPress={() => openSheet(item)}>
          View details
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Workout History</Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: 24 }}>
          <ActivityIndicator color="#D8FF3E" />
        </View>
      ) : error ? (
        <Text style={s.error}>{error}</Text>
      ) : classes.length === 0 ? (
        <Text style={s.empty}>No workouts found.</Text>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(c) => String(c.classId)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
          }
        />
      )}

      {/* Bottom Sheet */}
      <CoachHistorySheet
        visible={sheetVisible}
        classItem={selectedClass}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#232323',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutName: { color: 'white', fontSize: 16, fontWeight: '600' },
  subtle: { color: '#888', fontSize: 12, marginTop: 2 },
  pill: {
    color: '#1a1a1a',
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  viewDetails: { color: '#D8FF3E', marginTop: 10, fontSize: 13, fontWeight: '700' },
  error: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', padding: 16 },
  empty: { color: '#888', fontSize: 14, textAlign: 'center', padding: 16 },
});
