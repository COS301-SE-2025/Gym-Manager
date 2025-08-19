import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import SetWorkoutScreen from '../screens/coach/SetWorkoutScreen';
import EditWorkoutScreen from '../screens/coach/EditWorkoutScreen';
import CoachLive from '../screens/coach/CoachLiveClassScreen';

export type CoachStackParamList = {
  CoachHome: undefined;
  SetWorkout: { classId: number };
  EditWorkout: { workoutId: number };
  CoachLiveClass: { classId: number; liveClassData: any };

  Home: undefined;
};

const Stack = createStackNavigator<CoachStackParamList>();

function HomeAliasFromCoach({ navigation }: any) {
  useEffect(() => {
    navigation.getParent()?.replace('MemberTabs', { screen: 'Home' });
  }, [navigation]);
  return null;
}

const CoachNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="CoachHome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="CoachHome" component={CoachHomeScreen} />
      <Stack.Screen name="SetWorkout" component={SetWorkoutScreen} />
      <Stack.Screen name="EditWorkout" component={EditWorkoutScreen} />
      <Stack.Screen name="CoachLiveClass" component={CoachLive} />

      {/* alias so navigation.navigate('Home') works even inside the coach stack */}
      <Stack.Screen name="Home" component={HomeAliasFromCoach} />
    </Stack.Navigator>
  );
};

export default CoachNavigator;
