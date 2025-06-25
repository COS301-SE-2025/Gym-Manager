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

type SetWorkoutScreenProps = StackScreenProps<CoachStackParamList, 'SetWorkout'>;

export default function SetWorkoutScreen({ route, navigation }: SetWorkoutScreenProps) {
  const { classId } = route.params;
  
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
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
        'http://localhost:4000/coach/assignedClasses',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const classData = response.data.find(c => c.classId === classId);
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
      const errorMessage = axios.isAxiosError(error) && error.response?.status === 401
        ? 'Session expired. Please login again.'
        : 'Failed to load class details.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkout = async () => {
    // Validate input
    if (!workoutName.trim()) {
      Alert.alert('Validation Error', 'Please enter a workout name.');
      return;
    }

    if (!workoutDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a workout description.');
      return;
    }

    setIsSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Authentication Error', 'No session token found. Please log in again.');
        return;
      }

      // Step 1: Create a new workout
      const createWorkoutResponse = await axios.post(
        'http://localhost:4000/coach/createWorkout',
        {
          workoutName: workoutName.trim(),
          workoutContent: workoutDescription.trim(),
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!createWorkoutResponse.data.success) {
        throw new Error('Failed to create workout');
      }

      const workoutId = createWorkoutResponse.data.workoutId;

      // Step 2: Assign the workout to the class
      const assignWorkoutResponse = await axios.post(
        'http://localhost:4000/coach/assignWorkout',
        {
          classId: classId,
          workoutId: workoutId,
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (assignWorkoutResponse.data.success) {
        Alert.alert(
          'Success!', 
          'Workout has been created and assigned to the class successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error('Failed to assign workout to class');
      }

    } catch (error: any) {
      console.error('Failed to save workout:', error);
      let errorMessage = 'An unexpected error occurred while saving the workout.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.error || `Save failed: ${error.response.statusText}`;
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You are not authorized to assign workouts to this class.';
        }
      }
      
      Alert.alert('Save Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
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
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        {/* Workout Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoDateSection}>
              <Text style={styles.infoDate}>{formatDate(classDetails.scheduledDate)}</Text>
              <Text style={styles.infoTime}>{formatTime(classDetails.scheduledTime)}</Text>
            </View>
            <View style={styles.infoCapacitySection}>
              <Text style={styles.infoCapacity}>0/{classDetails.capacity}</Text>
              <Text style={styles.infoInstructor}>You</Text>
            </View>
          </View>
        </View>

        {/* Workout Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <TextInput
            style={styles.textInput}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Enter workout name (e.g., HIIT Training, Strength Building)"
            placeholderTextColor="#888"
            editable={!isSaving}
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Description</Text>
          <TextInput
            style={styles.textArea}
            value={workoutDescription}
            onChangeText={setWorkoutDescription}
            placeholder="Describe the workout, exercises, and goals..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isSaving}
          />
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.additionalInfoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>60 minutes</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Max Capacity</Text>
              <Text style={styles.infoValue}>{classDetails.capacity} members</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.cancelButton, isSaving && styles.disabledButton]} 
          onPress={handleCancel}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.disabledButton]} 
          onPress={handleSaveWorkout}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.saveButtonText}>Save Workout</Text>
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
    borderWidth: 2,
    borderColor: '#D8FF3E',
    padding: 16,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  infoCapacitySection: {
    alignItems: 'flex-end',
  },
  infoCapacity: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
  },
  infoInstructor: {
    color: '#888',
    fontSize: 12,
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
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    height: 120,
  },
  additionalInfoContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
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