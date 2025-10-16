import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import SetWorkoutScreen from '../screens/coach/SetWorkoutScreen';
// import EditWorkoutScreen from '../screens/coach/EditWorkoutScreen';
import CoachLive from '../screens/coach/CoachLiveClassScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import WorkoutHistoryScreen from '../screens/coach/WorkoutHistoryScreen';
import CoachAnalyticsScreen from '../screens/coach/CoachAnalyticsScreen';
import ExerciseSelectScreen from '../screens/coach/ExerciseSelectScreen';

export type CoachTabParamList = {
  CoachHome: undefined;
  History: undefined;
  Profile: undefined;
};

export type CoachStackParamList = {
  CoachTabs: undefined;
  SetWorkout: { classId: number; editMode?: boolean };
  EditWorkout: { workoutId: number };
  CoachLiveClass: { classId: number; liveClassData: any };
  CoachAnalytics: undefined;
  Home: undefined;
  ExerciseSelect: { onSelect?: (name: string) => void; query?: string };
};

const Stack = createStackNavigator<CoachStackParamList>();
const Tab = createBottomTabNavigator<CoachTabParamList>();

function HomeAliasFromCoach({ navigation }: any) {
  useEffect(() => {
    navigation.getParent()?.replace('MemberTabs', { screen: 'Home' });
  }, [navigation]);
  return null;
}

function CoachTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#232323' },
        tabBarActiveTintColor: '#D8FF3E',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="CoachHome"
        component={CoachHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={WorkoutHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const CoachNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="CoachTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CoachTabs" component={CoachTabNavigator} />
      <Stack.Screen name="SetWorkout" component={SetWorkoutScreen} />
      {/* <Stack.Screen name="EditWorkout" component={EditWorkoutScreen} /> */}
      <Stack.Screen name="CoachLiveClass" component={CoachLive} />
      <Stack.Screen name="CoachAnalytics" component={CoachAnalyticsScreen} />
      <Stack.Screen name="ExerciseSelect" component={ExerciseSelectScreen} />
      <Stack.Screen name="Home" component={HomeAliasFromCoach} />
    </Stack.Navigator>
  );
};

export default CoachNavigator;
