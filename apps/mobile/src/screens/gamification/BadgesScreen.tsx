import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserBadge, BadgeDefinition } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';
import { BadgeCard } from '../../components/gamification/BadgeCard';

export default function BadgesScreen() {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'earned' | 'all'>('earned');

  const loadData = async () => {
    try {
      const [badges, definitions] = await Promise.all([
        gamificationService.getUserBadges(),
        gamificationService.getBadgeDefinitions(),
      ]);
      setUserBadges(badges);
      setAllBadges(definitions);
    } catch (error) {
      console.error('Error loading badges:', error);
      Alert.alert('Error', 'Failed to load badges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getEarnedBadgeIds = () => {
    return new Set(userBadges.map(badge => badge.badgeId));
  };

  const getUnearnedBadges = () => {
    const earnedIds = getEarnedBadgeIds();
    return allBadges.filter(badge => !earnedIds.has(badge.badgeId));
  };

  const renderBadgeItem = ({ item }: { item: UserBadge | BadgeDefinition }) => {
    if (activeTab === 'earned' && 'userBadgeId' in item) {
      return (
        <BadgeCard
          badge={item as UserBadge}
          onPress={() => {
            // Handle badge press
          }}
        />
      );
    } else if (activeTab === 'all' && !('userBadgeId' in item)) {
      const badge = item as BadgeDefinition;
      const isEarned = getEarnedBadgeIds().has(badge.badgeId);
      
      return (
        <View style={[styles.badgeContainer, !isEarned && styles.unearnedBadge]}>
          <View style={styles.badgeHeader}>
            <Ionicons 
              name={gamificationService.getBadgeIcon(badge.badgeType, badge.name) as any} 
              size={32} 
              color={isEarned ? "#D8FF3E" : "#666"} 
              style={styles.badgeIcon} 
            />
            <View style={styles.badgeInfo}>
              <Text style={[styles.badgeName, !isEarned && styles.unearnedText]}>
                {badge.name}
              </Text>
              <Text style={styles.badgePoints}>+{badge.pointsValue} pts</Text>
            </View>
            {isEarned && (
              <View style={styles.earnedIndicator}>
                <Text style={styles.earnedText}>✓</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.badgeDescription, !isEarned && styles.unearnedText]}>
            {badge.description}
          </Text>
          
          <View style={styles.badgeFooter}>
            <View style={styles.typeContainer}>
              <Text style={styles.typeText}>{badge.badgeType}</Text>
            </View>
            {!isEarned && (
              <Text style={styles.lockedText}>Locked</Text>
            )}
          </View>
        </View>
      );
    }
    return null;
  };

  const getDataForActiveTab = () => {
    if (activeTab === 'earned') {
      return userBadges;
    } else {
      return allBadges;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.subtitle}>
          {userBadges.length} of {allBadges.length} badges earned
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earned' && styles.activeTab]}
          onPress={() => setActiveTab('earned')}
        >
          <Text style={[styles.tabText, activeTab === 'earned' && styles.activeTabText]}>
            Earned ({userBadges.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All ({allBadges.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getDataForActiveTab()}
        renderItem={renderBadgeItem}
        keyExtractor={(item) => 
          'userBadgeId' in item 
            ? `earned-${item.userBadgeId}` 
            : `all-${item.badgeId}`
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#D8FF3E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#000',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  badgeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  unearnedBadge: {
    opacity: 0.6,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeIcon: {
    marginRight: 16,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  unearnedText: {
    color: '#666',
  },
  badgePoints: {
    fontSize: 14,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  earnedIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  badgeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  lockedText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
