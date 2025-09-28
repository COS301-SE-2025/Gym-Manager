import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import IconLogo from '../../components/common/IconLogo';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import config from '../../config';
import apiClient from '../../utils/apiClient';
import { getUser, User } from '../../utils/authStorage';
import WorkoutSelectSheet from '../../components/WorkoutSelectSheet';

const { width } = Dimensions.get('window');

// Add this constant for workout types
const WORKOUT_TYPES = ['FOR_TIME', 'AMRAP', 'TABATA', 'EMOM'] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];

interface ClassDetails {
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
  workoutType?: string;
  workoutMetadata?: any;
}

interface Exercise {
  id: string;
  name: string;
  reps: string;
  quantityType: 'reps' | 'duration';
  notes?: string;
}

interface SubRound {
  id: string;
  name: string;
  exercises: Exercise[];
  isExpanded: boolean;
  subroundNumber: number;
  repeats?: string;
}

interface Workout {
  id: string;
  workoutName: string;
  workoutType: WorkoutType;
  workoutMinutes: number;
  numberOfRounds: string;
  subRounds: SubRound[];
}

type SetWorkoutScreenProps = StackScreenProps<CoachStackParamList, 'SetWorkout'>;

export default function SetWorkoutScreen({ route, navigation }: SetWorkoutScreenProps) {
  const { classId, editMode = false } = route.params;

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([
    {
      id: '1',
      workoutName: 'Workout',
      workoutType: 'FOR_TIME',
      workoutMinutes: 0,
      numberOfRounds: '',
      subRounds: [
        {
          id: '1',
          name: 'Sub Round 1',
          exercises: [],
          isExpanded: false,
          subroundNumber: 1,
          repeats: '1',
        },
      ],
    },
  ]);
  const [currentWorkoutIndex, setCurrentWorkoutIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkoutTypeDropdown, setShowWorkoutTypeDropdown] = useState(false);
  const [showWorkoutSelectSheet, setShowWorkoutSelectSheet] = useState(false);

  // Helper function to clean exercise names by removing reps and duration info
  const cleanExerciseName = (rawName: string): string => {
    return rawName
      .replace(/^\d+\s*x\s*/i, '') // Remove "10x " prefix
      .replace(/\s+\d+\s*s\s*$/i, '') // Remove " 20s" suffix
      .replace(/\s+\d+\s*sec\s*$/i, '') // Remove " 20sec" suffix
      .replace(/\s+\d+\s*seconds?\s*$/i, '') // Remove " 20second" or " 20seconds" suffix
      .trim();
  };

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
      await fetchClassDetails();
    })();
  }, [classId]);

  // Separate useEffect to handle loading existing workout when classDetails is available
  useEffect(() => {
    if (editMode && classDetails?.workoutId) {
      loadExistingWorkout(classDetails.workoutId);
    }
  }, [classDetails, editMode]);

  const fetchClassDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use classes-with-workouts to get capacity, bookingsCount, coach names, and duration
      const response = await apiClient.get<ClassDetails[]>(
        `/coach/classes-with-workouts`,
      );

      const classData = response.data.find((c) => c.classId === classId);
      if (!classData) {
        throw new Error('Class not found');
      }

      setClassDetails(classData);

      // Pre-fill workout name if it exists
      if (classData.workoutName) {
        setWorkouts(prev => prev.map(w => ({ 
          ...w, 
          workoutName: classData.workoutName || 'Workout 1' 
        })));
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

  const currentWorkout = workouts[currentWorkoutIndex];

  const setCurrentWorkout = (updates: Partial<Workout>) => {
    setWorkouts(prev => 
      prev.map((workout, index) => 
        index === currentWorkoutIndex 
          ? { ...workout, ...updates }
          : workout
      )
    );
  };

  // removed addWorkout functionality

  const removeWorkout = (workoutIndex: number) => {
    if (workouts.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one workout is required.');
      return;
    }
    
    setWorkouts(prev => prev.filter((_, index) => index !== workoutIndex));
    
    // Adjust current index if needed
    if (currentWorkoutIndex >= workoutIndex) {
      setCurrentWorkoutIndex(Math.max(0, currentWorkoutIndex - 1));
    }
  };

  const selectWorkout = (index: number) => {
    setCurrentWorkoutIndex(index);
  };

  // Update subround functions to work with current workout
  const toggleSubRound = (subRoundId: string) => {
    setCurrentWorkout({
      subRounds: currentWorkout.subRounds.map(sr => 
        sr.id === subRoundId 
          ? { ...sr, isExpanded: !sr.isExpanded }
          : sr
      )
    });
  };

  const addExercise = (subRoundId: string) => {
    const newExerciseId = Date.now().toString();
    setCurrentWorkout({
      subRounds: currentWorkout.subRounds.map(sr => 
        sr.id === subRoundId 
          ? { 
              ...sr, 
              exercises: [...sr.exercises, { 
                id: newExerciseId, 
                name: '', 
                reps: '',
                quantityType: 'reps' as const,
                notes: '',
              }]
            }
          : sr
      )
    });
  };

  const updateExercise = (subRoundId: string, exerciseId: string, field: 'name' | 'reps' | 'quantityType' | 'notes', value: string) => {
    setCurrentWorkout({
      subRounds: currentWorkout.subRounds.map(sr => 
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
    });
  };

  const addSubRound = () => {
    const newId = (currentWorkout.subRounds.length + 1).toString();
    setCurrentWorkout({
      subRounds: [
        ...currentWorkout.subRounds,
        {
          id: newId,
          name: `Sub Round ${newId}`,
          exercises: [],
          isExpanded: false,
          subroundNumber: currentWorkout.subRounds.length + 1,
          repeats: '1',
        }
      ]
    });
  };

  const removeSubRound = (subRoundId: string) => {
    setCurrentWorkout({
      subRounds: currentWorkout.subRounds
        .filter(sr => sr.id !== subRoundId)
        .map((sr, index) => ({
          ...sr,
          name: `Sub Round ${index + 1}`,
          subroundNumber: index + 1,
        }))
    });
  };

  const removeExercise = (subRoundId: string, exerciseId: string) => {
    setCurrentWorkout({
      subRounds: currentWorkout.subRounds.map(sr => 
        sr.id === subRoundId 
          ? { 
              ...sr, 
              exercises: sr.exercises.filter(ex => ex.id !== exerciseId)
            }
          : sr
      )
    });
  };

  const handleWorkoutTypeSelect = (type: WorkoutType) => {
    setCurrentWorkout({ workoutType: type });
  };


  const handleLoadWorkout = async (workoutId: number, workoutName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch workout details
      const response = await apiClient.get(`/workout/${workoutId}/steps`);
      const workoutData = response.data;

      // Parse the workout data and populate the form
      if (workoutData && workoutData.steps) {
        const steps = workoutData.steps;
        
        // Group steps by round and subround
        const roundsMap = new Map<number, Map<number, any[]>>();
        
        steps.forEach((step: any) => {
          const roundNum = step.round || step.roundNumber || 1;
          const subroundNum = step.subround || step.subroundNumber || 1;
          
          if (!roundsMap.has(roundNum)) {
            roundsMap.set(roundNum, new Map());
          }
          
          const subroundsMap = roundsMap.get(roundNum)!;
          if (!subroundsMap.has(subroundNum)) {
            subroundsMap.set(subroundNum, []);
          }
          
          // Extract clean exercise name by removing reps and duration information
          const rawName = step.name || step.title || step.exerciseName || 'Exercise';
          const cleanName = cleanExerciseName(rawName);
          
          subroundsMap.get(subroundNum)!.push({
            id: Date.now().toString() + Math.random(),
            name: cleanName,
            reps: (step.reps || step.quantity || step.duration || 0).toString(),
            quantityType: step.quantityType || (step.reps ? 'reps' : 'duration'),
            notes: step.notes || '',
          });
        });

        // Extract metadata from the workout data first
        const metadata = workoutData.metadata || {};
        const emomRepeats: number[] = Array.isArray(metadata.emom_repeats) ? metadata.emom_repeats : [];
        const timeLimit = Number(metadata.time_limit ?? 0);
        const minutes = timeLimit; // time_limit stores minutes directly
        const roundsFromMeta = metadata.number_of_rounds != null
          ? String(metadata.number_of_rounds)
          : '1';

        // Convert to workout structure
        const subRounds: SubRound[] = [];
        let subroundCounter = 1;

        roundsMap.forEach((subroundsMap, roundNum) => {
          subroundsMap.forEach((exercises, subroundNum) => {
            subRounds.push({
              id: subroundCounter.toString(),
              name: `Sub Round ${subroundCounter}`,
              exercises: exercises,
              isExpanded: false,
              subroundNumber: subroundCounter,
              repeats: String(emomRepeats[subroundCounter - 1] ?? 1),
            });
            subroundCounter++;
          });
        });

        // Update the workout with loaded metadata
        setCurrentWorkout({
          workoutName: workoutName,
          workoutType: (workoutData.workoutType as any) || 'FOR_TIME',
          workoutMinutes: minutes,
          numberOfRounds: roundsFromMeta,
          subRounds: subRounds,
        });

        Alert.alert('Success!', `Loaded workout "${workoutName}" with ${subRounds.length} sub-rounds.`);
      }
    } catch (error: any) {
      console.error('Failed to load workout:', error);
      setError('Failed to load workout details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingWorkout = async (workoutId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch workout details
      const response = await apiClient.get(`/workout/${workoutId}/steps`);
      const workoutData = response.data;

      // Parse the workout data and populate the form
      if (workoutData && workoutData.steps) {
        const steps = workoutData.steps;
        
        // Group steps by round and subround
        const roundsMap = new Map<number, Map<number, any[]>>();
        
        steps.forEach((step: any) => {
          const roundNum = step.round || step.roundNumber || 1;
          const subroundNum = step.subround || step.subroundNumber || 1;
          
          if (!roundsMap.has(roundNum)) {
            roundsMap.set(roundNum, new Map());
          }
          
          const subroundsMap = roundsMap.get(roundNum)!;
          if (!subroundsMap.has(subroundNum)) {
            subroundsMap.set(subroundNum, []);
          }
          
          // Extract clean exercise name by removing reps and duration information
          const rawName = step.name || step.title || step.exerciseName || 'Exercise';
          const cleanName = cleanExerciseName(rawName);
          
          subroundsMap.get(subroundNum)!.push({
            id: Date.now().toString() + Math.random(),
            name: cleanName,
            reps: (step.reps || step.quantity || step.duration || 0).toString(),
            quantityType: step.quantityType || (step.reps ? 'reps' : 'duration'),
            notes: step.notes || '',
          });
        });

        // Convert to workout structure
        const subRounds: SubRound[] = [];
        let subroundCounter = 1;

        // Extract metadata from the workout data
        const metadata = workoutData.metadata || {};
        const existingType = workoutData.workoutType || 'FOR_TIME';
        const emomRepeats: number[] = Array.isArray(metadata.emom_repeats) ? metadata.emom_repeats : [];

        roundsMap.forEach((subroundsMap, roundNum) => {
          subroundsMap.forEach((exercises, subroundNum) => {
            subRounds.push({
              id: subroundCounter.toString(),
              name: `Sub Round ${subroundCounter}`,
              exercises: exercises,
              isExpanded: false,
              subroundNumber: subroundCounter,
              repeats: String(emomRepeats[subroundCounter - 1] ?? 1),
            });
            subroundCounter++;
          });
        });

        // Update the workout with existing data + previously saved metadata
        const timeLimit = Number(metadata.time_limit ?? 0);
        const minutes = timeLimit; // time_limit stores minutes directly

        const roundsFromMeta = metadata.number_of_rounds != null
          ? String(metadata.number_of_rounds)
          : (currentWorkout.numberOfRounds || '1');

        setCurrentWorkout({
          workoutName: classDetails?.workoutName || 'Workout',
          workoutType: (existingType as any),
          workoutMinutes: minutes,
          numberOfRounds: roundsFromMeta,
          subRounds: subRounds,
        });
      }
    } catch (error: any) {
      console.error('Failed to load existing workout:', error);
      setError('Failed to load existing workout details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkout = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate all workouts
      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i];
        if (!workout.workoutName.trim()) {
          throw new Error(`Workout ${i + 1}: Workout name is required`);
        }
        if (!workout.subRounds.length) {
          throw new Error(`Workout ${i + 1}: At least one sub-round is required`);
        }
        const subRoundsWithExercises = workout.subRounds.filter(sr => 
          sr.exercises.some(ex => ex.name.trim())
        );
        if (subRoundsWithExercises.length === 0) {
          throw new Error(`Workout ${i + 1}: At least one sub-round must have exercises`);
        }
      }

      // Create or update workouts
      const createdWorkoutIds = [];
      for (const workout of workouts) {
        const workoutData = {
          workoutName: workout.workoutName.trim(),
          type: workout.workoutType,
          metadata: {
            ...(workout.workoutType === 'FOR_TIME' || workout.workoutType === 'AMRAP' ? {
              time_limit: workout.workoutMinutes,
            } : {}),
            ...(workout.workoutType === 'FOR_TIME' ? {
              number_of_rounds: parseInt(workout.numberOfRounds) || 1,
            } : {}),
            ...(workout.workoutType === 'TABATA' ? {
              number_of_rounds: parseInt(workout.numberOfRounds) || 1,
            } : {}),
            ...(workout.workoutType === 'EMOM' ? {
              emom_repeats: workout.subRounds.map(sr => {
                const n = parseInt((sr.repeats ?? '').trim() || '0');
                return n > 0 ? n : 1;
              }),
            } : {}),
            number_of_subrounds: workout.subRounds.length,
          },
          rounds: [
            {
              roundNumber: 1,
              subrounds: workout.subRounds.map((subRound, index) => ({
                subroundNumber: index + 1,
                exercises: subRound.exercises
                  .filter(ex => ex.name.trim())
                  .map((exercise, exIndex) => ({
                    exerciseName: exercise.name.trim(),
                    position: exIndex + 1,
                    quantityType: exercise.quantityType,
                    quantity: parseInt(exercise.reps) || 0,
                    notes: exercise.notes,
                  })),
              })),
            },
          ],
        };

        if (editMode && classDetails?.workoutId) {
          // Update existing workout

          const updateResponse = await apiClient.put(
            `/coach/update-workout/${classDetails.workoutId}`,
            workoutData,
          );

          if (updateResponse.data.success) {
            createdWorkoutIds.push(updateResponse.data.workoutId);
          } else {
            throw new Error(`Failed to update workout: ${workout.workoutName}`);
          }
        } else {
          // Create new workout

          const createResponse = await apiClient.post(
            `/coach/create-workout`,
            workoutData,
          );

          if (createResponse.data.success) {
            createdWorkoutIds.push(createResponse.data.workoutId);
          } else {
            throw new Error(`Failed to create workout: ${workout.workoutName}`);
          }
        }
      }

      // Assign all workouts to the class
      if (classDetails && createdWorkoutIds.length > 0) {
        // For now, assign the first workout to the class
        // You might want to modify the API to support multiple workouts per class
        const assignResponse = await apiClient.post(
          `/coach/assign-workout`,
          {
            classId: classDetails.classId,
            workoutId: createdWorkoutIds[0], // Assign the first workout
          },
        );

        if (assignResponse.data.success) {
          const action = editMode ? 'Updated' : 'Created';
          Alert.alert(
            'Success!',
            `${action} ${workouts.length} workout(s) and assigned to the class successfully.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ],
          );
        } else {
          throw new Error('Failed to assign workout to class');
        }
      }
    } catch (error: any) {
      console.error('Failed to save workouts:', error);
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : axios.isAxiosError(error) && error.response?.status === 401
          ? 'Session expired. Please login again.'
          : 'Failed to save workouts. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editMode ? 'Edit Workout' : 'Set Workout'}</Text>
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
              <Text style={styles.infoProgress}>
                {`${(classDetails as any).bookingsCount ?? 0}/${classDetails.capacity}`}
              </Text>
            </View>
          </View>
          <View style={styles.infoDetails}>
            <Text style={styles.infoInstructor}>
              {(() => {
                const first = classDetails.coachFirstName ?? user?.firstName ?? ''; // if no coach name, use user name
                const last = classDetails.coachLastName ?? user?.lastName ?? ''; // if no coach name, use user name
                const name = `${first} ${last}`.trim();
                const dur = typeof classDetails.durationMinutes === 'number' ? ` • ${classDetails.durationMinutes} min` : '';
                return (name || 'Coach') + dur;
              })()}
            </Text>
            <Text style={styles.infoWorkoutName}>{currentWorkout.workoutName}</Text>
          </View>
        </View>

        {/* Workout Selector removed */}

        {/* Current Workout Content */}
        <View style={styles.workoutContent}>
          {/* Workout Title Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Title</Text>
            <TextInput
              style={styles.textInput}
              value={currentWorkout.workoutName}
              onChangeText={(value) => setCurrentWorkout({ workoutName: value })}
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
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowWorkoutTypeDropdown(!showWorkoutTypeDropdown)}
                >
                  <Text style={styles.dropdownText}>{currentWorkout.workoutType}</Text>
                  <Text style={styles.dropdownArrow}>
                    {showWorkoutTypeDropdown ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showWorkoutTypeDropdown && (
                  <View style={styles.dropdownMenu}>
                    {WORKOUT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.dropdownItem,
                          currentWorkout.workoutType === type && styles.dropdownItemSelected
                        ]}
                        onPress={() => handleWorkoutTypeSelect(type)}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          currentWorkout.workoutType === type && styles.dropdownItemTextSelected
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Time - Only show for certain workout types */}
            {(currentWorkout.workoutType === 'FOR_TIME' || currentWorkout.workoutType === 'AMRAP') && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Duration (Minutes)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={currentWorkout.workoutMinutes.toString()}
                  onChangeText={(value) => {
                    const minutes = parseInt(value) || 0;
                    setCurrentWorkout({ workoutMinutes: minutes });
                  }}
                  placeholder="0"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
            )}

            {/* Number of Rounds - Only show for certain workout types */}
            {(currentWorkout.workoutType === 'TABATA' || currentWorkout.workoutType === 'FOR_TIME') && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Number of Rounds</Text>
                <TextInput
                  style={styles.numberInput}
                  value={currentWorkout.numberOfRounds}
                  onChangeText={(value) => setCurrentWorkout({ numberOfRounds: value })}
                  placeholder=""
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
            )}

            {/* Number of Sub Rounds removed (computed from subRounds length) */}
          </View>

          {/* Sub Rounds Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sub Rounds</Text>
              <TouchableOpacity 
                style={styles.addSubRoundButton}
                onPress={addSubRound}
              >
                <Text style={styles.addSubRoundIcon}>+</Text>
                <Text style={styles.addSubRoundText}>Add Sub Round</Text>
              </TouchableOpacity>
            </View>
            
            {currentWorkout.subRounds.map((subRound) => (
              <View key={subRound.id} style={styles.subRoundContainer}>
                <View style={styles.subRoundHeaderContainer}>
                  <TouchableOpacity 
                    style={styles.subRoundHeader}
                    onPress={() => toggleSubRound(subRound.id)}
                  >
                    <Text style={styles.subRoundTitle}>{subRound.name}</Text>
                    <Text style={styles.subRoundArrow}>
                      {subRound.isExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.removeSubRoundButton}
                    onPress={() => removeSubRound(subRound.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                
                {subRound.isExpanded && (
                  <View style={styles.subRoundContent}>
                    {subRound.exercises.map((exercise) => (
                      <View key={exercise.id} style={styles.exerciseRow}>
                        <TouchableOpacity
                          style={styles.exerciseInput}
                          disabled={isSaving}
                          onPress={() => {
                            navigation.navigate('ExerciseSelect', {
                              query: exercise.name,
                              onSelect: (name: string) => {
                                updateExercise(subRound.id, exercise.id, 'name', name);
                              },
                            });
                          }}
                        >
                          <Text style={{ color: exercise.name ? 'white' : '#888', fontSize: 12 }}>
                            {exercise.name || 'Select Exercise'}
                          </Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.repsInput}
                          value={exercise.reps}
                          onChangeText={(value) => updateExercise(subRound.id, exercise.id, 'reps', value)}
                          placeholder={currentWorkout.workoutType === 'TABATA' ? 'No of secs' : 'No. of reps'}
                          placeholderTextColor="#888"
                          keyboardType="numeric"
                          editable={!isSaving}
                        />
                        <TouchableOpacity
                          style={styles.quantityTypeButton}
                          onPress={() => {
                            const newType = exercise.quantityType === 'reps' ? 'duration' : 'reps';
                            updateExercise(subRound.id, exercise.id, 'quantityType', newType);
                          }}
                        >
                          <Text style={styles.quantityTypeText}>
                            {exercise.quantityType === 'reps' ? 'Reps' : 'Sec'}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.removeExerciseButton}
                          onPress={() => removeExercise(subRound.id, exercise.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    {currentWorkout.workoutType === 'EMOM' && (
                      <View style={styles.emomRepeatsRow}>
                        <Text style={styles.settingLabel}>Repeats</Text>
                        <TextInput
                          style={styles.numberInput}
                          value={subRound.repeats ?? '1'}
                          onChangeText={(value) => {
                            const digits = value.replace(/[^0-9]/g, '');
                            setCurrentWorkout({
                              subRounds: currentWorkout.subRounds.map((sr) =>
                                sr.id === subRound.id ? { ...sr, repeats: digits } : sr
                              ),
                            });
                          }}
                          placeholder=""
                          placeholderTextColor="#888"
                          keyboardType="numeric"
                          editable={!isSaving}
                        />
                      </View>
                    )}

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
            
            {currentWorkout.subRounds.length === 0 && (
              <View style={styles.emptySubRoundsContainer}>
                <Text style={styles.emptySubRoundsText}>No sub rounds added yet</Text>
                <TouchableOpacity 
                  style={styles.addFirstSubRoundButton}
                  onPress={addSubRound}
                >
                  <Text style={styles.addFirstSubRoundText}>Add Your First Sub Round</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Add Workout Button removed */}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.loadWorkoutButton, isSaving && styles.disabledButton]}
            onPress={() => setShowWorkoutSelectSheet(true)}
            disabled={isSaving}
          >
            <Text style={styles.loadWorkoutButtonText}>Load Workout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.setWorkoutButton, isSaving && styles.disabledButton]}
            onPress={handleSaveWorkout}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <Text style={styles.setWorkoutButtonText}>
                {editMode ? 'Update Workout' : `Set ${workouts.length} Workout(s)`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>


      {/* Workout Select Sheet */}
      <WorkoutSelectSheet
        visible={showWorkoutSelectSheet}
        onClose={() => setShowWorkoutSelectSheet(false)}
        onSelectWorkout={handleLoadWorkout}
      />
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
    paddingTop: 8,
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
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
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
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  dropdownItemSelected: {
    backgroundColor: '#D8FF3E',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
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
  emomRepeatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  subRoundContainer: {
    marginBottom: 12,
  },
  subRoundHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subRoundHeader: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
  removeSubRoundButton: {
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
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
  // addWorkoutButton removed
  // addWorkoutIcon removed
  // addWorkoutText removed
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loadWorkoutButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8FF3E',
    flex: 1,
  },
  loadWorkoutButtonText: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: '700',
  },
  setWorkoutButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 2,
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
  quantityTypeButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  quantityTypeText: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '600',
  },
  addSubRoundButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSubRoundIcon: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  addSubRoundText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  emptySubRoundsContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  emptySubRoundsText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  addFirstSubRoundButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addFirstSubRoundText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  removeExerciseButton: {
    borderRadius: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // workout selector styles removed
  removeWorkoutTabButton: {
    borderRadius: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // addWorkoutTabButton removed
  // addWorkoutTabIcon removed
  workoutContent: {
    // Container for the current workout's content
  },

});
