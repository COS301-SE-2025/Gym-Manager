import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserBadge } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';

interface BadgeCardProps {
  badge: UserBadge;
  onPress?: () => void;
  compact?: boolean;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onPress, compact = false }) => {
  const badgeIconName = gamificationService.getBadgeIcon(
    badge.badge?.badgeType || 'achievement',
    badge.badge?.name
  );
  const earnedDate = new Date(badge.earnedAt).toLocaleDateString();

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={badgeIconName as any} size={24} color="#D8FF3E" style={styles.compactIcon} />
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>
            {badge.badge?.name || 'Unknown Badge'}
          </Text>
          <Text style={styles.compactDate}>{earnedDate}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Ionicons name={badgeIconName as any} size={32} color="#D8FF3E" style={styles.icon} />
        <View style={styles.badgeInfo}>
          <Text style={styles.name}>{badge.badge?.name || 'Unknown Badge'}</Text>
          <Text style={styles.points}>+{badge.badge?.pointsValue || 0} pts</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {badge.badge?.description || 'No description available'}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.earnedDate}>Earned {earnedDate}</Text>
        <View style={styles.typeContainer}>
          <Text style={styles.typeText}>{badge.badge?.badgeType || 'achievement'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  compactDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 16,
  },
  badgeInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  points: {
    fontSize: 14,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earnedDate: {
    fontSize: 12,
    color: '#888',
  },
  typeContainer: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
