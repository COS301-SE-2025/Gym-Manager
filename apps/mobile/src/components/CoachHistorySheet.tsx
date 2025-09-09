import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import config from '../config';
import { getToken } from '../utils/authStorage';

const { height } = Dimensions.get('window');

type ClassWithWorkout = {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  workoutId: number | null;
  workoutName?: string | null;
};

type WorkoutStep = {
  // Keep generic to render gracefully
  round?: number;
  subround?: number;
  title?: string;
  quantityType?: string;
  quantity?: number;
  notes?: string;
};

interface CoachHistorySheetProps {
  visible: boolean;
  classItem: ClassWithWorkout | null;
  onClose: () => void;
}

export default function CoachHistorySheet({ visible, classItem, onClose }: CoachHistorySheetProps) {
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

      // API returns { steps: FlatStep[] } like member Overview
      const arr = Array.isArray(data?.steps) ? data.steps : Array.isArray(data) ? data : [];
      const normalized: WorkoutStep[] = arr.map((d: any) => ({
        round: d.round ?? d.roundNumber ?? undefined,
        subround: d.subround ?? d.subroundNumber ?? undefined,
        title: d.name ?? d.title ?? d.exerciseName ?? 'Step',
        // handle both reps/duration shapes
        quantityType: d.reps != null ? 'reps' : (d.duration != null ? 'sec' : (d.quantityType ?? undefined)),
        quantity: d.reps ?? d.duration ?? d.quantity ?? undefined,
        notes: d.notes,
      }));

      setSteps(normalized);
    } catch (e: any) {
      console.error('CoachHistorySheet steps load error:', e);
      setErr('Failed to load workout details.');
    } finally {
      setLoading(false);
    }
  };

  if (!classItem) return null;

  const dt = new Date(`${classItem.scheduledDate}T${classItem.scheduledTime}`);
  const dateStr = dt.toLocaleDateString();
  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={s.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[s.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <ScrollView contentContainerStyle={s.content}>
            {/* Header */}
            <View style={s.headerRow}>
              <Text style={s.title}>{classItem.workoutName || 'Workout'}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>Class #{classItem.classId}</Text>
              </View>
            </View>

            {/* Class details */}
            <View style={s.details}>
              <View style={s.detailCol}>
                <Text style={s.label}>Date</Text>
                <Text style={s.value}>{dateStr}</Text>
              </View>
              <View style={s.detailCol}>
                <Text style={s.label}>Time</Text>
                <Text style={s.value}>{timeStr}</Text>
              </View>
            </View>

            <View style={s.details}>
              <View style={s.detailCol}>
                <Text style={s.label}>Instructor</Text>
                <Text style={s.value}>You</Text>
              </View>
              <View style={s.detailCol}>
                <Text style={s.label}>Workout ID</Text>
                <Text style={s.value}>{classItem.workoutId ?? '-'}</Text>
              </View>
            </View>

            {/* Workout details */}
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <Text style={s.sectionTitle}>Workout details</Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#D8FF3E" />
            ) : err ? (
              <Text style={s.error}>{err}</Text>
            ) : steps.length === 0 ? (
              <Text style={s.muted}>No structured steps available for this workout.</Text>
            ) : (
              <View style={s.stepsWrap}>
                {steps.map((st, idx) => (
                  <View key={idx} style={s.stepCard}>
                    <View style={s.stepHeader}>
                      <Text style={s.stepBadge}>
                        {st.round != null ? `R${st.round}` : ''}{st.round != null && st.subround != null ? ' • ' : ''}{st.subround != null ? `S${st.subround}` : ''}
                      </Text>
                      <Text style={s.stepTitle}>{st.title}</Text>
                    </View>
                    <View style={s.stepBody}>
                      {st.quantity != null && st.quantityType ? (
                        <Text style={s.stepMeta}>{st.quantity} {st.quantityType}</Text>
                      ) : null}
                      {st.notes ? <Text style={s.stepNotes}>{st.notes}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheetContainer: { backgroundColor: '#2a2a2a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.8, paddingBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  title: { color: 'white', fontSize: 22, fontWeight: '800', flex: 1, paddingRight: 8 },
  badge: { backgroundColor: '#D8FF3E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#1a1a1a', fontSize: 12, fontWeight: '800' },
  details: { flexDirection: 'row', marginBottom: 12 },
  detailCol: { flex: 1, marginRight: 16 },
  label: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { color: 'white', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '800' },
  muted: { color: '#aaa', fontSize: 13 },
  error: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  stepsWrap: { gap: 10 },
  stepCard: { backgroundColor: '#1f1f1f', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2e2e2e' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepBadge: { color: '#1a1a1a', backgroundColor: '#D8FF3E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: '800', marginRight: 8 },
  stepTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  stepBody: { gap: 4 },
  stepMeta: { color: '#D8FF3E', fontSize: 12, fontWeight: '700' },
  stepNotes: { color: '#ccc', fontSize: 12 },
  closeBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#D8FF3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  closeBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },
});