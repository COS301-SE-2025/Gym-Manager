import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type ResolveAuthScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResolveAuth'>;

interface ResolveAuthScreenProps {
  navigation: ResolveAuthScreenNavigationProp;
}

export interface UserStatus {
  userId: number;
  roles: string[];
  membershipStatus: string;
}

export const getUserStatus = async (): Promise<UserStatus> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get<UserStatus>(`${config.BASE_URL}/auth/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch user status:', error);
    throw error;
  }
};

const ResolveAuthScreen = ({ navigation }: ResolveAuthScreenProps) => {
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (!hasCompletedOnboarding) {
          navigation.replace('Onboarding');
          return;
        }

        const token = await getToken();
        if (!token) {
          navigation.replace('Login');
          return;
        }

        // Check if user is pending
        try {
          const userStatus = await getUserStatus();
          if (userStatus.membershipStatus === 'pending') {
            navigation.replace('Pending');
            return;
          }
        } catch (statusError) {
          console.error('Failed to check user status:', statusError);
          // Continue with normal flow if status check fails
        }

        navigation.replace('Login');
      } catch (error) {
        console.error('Failed to get auth status:', error);
        navigation.replace('Onboarding');
      }
    };

    checkAuthStatus();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color="#D8FF3E" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ResolveAuthScreen;
