import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import config from '../config';
import { getToken } from '../utils/authStorage';

const { height } = Dimensions.get('window');

type ClassWithWorkout = {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  coachFirstName: string;
  coachLastName: string;
  workoutName: string;
  workoutId?: number | null;
  workoutType?: string;
};

type WorkoutStep = {
  round?: number;
  subround?: number;
  title?: string;
  quantityType?: string;
  quantity?: number;
  notes?: string;
};

interface ClassDetailsSheetProps {
  visible: boolean;
  classItem: ClassWithWorkout | null;
  onClose: () => void;
}

export default function ClassDetailsSheet({ visible, classItem, onClose }: ClassDetailsSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setErr(null);
      setSteps([]);
      if (classItem?.workoutId) {
        loadWorkoutSteps(classItem.workoutId);
      } else {
        setErr('This class does not have a workout configured yet.');
      }
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const loadWorkoutSteps = async (workoutId: number) => {
    setLoading(true);
    setErr(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Missing token');
      
      const { data } = await axios.get(`${config.BASE_URL}/workout/${workoutId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // API returns { steps: FlatStep[] }
      const arr = Array.isArray(data?.steps) ? data.steps : Array.isArray(data) ? data : [];
      const normalized: WorkoutStep[] = arr.map((d: any) => ({
        round: d.round ?? d.roundNumber ?? undefined,
        subround: d.subround ?? d.subroundNumber ?? undefined,
        title: d.name ?? d.title ?? d.exerciseName ?? 'Exercise',
        quantityType: d.reps != null ? 'reps' : (d.duration != null ? 'sec' : (d.quantityType ?? undefined)),
        quantity: d.reps ?? d.duration ?? d.quantity ?? undefined,
        notes: d.notes,
      }));

      setSteps(normalized);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to load workout details.');
    } finally {
      setLoading(false);
    }
  };

  if (!classItem) return null;

  const dt = new Date(`${classItem.scheduledDate}T${classItem.scheduledTime}`);
  const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={s.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[s.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.headerRow}>
              <View style={s.headerLeft}>
                <Text style={s.title}>{classItem.workoutName || 'Workout'}</Text>
                {classItem.workoutType && (
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>{classItem.workoutType}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeIconButton}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Class Info Cards */}
            <View style={s.infoGrid}>
              <View style={s.infoCard}>
                <View style={s.infoIcon}>
                  <Ionicons name="calendar-outline" size={20} color="#D8FF3E" />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Date</Text>
                  <Text style={s.infoValue}>{dateStr}</Text>
                </View>
              </View>

              <View style={s.infoCard}>
                <View style={s.infoIcon}>
                  <Ionicons name="time-outline" size={20} color="#D8FF3E" />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Time</Text>
                  <Text style={s.infoValue}>{timeStr}</Text>
                </View>
              </View>

              <View style={s.infoCard}>
                <View style={s.infoIcon}>
                  <Ionicons name="person-outline" size={20} color="#D8FF3E" />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Coach</Text>
                  <Text style={s.infoValue}>{classItem.coachFirstName} {classItem.coachLastName}</Text>
                </View>
              </View>

              <View style={s.infoCard}>
                <View style={s.infoIcon}>
                  <Ionicons name="hourglass-outline" size={20} color="#D8FF3E" />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Duration</Text>
                  <Text style={s.infoValue}>{classItem.durationMinutes} min</Text>
                </View>
              </View>
            </View>

            {/* Workout Exercises Section */}
            <View style={s.sectionHeader}>
              <Ionicons name="barbell-outline" size={20} color="#D8FF3E" />
              <Text style={s.sectionTitle}>Workout Exercises</Text>
            </View>

            {loading ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator color="#D8FF3E" size="large" />
                <Text style={s.loadingText}>Loading exercises...</Text>
              </View>
            ) : err ? (
              <View style={s.errorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color="#FF6B6B" />
                <Text style={s.errorText}>{err}</Text>
              </View>
            ) : steps.length === 0 ? (
              <View style={s.emptyContainer}>
                <Ionicons name="clipboard-outline" size={40} color="#666" />
                <Text style={s.emptyText}>No exercises available</Text>
                <Text style={s.emptySubtext}>This workout hasn't been configured yet.</Text>
              </View>
            ) : (
              <View style={s.stepsWrap}>
                {steps.map((st, idx) => (
                  <View key={idx} style={s.stepCard}>
                    <View style={s.stepHeader}>
                      {(st.round != null || st.subround != null) && (
                        <View style={s.roundBadge}>
                          <Text style={s.roundBadgeText}>
                            {st.round != null ? `R${st.round}` : ''}{st.round != null && st.subround != null ? ' • ' : ''}{st.subround != null ? `S${st.subround}` : ''}
                          </Text>
                        </View>
                      )}
                      <Text style={s.stepTitle}>{st.title}</Text>
                    </View>
                    <View style={s.stepBody}>
                      {st.quantity != null && st.quantityType ? (
                        <View style={s.quantityContainer}>
                          <Ionicons name="fitness-outline" size={14} color="#D8FF3E" />
                          <Text style={s.stepQuantity}>{st.quantity} {st.quantityType}</Text>
                        </View>
                      ) : null}
                      {st.notes ? (
                        <View style={s.notesContainer}>
                          <Ionicons name="information-circle-outline" size={14} color="#888" />
                          <Text style={s.stepNotes}>{st.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity onPress={onClose} style={s.closeButtonWrapper}>
              <LinearGradient colors={['#D8FF3E', '#B8E02E']} style={s.closeBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.closeBtnText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  backdrop: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)' 
  },
  backdropTouchable: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  sheetContainer: { 
    backgroundColor: '#1a1a1a', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: height * 0.85, 
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#D8FF3E',
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: '#D8FF3E', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginTop: 12, 
    marginBottom: 8 
  },
  content: { 
    paddingHorizontal: 20, 
    paddingBottom: 24 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginTop: 8, 
    marginBottom: 20 
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  title: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: '800',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(216, 255, 62, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8FF3E',
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: '#D8FF3E',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeIconButton: {
    padding: 4,
  },
  infoGrid: {
    marginBottom: 24,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  infoIcon: {
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: { 
    color: '#888', 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 4 
  },
  infoValue: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '800',
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: { 
    color: '#FF6B6B', 
    fontSize: 14, 
    textAlign: 'center', 
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  stepsWrap: { 
    gap: 10 
  },
  stepCard: { 
    backgroundColor: '#2a2a2a', 
    borderRadius: 12, 
    padding: 14,
    borderWidth: 1, 
    borderColor: '#333',
  },
  stepHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  roundBadge: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  roundBadgeText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitle: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700',
    flex: 1,
  },
  stepBody: { 
    gap: 8 
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepQuantity: { 
    color: '#D8FF3E', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#1f1f1f',
    padding: 10,
    borderRadius: 8,
  },
  stepNotes: { 
    color: '#ccc', 
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  closeButtonWrapper: {
    marginTop: 24,
  },
  closeBtn: { 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    shadowColor: '#D8FF3E', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 8 
  },
  closeBtnText: { 
    color: '#1a1a1a', 
    fontSize: 16, 
    fontWeight: '800' 
  },
});

