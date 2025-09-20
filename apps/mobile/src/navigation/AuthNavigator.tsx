import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingScreen from '../screens/auth/PendingScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

import HomeScreen from '../screens/HomeScreen';

import CoachNavigator from './CoachNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

import ForTimeLive from '../screens/classes/ForTimeLiveScreen';
import IntervalLive from '../screens/classes/IntervalLiveScreen';
import AmrapLive from '../screens/classes/AmrapLiveScreen';
import EmomLive from '../screens/classes/EmomLiveScreen';
import Overview from '../screens/classes/OverviewScreen';
import LiveClassEnd from '../screens/classes/LiveClassEndScreen';

import OnboardingScreen from '../screens/auth/OnboardingScreen';
import ResolveAuthScreen from '../screens/auth/ResolveAuthScreen';
import CoachLive from '../screens/coach/CoachLiveClassScreen';

import type { ApiLiveClassResponse } from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/home/LeaderboardScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FAQScreen from '../screens/home/FAQScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PaymentScreen from '../screens/profile/PaymentScreen';
import MemberAnalyticsScreen from '../screens/profile/MemberAnalyticsScreen';

export type AuthStackParamList = {
  MemberTabs: undefined;

  // Member live flow
  Overview: { classId: number; liveClassData?: ApiLiveClassResponse };
  ForTimeLive: { classId: number };
  LiveClassEnd: { classId: number };
  AmrapLive: { classId: number };
  IntervalLive: { classId: number };
  EmomLive: { classId: number };

  // Legacy
  LiveClass?: any;

  // Coach
  CoachLive: { classId: number; liveClassData: ApiLiveClassResponse };

  RoleSelection: undefined;
  Pending: undefined;
  Coach: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  ResolveAuth: undefined;
  FAQ: undefined;
  Payment: undefined;
  MemberAnalytics: undefined;
};


const Stack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();

function MemberTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#232323' },
        tabBarActiveTintColor: '#D8FF3E',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Alias screen so legacy calls to navigation.navigate('Home') keep working.
 * It immediately redirects to the MemberTabs → Home tab.
 */
function HomeAliasScreen({ navigation }: any) {
  useEffect(() => {
    // Use replace to avoid building up an extra layer on the stack
    navigation.replace('MemberTabs', { screen: 'Home' });
  }, [navigation]);
  return null;
}

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ResolveAuth"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ResolveAuth" component={ResolveAuthScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      <Stack.Screen name="MemberTabs" component={MemberTabNavigator} />
      <Stack.Screen name="Home" component={HomeAliasScreen} />

      <Stack.Screen name="Overview" component={Overview} />
      <Stack.Screen name="ForTimeLive" component={ForTimeLive} />
      <Stack.Screen name="EmomLive" component={EmomLive} />
      <Stack.Screen name="AmrapLive" component={AmrapLive} />
      <Stack.Screen name="IntervalLive" component={IntervalLive} />
      <Stack.Screen name="LiveClassEnd" component={LiveClassEnd} />
      <Stack.Screen name="CoachLive" component={CoachLive} />

      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Coach" component={CoachNavigator} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="MemberAnalytics" component={MemberAnalyticsScreen} />
    </Stack.Navigator>
  );
}
