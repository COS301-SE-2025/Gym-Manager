import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import SetWorkoutScreen from '../screens/coach/SetWorkoutScreen';
import EditWorkoutScreen from '../screens/coach/EditWorkoutScreen';

export type CoachStackParamList = {
  CoachHome: undefined;
  SetWorkout: {
    workout: {
      id: string;
      name: string;
      time: string;
      date: string;
      capacity: string;
      instructor: string;
      description?: string;
      duration?: string;
    };
  };
  EditWorkout: {
    workout: {
      id: string;
      name: string;
      time: string;
      date: string;
      capacity: string;
      instructor: string;
      description?: string;
      duration?: string;
    };
  };
};

const Stack = createStackNavigator<CoachStackParamList>();

export default function CoachNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CoachHome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CoachHome" component={CoachHomeScreen} />
      <Stack.Screen name="SetWorkout" component={SetWorkoutScreen} />
      <Stack.Screen name="EditWorkout" component={EditWorkoutScreen} />
    </Stack.Navigator>
  );
} 