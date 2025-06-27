import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ResolveAuthScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResolveAuth'>;

interface ResolveAuthScreenProps {
  navigation: ResolveAuthScreenNavigationProp;
}

const ResolveAuthScreen = ({ navigation }: ResolveAuthScreenProps) => {
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (hasCompletedOnboarding) {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (error) {
        console.error('Failed to get onboarding status:', error);
        // Default to onboarding if there's an error
        navigation.replace('Onboarding');
      }
    };

    checkOnboardingStatus();
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
