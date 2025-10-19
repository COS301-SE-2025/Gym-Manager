import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthNavigator from './src/navigation/AuthNavigator';
import { View, Text, ActivityIndicator } from 'react-native';
import config from './src/config';
import { Ionicons } from '@expo/vector-icons';
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const testAPI = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${config.BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error('API not responding');
        }
        
        const data = await response.json();
        if (data.db === 'DOWN') {
          setApiError(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('API test failed:', error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    testAPI();
  }, []);


  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#D8FF3E" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  if (apiError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#ff6b35', textAlign: 'center', marginBottom: 10 }}>
          Service Temporarily Unavailable
        </Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>
          Our servers are currently experiencing issues. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthNavigator />
        <StatusBar style="light" backgroundColor="#1a1a1a" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
