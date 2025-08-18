import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthNavigator from './src/navigation/AuthNavigator';
import useNotifications from "./src/utils/useNotifications";

export default function App() {
  const { expoPushToken, notification } = useNotifications();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthNavigator />
        <StatusBar style="light" backgroundColor="#1a1a1a" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
