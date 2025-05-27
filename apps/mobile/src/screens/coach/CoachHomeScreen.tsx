import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import IconLogo from '../../components/common/IconLogo';
import { CoachStackParamList } from '../../navigation/CoachNavigator';

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

export default function CoachHomeScreen({ navigation }: CoachHomeScreenProps) {
  const setWorkouts: WorkoutItem[] = [
    {
      id: '1',
      name: 'Workout 1',
      time: '5:45AM',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'Vansh Sood',
    },
  ];

  const yourClasses: WorkoutItem[] = [
    {
      id: '1',
      name: 'Workout 1',
      time: '5:45AM',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'Vansh Sood',
    },
    {
      id: '2',
      name: 'Workout 1',
      time: '5:45AM',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'Vansh Sood',
    },
    {
      id: '3',
      name: 'Workout 1',
      time: '5:45AM',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'Vansh Sood',
    },
    {
      id: '4',
      name: 'Workout 1',
      time: '5:45AM',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'Vansh Sood',
    },
  ];

  const handleSetWorkout = (workoutId: string) => {
    const workout = setWorkouts.find(w => w.id === workoutId);
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
    const workout = yourClasses.find(w => w.id === workoutId);
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
        <Text style={styles.workoutCapacity}>{workout.capacity}</Text>
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
        <Text style={styles.classCapacity}>{workout.capacity}</Text>
      </View>
      
      <View style={styles.classContent}>
        <View style={styles.classDetails}>
          <Text style={styles.classInstructorName}>{workout.instructor}</Text>
          <Text style={styles.className}>{workout.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editWorkoutButton}
          onPress={() => handleEditWorkout(workout.id)}
        >
          <Text style={styles.editWorkoutButtonText}>Edit Workout</Text>
        </TouchableOpacity>
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setWorkoutsContainer}
            style={styles.setWorkoutsScrollView}
          >
            {setWorkouts.map(renderSetWorkoutCard)}
          </ScrollView>
        </View>

        {/* Your Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Classes</Text>
          <View style={styles.yourClassesContainer}>
            {yourClasses.map(renderYourClassCard)}
          </View>
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
}); 