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
  workoutType?: string;
  workoutMetadata?: any;
  durationMinutes?: number;
  capacity?: number;
  bookingsCount?: number;
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
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set());

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

  const toggleExpanded = (workoutId: number) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  const formatWorkoutMetadata = (metadata: any, workoutType: string) => {
    if (!metadata) return null;
    
    const details = [];
    
    // Duration for FOR_TIME and AMRAP
    if ((workoutType === 'FOR_TIME' || workoutType === 'AMRAP') && metadata.time_limit) {
      details.push(`Duration: ${metadata.time_limit} minutes`);
    }
    
    // Number of rounds for FOR_TIME and TABATA
    if ((workoutType === 'FOR_TIME' || workoutType === 'TABATA') && metadata.number_of_rounds) {
      details.push(`Rounds: ${metadata.number_of_rounds}`);
    }
    
    // Number of subrounds
    if (metadata.number_of_subrounds) {
      details.push(`Sub-rounds: ${metadata.number_of_subrounds}`);
    }
    
    // EMOM repeats
    if (workoutType === 'EMOM' && metadata.emom_repeats && Array.isArray(metadata.emom_repeats)) {
      details.push(`EMOM repeats: ${metadata.emom_repeats.join(', ')}`);
    }
    
    return details;
  };

  const renderWorkoutItem = ({ item }: { item: ApiClassWithWorkout }) => {
    const dt = new Date(`${item.scheduledDate}T${item.scheduledTime}`);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isExpanded = expandedWorkouts.has(item.workoutId!);
    const metadataDetails = formatWorkoutMetadata(item.workoutMetadata, item.workoutType || '');
    
    return (
      <View style={styles.workoutCard}>
        <TouchableOpacity 
          style={styles.workoutHeader}
          onPress={() => handleSelectWorkout(item)}
        >
          <View style={styles.workoutHeaderContent}>
            <Text style={styles.workoutName}>{item.workoutName}</Text>
            <View style={styles.workoutBadge}>
              <Text style={styles.workoutBadgeText}>#{item.workoutId}</Text>
            </View>
          </View>
          <Text style={styles.workoutDate}>{dateStr} • {timeStr}</Text>
          <Text style={styles.workoutClassId}>Class ID #{item.classId}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => toggleExpanded(item.workoutId!)}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Text>
          <Text style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}>
            ▼
          </Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.workoutDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Workout Type:</Text>
              <Text style={styles.detailValue}>{item.workoutType || 'N/A'}</Text>
            </View>
            
            {item.durationMinutes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class Duration:</Text>
                <Text style={styles.detailValue}>{item.durationMinutes} minutes</Text>
              </View>
            )}
            
            {item.capacity && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Capacity:</Text>
                <Text style={styles.detailValue}>{item.capacity} people</Text>
              </View>
            )}
            
            {item.bookingsCount !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bookings:</Text>
                <Text style={styles.detailValue}>{item.bookingsCount} / {item.capacity || 'N/A'}</Text>
              </View>
            )}
            
            {metadataDetails && metadataDetails.length > 0 && (
              <View style={styles.metadataSection}>
                <Text style={styles.metadataTitle}>Workout Details:</Text>
                {metadataDetails.map((detail, index) => (
                  <Text key={index} style={styles.metadataDetail}>• {detail}</Text>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => handleSelectWorkout(item)}
            >
              <Text style={styles.selectButtonText}>Load This Workout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  workoutHeader: {
    padding: 16,
  },
  workoutHeaderContent: {
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
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  expandButtonText: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '500',
  },
  expandIcon: {
    color: '#D8FF3E',
    fontSize: 12,
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  workoutDetails: {
    padding: 16,
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  metadataTitle: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  metadataDetail: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 8,
  },
  selectButton: {
    backgroundColor: '#D8FF3E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  selectButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
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
