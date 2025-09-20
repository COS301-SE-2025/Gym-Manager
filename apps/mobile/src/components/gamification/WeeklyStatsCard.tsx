import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeeklyStats } from '../../types/gamification';

interface WeeklyStatsCardProps {
  weeklyStats: WeeklyStats;
}

export const WeeklyStatsCard: React.FC<WeeklyStatsCardProps> = ({ weeklyStats }) => {
  const { workoutsThisWeek, pointsThisWeek, streakDays } = weeklyStats;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Week</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workoutsThisWeek}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pointsThisWeek}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{streakDays}</Text>
          <Text style={styles.statLabel}>Streak Days</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(100, (workoutsThisWeek / 7) * 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {workoutsThisWeek}/7 workouts this week
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b35',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
