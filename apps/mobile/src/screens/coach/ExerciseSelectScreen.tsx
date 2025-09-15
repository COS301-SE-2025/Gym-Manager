import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import { supabase } from '../../lib/supabase';

type Props = StackScreenProps<CoachStackParamList, 'ExerciseSelect'>;

interface ExerciseRow {
  exercise_id: number;
  name: string;
}

export default function ExerciseSelectScreen({ navigation, route }: Props) {
  const { onSelect, query } = route.params;
  const [search, setSearch] = useState(query?.trim() ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    let isActive = true;
    const fetchExercises = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const base = supabase.from('exercises').select('exercise_id, name').order('name');
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
    fetchExercises();
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Exercise</Text>
        <View style={styles.headerSpacer} />
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
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
              <Text style={styles.itemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={exercises.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No exercises found</Text>
          )}
        />
      )}
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
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemText: {
    color: 'white',
    fontSize: 16,
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
});


