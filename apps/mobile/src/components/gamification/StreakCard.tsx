import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserStreak } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';

interface StreakCardProps {
  streak: UserStreak;
  onPress?: () => void;
  compact?: boolean;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak, onPress, compact = false }) => {
  const streakEmoji = gamificationService.getStreakEmoji(streak.currentStreak);
  const streakText = gamificationService.formatStreakText(streak.currentStreak);
  const pointsText = gamificationService.formatPointsText(streak.totalPoints);
  const levelProgress = gamificationService.getLevelProgress(streak.level, streak.totalPoints);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactContent}>
          <Text style={styles.compactEmoji}>{streakEmoji}</Text>
          <View style={styles.compactTextContainer}>
            <Text style={styles.compactStreakText}>{streak.currentStreak}</Text>
            <Text style={styles.compactLabel}>day streak</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{streakEmoji}</Text>
        <View style={styles.streakInfo}>
          <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{streak.longestStreak}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{streak.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pointsText}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <View style={styles.levelContainer}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelText}>Level {streak.level}</Text>
          <Text style={styles.progressText}>
            {levelProgress.pointsInCurrent}/{levelProgress.pointsToNext + levelProgress.pointsInCurrent} XP
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${levelProgress.progressPercentage}%` }
            ]} 
          />
        </View>
      </View>
    </TouchableOpacity>
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
  compactContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactStreakText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  compactLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 32,
    marginRight: 16,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  levelContainer: {
    marginTop: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressText: {
    fontSize: 12,
    color: '#888',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D8FF3E',
    borderRadius: 3,
  },
});
