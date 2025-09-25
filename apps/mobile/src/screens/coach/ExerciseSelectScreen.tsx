import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Props = StackScreenProps<CoachStackParamList, 'ExerciseSelect'>;

interface ExerciseRow {
  exercise_id: number;
  name: string;
  description?: string;
}

export default function ExerciseSelectScreen({ navigation, route }: Props) {
  const { onSelect, query } = route.params;
  const [search, setSearch] = useState(query?.trim() ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseDescription, setNewExerciseDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const debouncedSearch = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    let isActive = true;
    const loadExercises = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const base = supabase.from('exercises').select('exercise_id, name, description').order('name');
        const q = debouncedSearch
          ? base.ilike('name', `%${debouncedSearch}%`)
          : base;
        const { data, error } = await q;
        if (error) throw error;
        if (!isActive) return;
        setExercises((data ?? []) as ExerciseRow[]);
      } catch (e: any) {
        if (!isActive) return;
        setError('Failed to load exercises');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadExercises();
    return () => {
      isActive = false;
    };
  }, [debouncedSearch]);

  const handleBack = () => navigation.goBack();

  const handleSelect = (item: ExerciseRow) => {
    try {
      // onSelect is passed through navigation params; call then goBack
      onSelect?.(item.name);
      navigation.goBack();
    } catch {
      navigation.goBack();
    }
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert([
          {
            name: newExerciseName.trim(),
            description: newExerciseDescription.trim() || null,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Refresh the exercises list
      await fetchExercises();
      
      // Reset form and close modal
      setNewExerciseName('');
      setNewExerciseDescription('');
      setShowCreateModal(false);
      
      Alert.alert('Success', 'Exercise created successfully!');
    } catch (error: any) {
      console.error('Error creating exercise:', error);
      Alert.alert('Error', 'Failed to create exercise. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteExercise = (exercise: ExerciseRow) => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exercise.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('exercises')
                .delete()
                .eq('exercise_id', exercise.exercise_id);

              if (error) throw error;

              // Refresh the exercises list
              await fetchExercises();
              
              Alert.alert('Success', 'Exercise deleted successfully!');
            } catch (error: any) {
              console.error('Error deleting exercise:', error);
              Alert.alert('Error', 'Failed to delete exercise. It may be used in a workout.');
            }
          },
        },
      ]
    );
  };

  const fetchExercises = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const base = supabase.from('exercises').select('exercise_id, name, description').order('name');
      const q = debouncedSearch
        ? base.ilike('name', `%${debouncedSearch}%`)
        : base;
      const { data, error } = await q;
      if (error) throw error;
      setExercises((data ?? []) as ExerciseRow[]);
    } catch (e: any) {
      setError('Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Exercise</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)} 
          style={styles.createButton}
        >
          <Ionicons name="add" size={20} color="#D8FF3E" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D8FF3E" />
        </View>
      )}

      {!isLoading && error && (
        <View style={styles.center}> 
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.exercise_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <TouchableOpacity 
                style={styles.item} 
                onPress={() => handleSelect(item)}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemText}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteExercise(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={exercises.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No exercises found</Text>
          )}
        />
      )}

      {/* Create Exercise Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Exercise</Text>
              <TouchableOpacity 
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exercise Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
                  placeholder="Enter exercise name"
                  placeholderTextColor="#888"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newExerciseDescription}
                  onChangeText={setNewExerciseDescription}
                  placeholder="Enter exercise description"
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.createModalButton, isCreating && styles.disabledButton]}
                onPress={handleCreateExercise}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <Text style={styles.createModalButtonText}>Create Exercise</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  item: {
    flex: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  itemDescription: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createModalButton: {
    flex: 1,
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createModalButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});


