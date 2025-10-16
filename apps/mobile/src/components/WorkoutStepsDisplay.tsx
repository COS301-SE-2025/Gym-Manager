import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

type WorkoutStep = {
  // Keep generic to render gracefully
  round?: number;
  subround?: number;
  title?: string;
  quantityType?: string;
  quantity?: number;
  notes?: string;
};

interface WorkoutStepsDisplayProps {
  steps: WorkoutStep[];
  loading: boolean;
  error: string | null;
}

const workoutStepsDisplay = ({ steps, loading, error }: WorkoutStepsDisplayProps) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#D8FF3E" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (steps.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.muted}>No structured steps available for this workout.</Text>
      </View>
    );
  }

  return (
    <View style={styles.stepsWrap}>
      {steps.map((st, idx) => (
        <View key={idx} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepBadge}>
              {st.round != null ? `R${st.round}` : ''}
              {st.round != null && st.subround != null ? ' • ' : ''}
              {st.subround != null ? `S${st.subround}` : ''}
            </Text>
            <Text style={styles.stepTitle}>{st.title}</Text>
          </View>
          <View style={styles.stepBody}>
            {st.quantity != null && st.quantityType ? (
              <Text style={styles.stepMeta}>
                {st.quantity} {st.quantityType}
              </Text>
            ) : null}
            {st.notes ? <Text style={styles.stepNotes}>{st.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  muted: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
  stepsWrap: {
    gap: 10,
  },
  stepCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    color: '#1a1a1a',
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
    marginRight: 8,
  },
  stepTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  stepBody: {
    gap: 4,
  },
  stepMeta: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNotes: {
    color: '#ccc',
    fontSize: 12,
  },
});

export default workoutStepsDisplay;
