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
};

const Stack = createStackNavigator<AuthStackParamList>();

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
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LiveClass" component={LiveClassScreen} />
      <Stack.Screen name="CoachLiveClass" component={CoachLiveClassScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Coach" component={CoachNavigator} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
} 