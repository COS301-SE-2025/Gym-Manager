import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingScreen from '../screens/auth/PendingScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

export type AuthStackParamList = {
  RoleSelection: undefined;
  Pending: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RoleSelection"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
    </Stack.Navigator>
  );
} 