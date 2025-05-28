import React, { useState } from 'react';
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

interface WorkoutDetails {
  id: string;
  name: string;
  time: string;
  date: string;
  capacity: string;
  instructor: string;
  description: string;
  difficulty: string;
  duration: string;
}

type SetWorkoutScreenProps = StackScreenProps<CoachStackParamList, 'SetWorkout'>;

export default function SetWorkoutScreen({ route, navigation }: SetWorkoutScreenProps) {
  const { workout } = route.params;
  
  const [workoutName, setWorkoutName] = useState(workout.name === 'Setup Workout' ? '' : workout.name);
  const [workoutDescription, setWorkoutDescription] = useState(workout.description || '');
  const [isSaving, setIsSaving] = useState(false);

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
          classId: parseInt(workout.id), // Convert string ID to number
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
              <Text style={styles.infoDate}>{workout.date}</Text>
              <Text style={styles.infoTime}>{workout.time}</Text>
            </View>
            <View style={styles.infoCapacitySection}>
              <Text style={styles.infoCapacity}>{workout.capacity}</Text>
              <Text style={styles.infoInstructor}>{workout.instructor}</Text>
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
              <Text style={styles.infoValue}>{workout.capacity.split('/')[1] || '12'} members</Text>
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
}); 