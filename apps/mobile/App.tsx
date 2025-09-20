import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthNavigator from './src/navigation/AuthNavigator';
import { useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';

const { Constants } = require('react-native-health');

export default function App() {

  useEffect(() => {
    if (Platform.OS === 'ios') {
      initializeHealthKit();
    }
  }, []);

  const initializeHealthKit = async () => {
    try {
      const healthKit = NativeModules.RCTAppleHealthKit;
      
      if (healthKit && healthKit.initHealthKit) {
        console.log('Attempting to initialize HealthKit...');
        
        const permissions = {
          permissions: {
            read: [Constants.Permissions.Steps, Constants.Permissions.HeartRate],
            write: [],
          }
        };

        healthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.log('Error initializing HealthKit:', error);
          } else {
            console.log('HealthKit initialized successfully!');
          }
        });
      } else {
        console.log('HealthKit not available');
      }
    } catch (error) {
      console.log('Error in initializeHealthKit:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthNavigator />
        <StatusBar style="light" backgroundColor="#1a1a1a" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
