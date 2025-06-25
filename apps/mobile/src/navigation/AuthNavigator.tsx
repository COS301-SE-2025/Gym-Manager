import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingScreen from '../screens/auth/PendingScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import CoachNavigator from './CoachNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LiveClassScreen from '../screens/classes/LiveClassScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import ResolveAuthScreen from '../screens/auth/ResolveAuthScreen';
import CoachLiveClassScreen from '../screens/coach/CoachLiveClassScreen';
import type { ApiLiveClassResponse } from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/home/LeaderboardScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FAQScreen from '../screens/home/FAQScreen';

export type AuthStackParamList = {
  Home: undefined;
  LiveClass: { classId: number; liveClassData: ApiLiveClassResponse };
  CoachLiveClass: { classId: number; liveClassData: ApiLiveClassResponse };
  RoleSelection: undefined;
  Pending: undefined;
  Coach: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  ResolveAuth: undefined;
  FAQ: undefined;
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
    </Tab.Navigator>
  );
}

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ResolveAuth"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ResolveAuth" component={ResolveAuthScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={MemberTabNavigator} />
      <Stack.Screen name="LiveClass" component={LiveClassScreen} />
      <Stack.Screen name="CoachLiveClass" component={CoachLiveClassScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Coach" component={CoachNavigator} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
    </Stack.Navigator>
  );
} 