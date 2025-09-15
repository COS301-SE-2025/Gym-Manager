import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import IconLogo from '../../components/common/IconLogo';
import { CoachTabParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import { getUser, User } from '../../utils/authStorage';
import type { ApiLiveClassResponse } from '../HomeScreen';
import config from '../../config';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import apiClient from '../../utils/apiClient';

const { width } = Dimensions.get('window');
type CoachHomeNav = CompositeNavigationProp<
  BottomTabScreenProps<CoachTabParamList, 'CoachHome'>['navigation'],
  StackNavigationProp<CoachStackParamList>
  >;
type CoachHomeScreenProps = {navigation: CoachHomeNav}

interface WorkoutItem {
  id: string;
  name: string;
  time: string;
  date: string;
  capacity: string;
  instructor: string;
}

interface ApiCoachClass {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  capacity: number;
  workoutId: number | null;
  coachId: number;
  workoutName?: string;
  durationMinutes?: number;
  coachFirstName?: string;
  coachLastName?: string;
  bookingsCount?: number;
}

const CoachHomeScreen = ({ navigation }: CoachHomeScreenProps) => {
  const [setWorkoutsData, setSetWorkoutsData] = useState<WorkoutItem[]>([]);
  const [yourClassesData, setYourClassesData] = useState<WorkoutItem[]>([]);
  const [isLoadingSetWorkouts, setIsLoadingSetWorkouts] = useState<boolean>(true);
  const [isLoadingYourClasses, setIsLoadingYourClasses] = useState<boolean>(true);
  const [setWorkoutsError, setSetWorkoutsError] = useState<string | null>(null);
  const [yourClassesError, setYourClassesError] = useState<string | null>(null);

  const [liveClass, setLiveClass] = useState<ApiLiveClassResponse | null>(null);
  const [isLoadingLiveClass, setIsLoadingLiveClass] = useState(true);
  const [liveClassError, setLiveClassError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchCoachClasses = async () => {
    setIsLoadingSetWorkouts(true);
    setIsLoadingYourClasses(true);
    setSetWorkoutsError(null);
    setYourClassesError(null);

    try {
      const response = await apiClient.get<ApiCoachClass[]>(
        `/coach/classes-with-workouts`,
      );

      const sortedClasses = response.data.sort((a, b) => {
        const dateTimeA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
        const dateTimeB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });

const now = new Date();

const classesNeedingWorkout: WorkoutItem[] = sortedClasses
  .filter((c) => {
    const classDateTime = new Date(`${c.scheduledDate}T${c.scheduledTime}`);
    return classDateTime >= now && c.workoutId == null;
  })
  .map((c) => ({
    id: c.classId.toString(),
    name: 'Setup Workout',
    time: c.scheduledTime.slice(0, 5),
    date: new Date(`${c.scheduledDate}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    capacity: `${c.bookingsCount ?? 0}/${c.capacity}`,
    instructor: 'You',
  }));

const classesWithWorkout: WorkoutItem[] = sortedClasses
  .filter((c) => {
    const classDateTime = new Date(`${c.scheduledDate}T${c.scheduledTime}`);
    return classDateTime >= now && c.workoutId !== null;
  })
  .map((c) => ({
    id: c.classId.toString(),
    name: c.workoutName || 'Workout Assigned',
    time: c.scheduledTime.slice(0, 5),
    date: new Date(`${c.scheduledDate}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    capacity: `${c.bookingsCount ?? 0}/${c.capacity}`,
    instructor: 'You',
  }));

      setSetWorkoutsData(classesNeedingWorkout);
      setYourClassesData(classesWithWorkout);
    } catch (error: any) {
      console.error('Failed to fetch coach classes:', error);
      const errorMessage =
        axios.isAxiosError(error) && error.response?.status === 401
          ? 'Session expired. Please login again.'
          : 'Failed to load your classes.';

      setSetWorkoutsError(errorMessage);
      setYourClassesError(errorMessage);
    } finally {
      setIsLoadingSetWorkouts(false);
      setIsLoadingYourClasses(false);
    }
  };

  const fetchLiveClass = async () => {
    setIsLoadingLiveClass(true);
    setLiveClassError(null);
    try {
      const response = await apiClient.get<ApiLiveClassResponse>(
        `/live/class`,
      );
      if (response.data?.ongoing && response.data?.class) {
        setLiveClass(response.data);
      } else {
        setLiveClass(null);
      }
    } catch (error) {
      console.error('Coach fetchLiveClass error:', error);
      setLiveClassError('Failed to load live class information.');
      setLiveClass(null);
    } finally {
      setIsLoadingLiveClass(false);
    }
  };

  // Initial load
  useEffect(() => {
    (async () => {
      const user = await getUser();
      setUser(user);
      await Promise.all([fetchLiveClass(), fetchCoachClasses()]);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let interval: ReturnType<typeof setInterval> | undefined;
  
      // run immediately
      fetchLiveClass();
  
      interval = setInterval(fetchLiveClass, 10000);
      return () => {
        if (interval) clearInterval(interval);
      };
    }, []),
  );

  const onRefresh = React.useCallback(async () => {
    await Promise.all([fetchLiveClass(), fetchCoachClasses()]);
  }, []);

  const handleSetWorkout = (workoutId: string) => {
    const workout = setWorkoutsData.find((w) => w.id === workoutId);
    if (workout) {
      navigation.navigate('SetWorkout', { classId: parseInt(workout.id, 10) });
    }
  };

  const renderSetWorkoutCard = (workout: WorkoutItem) => (
    <View key={workout.id} style={styles.setWorkoutCard}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutDateInfo}>
          <Text style={styles.workoutDate}>{workout.date}</Text>
          <Text style={styles.workoutTime}>{workout.time}</Text>
        </View>
        <View style={styles.workoutProgressSection}>
          <Text style={styles.workoutProgress}>{workout.capacity}</Text>
        </View>
      </View>

      <View style={styles.workoutContent}>
        <View style={styles.workoutDetails}>
          <Text style={styles.instructorName}>{workout.instructor}</Text>
          <Text style={styles.workoutName}>{workout.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.setWorkoutButton}
          onPress={() => handleSetWorkout(workout.id)}
        >
          <Text style={styles.setWorkoutButtonText}>Set Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderYourClassCard = (workout: WorkoutItem) => (
    <View key={workout.id} style={styles.yourClassCard}>
      <View style={styles.classHeader}>
        <View style={styles.classDateSection}>
          <Text style={styles.classDate}>{workout.date}</Text>
          <Text style={styles.classTime}>{workout.time}</Text>
        </View>
        <View style={styles.classProgressSection}>
          <Text style={styles.classProgress}>{workout.capacity}</Text>
        </View>
      </View>

      <View style={styles.classContent}>
        <View style={styles.classDetails}>
          <Text style={styles.classInstructor}>{workout.instructor}</Text>
          <Text style={styles.className}>{workout.name}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <IconLogo width={50} height={46} />
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hey, {user?.firstName || 'Coach'} 👋</Text>
          <Text style={styles.subtitleText}>
            {setWorkoutsData.length} class{setWorkoutsData.length === 1 ? '' : 'es'} need a workout set
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#D8FF3E" />
        }
      >
        {/* Live Class Banner */}
        {!isLoadingLiveClass && !liveClassError && liveClass?.ongoing && (
          <TouchableOpacity
            style={styles.liveClassBanner}
            onPress={() =>
              navigation.navigate('CoachLiveClass', {
                classId: liveClass.class.classId,
                liveClassData: liveClass,
              })
            }
          >
            <View style={styles.liveClassLeft}>
              <View style={styles.liveIndicator} />
              <View>
                <Text style={styles.liveLabel}>LIVE CLASS</Text>
                <Text style={styles.liveClassName}>{liveClass.class.workoutName || 'Workout'}</Text>
              </View>
            </View>
            <View style={styles.liveClassRight}>
              <Text style={styles.liveInstructor}>Coach</Text>
              <Text style={styles.liveCapacity}>{liveClass.participants?.length ?? 0}/30</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Optional loading state for clarity */}
        {isLoadingLiveClass && (
          <View style={{ paddingVertical: 10 }}>
            <ActivityIndicator size="small" color="#D8FF3E" />
          </View>
        )}

        {/* Set Workouts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Workouts</Text>
          {isLoadingSetWorkouts ? (
            <ActivityIndicator size="large" color="#D8FF3E" style={{ marginTop: 20 }} />
          ) : setWorkoutsError ? (
            <Text style={styles.errorText}>{setWorkoutsError}</Text>
          ) : setWorkoutsData.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.setWorkoutsContainer}
              style={styles.setWorkoutsScrollView}
            >
              {setWorkoutsData.map(renderSetWorkoutCard)}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No classes need workout assignments</Text>
          )}
        </View>

        {/* Your Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Upcoming Classes</Text>
          {isLoadingYourClasses ? (
            <ActivityIndicator size="large" color="#D8FF3E" style={{ marginTop: 20 }} />
          ) : yourClassesError ? (
            <Text style={styles.errorText}>{yourClassesError}</Text>
          ) : yourClassesData.length > 0 ? (
            <View style={styles.yourClassesContainer}>
              {yourClassesData.map(renderYourClassCard)}
            </View>
          ) : (
            <Text style={styles.emptyText}>No classes with assigned workouts</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  welcomeContainer: { flex: 1, marginLeft: 12 },
  welcomeText: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  switchButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    alignSelf: 'flex-start',
  },
  switchIcon: { width: 24, height: 14, borderRadius: 7, backgroundColor: '#333', justifyContent: 'center', padding: 2 },
  switchTrack: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 1 },
  switchThumb: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D8FF3E', shadowColor: '#D8FF3E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  switchText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scrollContainer: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 15 },
  setWorkoutsContainer: { flexDirection: 'row', paddingRight: 20 },
  setWorkoutsScrollView: { marginHorizontal: -20, paddingLeft: 20 },
  setWorkoutCard: { backgroundColor: '#2a2a2a', borderRadius: 12, borderWidth: 2, borderColor: '#D8FF3E', padding: 16, width: width * 0.75, height: 150, marginRight: 12, justifyContent: 'space-between' },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workoutDateInfo: { flex: 1 },
  workoutDate: { color: '#D8FF3E', fontSize: 12, fontWeight: '500' },
  workoutTime: { color: '#D8FF3E', fontSize: 12, fontWeight: '500', marginTop: 2 },
  workoutProgressSection: { alignItems: 'flex-end' },
  workoutProgress: { color: '#D8FF3E', fontSize: 12, fontWeight: '500' },
  workoutContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subtitleText: { color: '#888', fontSize: 14, fontWeight: '500'},
  workoutDetails: { flex: 1 },
  instructorName: { color: '#888', fontSize: 12, marginBottom: 4 },
  workoutName: { color: 'white', fontSize: 16, fontWeight: '600' },
  setWorkoutButton: { backgroundColor: '#D8FF3E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  setWorkoutButtonText: { color: '#1a1a1a', fontSize: 12, fontWeight: '600' },
  yourClassesContainer: { gap: 12 },
  yourClassCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16 },
  classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  classDateSection: { flex: 1 },
  classDate: { color: '#D8FF3E', fontSize: 12, fontWeight: '500' },
  classTime: { color: '#D8FF3E', fontSize: 12, fontWeight: '500', marginTop: 2 },
  classProgressSection: { alignItems: 'flex-end' },
  classProgress: { color: '#D8FF3E', fontSize: 12, fontWeight: '500' },
  classContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  classDetails: { flex: 1 },
  classInstructor: { color: '#888', fontSize: 12, marginBottom: 4 },
  className: { color: 'white', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  liveClassBanner: {
    backgroundColor: '#D8FF3E', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, marginTop: 10,
  },
  liveClassLeft: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#20C934', marginRight: 12 },
  liveLabel: { color: '#1a1a1a', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  liveClassName: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
  liveClassRight: { alignItems: 'flex-end' },
  liveInstructor: { color: '#1a1a1a', fontSize: 12, fontWeight: '500' },
  liveCapacity: { color: '#1a1a1a', fontSize: 10, fontWeight: '700', marginTop: 2 },
});

export default CoachHomeScreen;
