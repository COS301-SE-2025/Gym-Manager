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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import IconLogo from '../../components/common/IconLogo';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';

const { width } = Dimensions.get('window');

type CoachHomeScreenProps = StackScreenProps<CoachStackParamList, 'CoachHome'>;

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
}

export default function CoachHomeScreen({ navigation }: CoachHomeScreenProps) {
  const [setWorkoutsData, setSetWorkoutsData] = useState<WorkoutItem[]>([]);
  const [yourClassesData, setYourClassesData] = useState<WorkoutItem[]>([]);
  const [isLoadingSetWorkouts, setIsLoadingSetWorkouts] = useState<boolean>(true);
  const [isLoadingYourClasses, setIsLoadingYourClasses] = useState<boolean>(true);
  const [setWorkoutsError, setSetWorkoutsError] = useState<string | null>(null);
  const [yourClassesError, setYourClassesError] = useState<string | null>(null);

  const fetchCoachClasses = async () => {
    setIsLoadingSetWorkouts(true);
    setIsLoadingYourClasses(true);
    setSetWorkoutsError(null);
    setYourClassesError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.get<ApiCoachClass[]>(
        'http://localhost:4000/coach/assignedClasses',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Transform API data to WorkoutItem format
      const transformedClasses: WorkoutItem[] = response.data.map(apiClass => ({
        id: apiClass.classId.toString(),
        name: apiClass.workoutName || 'Setup Workout',
        time: apiClass.scheduledTime ? 
          new Date(`1970-01-01T${apiClass.scheduledTime}Z`).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          }) : 'N/A',
        date: apiClass.scheduledDate ? 
          new Date(apiClass.scheduledDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }) : 'N/A',
        capacity: `0/${apiClass.capacity}`, // Placeholder for current bookings
        instructor: 'You', // Since these are coach's own classes
      }));

      // Separate classes based on whether they have a workout assigned
      const classesNeedingWorkout = transformedClasses.filter((_, index) => 
        response.data[index].workoutId === null
      );
      const classesWithWorkout = transformedClasses.filter((_, index) => 
        response.data[index].workoutId !== null
      );

      setSetWorkoutsData(classesNeedingWorkout);
      setYourClassesData(classesWithWorkout);

    } catch (error: any) {
      console.error('Failed to fetch coach classes:', error);
      const errorMessage = axios.isAxiosError(error) && error.response?.status === 401
        ? 'Session expired. Please login again.'
        : 'Failed to load your classes.';
      
      setSetWorkoutsError(errorMessage);
      setYourClassesError(errorMessage);
    } finally {
      setIsLoadingSetWorkouts(false);
      setIsLoadingYourClasses(false);
    }
  };

  useEffect(() => {
    fetchCoachClasses();
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from SetWorkoutScreen)
  useFocusEffect(
    React.useCallback(() => {
      fetchCoachClasses();
    }, [])
  );

  const handleSetWorkout = (workoutId: string) => {
    const workout = setWorkoutsData.find(w => w.id === workoutId);
    if (workout) {
      navigation.navigate('SetWorkout', {
        workout: {
          ...workout,
          description: '',
          duration: '60 minutes',
        }
      });
    }
  };

  const handleEditWorkout = (workoutId: string) => {
    const workout = yourClassesData.find(w => w.id === workoutId);
    if (workout) {
      navigation.navigate('EditWorkout', {
        workout: {
          ...workout,
          description: 'High-intensity workout focusing on strength and endurance training.',
          duration: '60 minutes',
        }
      });
    }
  };

  const renderSetWorkoutCard = (workout: WorkoutItem) => (
    <View key={workout.id} style={styles.setWorkoutCard}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutDateInfo}>
          <Text style={styles.workoutDate}>{workout.date}</Text>
          <Text style={styles.workoutTime}>{workout.time}</Text>
        </View>
        {/*<Text style={styles.workoutCapacity}>{workout.capacity}</Text> */}
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
        <View style={styles.classDateInfo}>
          <Text style={styles.classDate}>{workout.date}</Text>
          <Text style={styles.classTime}>{workout.time}</Text>
        </View>
       {/*<Text style={styles.workoutCapacity}>{workout.capacity}</Text> */}
      </View>
      
      <View style={styles.classContent}>
        <View style={styles.classDetails}>
          {/*<Text style={styles.classInstructorName}>{workout.instructor}</Text> */}
          <Text style={styles.className}>{workout.name}</Text>
        </View>
        {/*<TouchableOpacity 
          style={styles.editWorkoutButton}
          onPress={() => handleEditWorkout(workout.id)}
        >
          <Text style={styles.editWorkoutButtonText}>Edit Workout</Text>
        </TouchableOpacity> */}
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
          <Text style={styles.welcomeText}>Hey, Coach 👋</Text>
          <TouchableOpacity style={styles.switchButton}>
            <View style={styles.switchIcon}>
              <View style={styles.switchTrack}>
                <View style={styles.switchThumb} />
              </View>
            </View>
            <Text style={styles.switchText}>Switch Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.sectionTitle}>Your Classes</Text>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  welcomeContainer: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  switchIcon: {
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#333',
    justifyContent: 'center',
    padding: 2,
  },
  switchTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 1,
  },
  switchThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D8FF3E',
    shadowColor: '#D8FF3E',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  switchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  setWorkoutsContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  setWorkoutsScrollView: {
    marginHorizontal: -20,
    paddingLeft: 20,
  },
  setWorkoutCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D8FF3E',
    padding: 16,
    width: width * 0.75,
    height: 150,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutDateInfo: {
    flex: 1,
  },
  workoutDate: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
  },
  workoutTime: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  workoutCapacity: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  workoutDetails: {
    flex: 1,
  },
  instructorName: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  workoutName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  setWorkoutButton: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  setWorkoutButtonText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWorkoutCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    width: width * 0.75,
    height: 150,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWorkoutButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWorkoutText: {
    color: '#888',
    fontSize: 24,
    fontWeight: '300',
  },
  yourClassesContainer: {
    gap: 12,
  },
  yourClassCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classDateInfo: {
    flex: 1,
  },
  classDate: {
    color: '#888',
    fontSize: 12,
  },
  classTime: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  classCapacity: {
    color: '#888',
    fontSize: 12,
  },
  classContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  classDetails: {
    flex: 1,
  },
  classInstructorName: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  className: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editWorkoutButton: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editWorkoutButtonText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
}); 