import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingScreen from '../screens/auth/PendingScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import CoachNavigator from './CoachNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LiveClassScreen from '../screens/classes/LiveClassScreen';

export type AuthStackParamList = {
  Home: undefined;
  LiveClass: { classId: number };
  RoleSelection: undefined;
  Pending: undefined;
  Coach: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LiveClass" component={LiveClassScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Coach" component={CoachNavigator} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
} 