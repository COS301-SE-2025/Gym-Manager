import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import IconLogo from '../../components/common/IconLogo';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

const { width } = Dimensions.get('window');

interface ClassDetails {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  capacity: number;
  workoutId: number | null;
  coachId: number;
  workoutName?: string;
}

interface Exercise {
  id: string;
  name: string;
  reps: string;
}

interface SubRound {
  id: string;
  name: string;
  exercises: Exercise[];
  isExpanded: boolean;
}

type SetWorkoutScreenProps = StackScreenProps<CoachStackParamList, 'SetWorkout'>;

export default function SetWorkoutScreen({ route, navigation }: SetWorkoutScreenProps) {
  const { classId } = route.params;

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [workoutName, setWorkoutName] = useState('Workout 1');
  const [workoutType, setWorkoutType] = useState('EMOM');
  const [workoutTime, setWorkoutTime] = useState('00:00:00');
  const [numberOfRounds, setNumberOfRounds] = useState('');
  const [numberOfSubRounds, setNumberOfSubRounds] = useState('');
  const [subRounds, setSubRounds] = useState<SubRound[]>([
    {
      id: '1',
      name: 'Sub Round 1',
      exercises: [],
      isExpanded: false,
    },
    {
      id: '2',
      name: 'Sub Round 2',
      exercises: [{ id: '1', name: '', reps: '' }],
      isExpanded: true,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<ClassDetails[]>(
        `${config.BASE_URL}/coach/assignedClasses`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const classData = response.data.find((c) => c.classId === classId);
      if (!classData) {
        throw new Error('Class not found');
      }

      setClassDetails(classData);

      // Pre-fill workout name if it exists
      if (classData.workoutName) {
        setWorkoutName(classData.workoutName);
      }
    } catch (error: any) {
      console.error('Failed to fetch class details:', error);
      const errorMessage =
        axios.isAxiosError(error) && error.response?.status === 401
          ? 'Session expired. Please login again.'
          : 'Failed to load class details.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubRound = (subRoundId: string) => {
    setSubRounds(prev => 
      prev.map(sr => 
        sr.id === subRoundId 
          ? { ...sr, isExpanded: !sr.isExpanded }
          : sr
      )
    );
  };

  const addExercise = (subRoundId: string) => {
    setSubRounds(prev => 
      prev.map(sr => 
        sr.id === subRoundId 
          ? { 
              ...sr, 
              exercises: [...sr.exercises, { 
                id: Date.now().toString(), 
                name: '', 
                reps: '' 
              }]
            }
          : sr
      )
    );
  };

  const updateExercise = (subRoundId: string, exerciseId: string, field: 'name' | 'reps', value: string) => {
    setSubRounds(prev => 
      prev.map(sr => 
        sr.id === subRoundId 
          ? { 
              ...sr, 
              exercises: sr.exercises.map(ex => 
                ex.id === exerciseId 
                  ? { ...ex, [field]: value }
                  : ex
              )
            }
          : sr
      )
    );
  };

  const addSubRound = () => {
    const newId = (subRounds.length + 1).toString();
    setSubRounds(prev => [
      ...prev,
      {
        id: newId,
        name: `Sub Round ${newId}`,
        exercises: [],
        isExpanded: false,
      }
    ]);
  };

  const handleSaveWorkout = async () => {
    // For now, just show a success message
    Alert.alert(
      'Success!',
      'Workout has been set successfully.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !classDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Workout</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load class details'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchClassDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Workout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Top Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoDateSection}>
              <Text style={styles.infoDate}>{formatDate(classDetails.scheduledDate)}</Text>
              <Text style={styles.infoTime}>{formatTime(classDetails.scheduledTime)}</Text>
            </View>
            <View style={styles.infoProgressSection}>
              <Text style={styles.infoProgress}>8/12</Text>
            </View>
          </View>
          <View style={styles.infoDetails}>
            <Text style={styles.infoInstructor}>Vansh Sood</Text>
            <Text style={styles.infoWorkoutName}>{workoutName}</Text>
          </View>
        </View>

        {/* Workout Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Title</Text>
          <TextInput
            style={styles.textInput}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Enter workout name"
            placeholderTextColor="#888"
            editable={!isSaving}
          />
        </View>

        {/* Set Workout Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Workout</Text>
          
          {/* Type of workout */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Type of workout</Text>
            <TouchableOpacity style={styles.dropdownButton}>
              <Text style={styles.dropdownText}>{workoutType}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Time */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Time</Text>
            <TextInput
              style={styles.timeInput}
              value={workoutTime}
              onChangeText={setWorkoutTime}
              placeholder="00:00:00"
              placeholderTextColor="#888"
              editable={!isSaving}
            />
          </View>

          {/* Number of Rounds */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Number of Rounds</Text>
            <TextInput
              style={styles.numberInput}
              value={numberOfRounds}
              onChangeText={setNumberOfRounds}
              placeholder=""
              placeholderTextColor="#888"
              keyboardType="numeric"
              editable={!isSaving}
            />
          </View>

          {/* Number of Sub Rounds */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Number of Sub Rounds</Text>
            <TextInput
              style={styles.numberInput}
              value={numberOfSubRounds}
              onChangeText={setNumberOfSubRounds}
              placeholder=""
              placeholderTextColor="#888"
              keyboardType="numeric"
              editable={!isSaving}
            />
          </View>
        </View>

        {/* Sub Rounds Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sub Rounds</Text>
          
          {subRounds.map((subRound) => (
            <View key={subRound.id} style={styles.subRoundContainer}>
              <TouchableOpacity 
                style={styles.subRoundHeader}
                onPress={() => toggleSubRound(subRound.id)}
              >
                <Text style={styles.subRoundTitle}>{subRound.name}</Text>
                <Text style={styles.subRoundArrow}>
                  {subRound.isExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              
              {subRound.isExpanded && (
                <View style={styles.subRoundContent}>
                  {subRound.exercises.map((exercise) => (
                    <View key={exercise.id} style={styles.exerciseRow}>
                      <TextInput
                        style={styles.exerciseInput}
                        value={exercise.name}
                        onChangeText={(value) => updateExercise(subRound.id, exercise.id, 'name', value)}
                        placeholder="Input Exercise"
                        placeholderTextColor="#888"
                        editable={!isSaving}
                      />
                      <TextInput
                        style={styles.repsInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(subRound.id, exercise.id, 'reps', value)}
                        placeholder="No. of reps"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                        editable={!isSaving}
                      />
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.addExerciseButton}
                    onPress={() => addExercise(subRound.id)}
                  >
                    <Text style={styles.addExerciseIcon}>+</Text>
                    <Text style={styles.addExerciseText}>Add Exercise</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Add Workout Button */}
        <TouchableOpacity style={styles.addWorkoutButton}>
          <Text style={styles.addWorkoutIcon}>+</Text>
          <Text style={styles.addWorkoutText}>Add Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Set Workout Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.setWorkoutButton, isSaving && styles.disabledButton]}
          onPress={handleSaveWorkout}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.setWorkoutButtonText}>Set Workout</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoDateSection: {
    flex: 1,
  },
  infoDate: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
  },
  infoTime: {
    color: '#D8FF3E',
    fontSize: 12,
    marginTop: 2,
  },
  infoProgressSection: {
    alignItems: 'flex-end',
  },
  infoProgress: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
  },
  infoDetails: {
    marginTop: 8,
  },
  infoInstructor: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoWorkoutName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  dropdownButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
  },
  dropdownText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: 'white',
    fontSize: 12,
    marginLeft: 8,
  },
  timeInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'white',
    fontSize: 14,
    minWidth: 100,
    textAlign: 'center',
  },
  numberInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'white',
    fontSize: 14,
    minWidth: 100,
    textAlign: 'center',
  },
  subRoundContainer: {
    marginBottom: 12,
  },
  subRoundHeader: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subRoundTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  subRoundArrow: {
    color: 'white',
    fontSize: 12,
  },
  subRoundContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  exerciseInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: 'white',
    fontSize: 12,
    flex: 2,
  },
  repsInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  addExerciseButton: {
    borderWidth: 1,
    borderColor: '#555',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addExerciseIcon: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addExerciseText: {
    color: '#D8FF3E',
    fontSize: 12,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addWorkoutButton: {
    borderWidth: 1,
    borderColor: '#555',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  addWorkoutIcon: {
    color: '#D8FF3E',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addWorkoutText: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  setWorkoutButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  setWorkoutButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
});
