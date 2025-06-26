import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconLogo from '../../components/common/IconLogo';
import { getUser, User, removeToken, removeUser } from '../../utils/authStorage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<AuthStackParamList>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const [isLeaderboardPublic, setIsLeaderboardPublic] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const toggleLeaderboardVisibility = () => {
    setIsLeaderboardPublic(!isLeaderboardPublic);
  };

  const handleLogout = async () => {
    try {
      // Clear stored authentication data
      await removeToken();
      await removeUser();
      
      // Navigate back to login screen
      navigation.navigate('Login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleContactSupport = async () => {
    const email = 'support@trainwise.co.za';
    const subject = 'Support Request - TrainWise App';
    const body = 'Hi TrainWise Support Team,\n\nI need assistance with:\n\n[Please describe your issue here]\n\nThank you for your help!';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Not Available',
          'No email app is configured on your device. Please email us at support@trainwise.co.za',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert(
        'Error',
        'Unable to open email app. Please contact us at support@trainwise.co.za',
        [{ text: 'OK' }]
      );
    }
  };

  const getInitials = () => {
    if (!currentUser?.firstName || !currentUser?.lastName) {
      return 'U';
    }
    return `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`;
  };

  const getFullName = () => {
    if (!currentUser?.firstName || !currentUser?.lastName) {
      return 'User';
    }
    return `${currentUser.firstName} ${currentUser.lastName}`;
  };

  const getMembershipType = () => {
    if (!currentUser?.roles || currentUser.roles.length === 0) {
      return 'Member';
    }
    
    const roles = currentUser.roles;
    const isCoach = roles.includes('coach');
    const isMember = roles.includes('member');
    
    if (isCoach && isMember) {
      return 'Coach • Member';
    } else if (isCoach) {
      return 'Coach';
    } else if (isMember) {
      return 'Member';
    }
    
    // Fallback for other roles
    return roles[0].charAt(0).toUpperCase() + roles[0].slice(1);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <IconLogo width={50} height={46} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {getInitials()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {getFullName()}
              </Text>
              <Text style={styles.profileEmail}>{currentUser?.email || 'No email available'}</Text>
              <View style={styles.membershipBadge}>
                <Text style={styles.membershipText}>{getMembershipType()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {/* Leaderboard Privacy */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="trophy-outline" size={24} color="#D8FF3E" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Public Leaderboard</Text>
                <Text style={styles.settingDescription}>
                  Show your scores on public leaderboards
                </Text>
              </View>
            </View>
            <Switch
              value={isLeaderboardPublic}
              onValueChange={toggleLeaderboardVisibility}
              trackColor={{ false: '#333', true: '#D8FF3E' }}
              thumbColor={isLeaderboardPublic ? '#1a1a1a' : '#888'}
            />
          </View>

          {/* Role Swap - Only show if user has multiple roles */}
          {currentUser?.roles && currentUser.roles.length > 1 && (
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('RoleSelection')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="swap-horizontal-outline" size={24} color="#D8FF3E" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Switch Role</Text>
                  <Text style={styles.settingDescription}>
                    Change between your available roles
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingItem}  onPress={() => navigation.navigate('FAQ')}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#D8FF3E" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Help & FAQ</Text>
                <Text style={styles.settingDescription}>
                  Get help and find answers
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleContactSupport}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={24} color="#D8FF3E" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Contact Support</Text>
                <Text style={styles.settingDescription}>
                  Get in touch with our team
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D8FF3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#1a1a1a',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#888',
    fontSize: 16,
    marginBottom: 8,
  },
  membershipBadge: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membershipText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: '#D8FF3E',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    color: '#888',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 