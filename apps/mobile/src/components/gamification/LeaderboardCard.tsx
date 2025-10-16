import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LeaderboardEntry } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  rank: number;
  onPress?: () => void;
  type: 'streak' | 'points';
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, rank, onPress, type }) => {
  const { user, streak } = entry;
  const displayValue = type === 'streak' ? streak.currentStreak : streak.totalPoints;
  const displayText =
    type === 'streak' ? `${displayValue} days` : gamificationService.formatPointsText(displayValue);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return '#888';
    }
  };

  const getRankEmoji = (rank: number) => {
    return `#${rank}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, { color: getRankColor(rank) }]}>{getRankEmoji(rank)}</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.userLevel}>Level {streak.level}</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.mainStat}>{displayText}</Text>
        <Text style={styles.subStat}>
          {type === 'streak'
            ? `${streak.totalWorkouts} workouts`
            : `${streak.currentStreak} day streak`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  userLevel: {
    fontSize: 12,
    color: '#888',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  mainStat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D8FF3E',
    marginBottom: 2,
  },
  subStat: {
    fontSize: 12,
    color: '#888',
  },
});
