import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import SetWorkoutScreen from '../screens/coach/SetWorkoutScreen';
import EditWorkoutScreen from '../screens/coach/EditWorkoutScreen';
import CoachLiveClassScreen from '../screens/coach/CoachLiveClassScreen';

export type CoachStackParamList = {
  CoachHome: undefined;
  SetWorkout: { classId: number };
  EditWorkout: { workoutId: number };
  CoachLiveClass: undefined;
};

const Stack = createStackNavigator<CoachStackParamList>();

const CoachNavigator = () => {
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
      <Stack.Screen name="CoachLiveClass" component={CoachLiveClassScreen} />
    </Stack.Navigator>
  );
};

export default CoachNavigator; 