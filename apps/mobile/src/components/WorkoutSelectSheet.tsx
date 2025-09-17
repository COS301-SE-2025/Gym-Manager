import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, ActivityIndicator, FlatList } from 'react-native';
import apiClient from '../utils/apiClient';

const { height } = Dimensions.get('window');

type ApiClassWithWorkout = {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  workoutId: number | null;
  workoutName?: string | null;
};

interface WorkoutSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectWorkout: (workoutId: number, workoutName: string) => void;
}

export default function WorkoutSelectSheet({ visible, onClose, onSelectWorkout }: WorkoutSelectSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState<ApiClassWithWorkout[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      setWorkouts([]);
      loadWorkoutHistory();
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const loadWorkoutHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiClassWithWorkout[]>(
        '/coach/classes-with-workouts'
      );

      // Get unique workouts (by workoutId) and sort by most recent
      const uniqueWorkouts = res.data
        .filter(c => c.workoutId != null && c.workoutName != null)
        .reduce((acc, current) => {
          const existing = acc.find(item => item.workoutId === current.workoutId);
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, [] as ApiClassWithWorkout[])
        .sort((a, b) => {
          const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime();
          const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime();
          return dateB - dateA; // Most recent first
        });

      setWorkouts(uniqueWorkouts);
    } catch (e: any) {
      console.error('WorkoutSelectSheet load error:', e);
      setError('Failed to load workout history.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkout = (workout: ApiClassWithWorkout) => {
    if (workout.workoutId && workout.workoutName) {
      onSelectWorkout(workout.workoutId, workout.workoutName);
      onClose();
    }
  };

  const renderWorkoutItem = ({ item }: { item: ApiClassWithWorkout }) => {
    const dt = new Date(`${item.scheduledDate}T${item.scheduledTime}`);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <TouchableOpacity 
        style={styles.workoutCard}
        onPress={() => handleSelectWorkout(item)}
      >
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutName}>{item.workoutName}</Text>
          <View style={styles.workoutBadge}>
            <Text style={styles.workoutBadgeText}>#{item.workoutId}</Text>
          </View>
        </View>
        <Text style={styles.workoutDate}>{dateStr} • {timeStr}</Text>
        <Text style={styles.workoutClassId}>Class ID #{item.classId}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Load Previous Workout</Text>
            <Text style={styles.subtitle}>Select a workout from your history</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D8FF3E" />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadWorkoutHistory}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : workouts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No previous workouts found</Text>
            </View>
          ) : (
            <FlatList
              data={workouts}
              keyExtractor={(item) => `${item.workoutId}-${item.classId}`}
              renderItem={renderWorkoutItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheetContainer: { 
    backgroundColor: '#2a2a2a', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: height * 0.8,
    paddingBottom: 16 
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: '#555', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginTop: 12, 
    marginBottom: 8 
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  title: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  workoutCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  workoutBadge: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  workoutBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  workoutDate: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  workoutClassId: {
    color: '#888',
    fontSize: 12,
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
