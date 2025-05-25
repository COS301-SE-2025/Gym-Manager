import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingScreen from '../screens/auth/PendingScreen';

export type AuthStackParamList = {
  Pending: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Pending"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Pending" component={PendingScreen} />
    </Stack.Navigator>
  );
} 