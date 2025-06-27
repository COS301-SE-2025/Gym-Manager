import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import type { ApiLiveClassResponse } from '../HomeScreen';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';

const LiveClassScreen = () => {
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'LiveClass'>>();
  const { liveClassData } = route.params;

  const handleSubmitScore = async () => {
    console.log({ classId: liveClassData.class.classId, score: Number(score) });
    if (!score || isNaN(Number(score)) || Number(score) < 0) {
      Alert.alert('Invalid Score', 'Please enter a valid score.');
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        'http://localhost:4000/submitScore',
        { classId: liveClassData.class.classId, score: Number(score) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Alert.alert('Success', 'Score submitted!');
    } catch (err: any) {
      console.log('Score submission error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit score.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <TextInput
            style={styles.scoreInput}
            value={score}
            onChangeText={setScore}
            keyboardType="numeric"
            maxLength={6}
            textAlign="center"
            editable={!loading}
            placeholder="000"
          />
        </View>

        <View style={styles.liveClassBanner}>
          <View style={styles.liveClassLeft}>
            <View style={styles.liveIndicator} />
            <View>
              <Text style={styles.liveLabel}>LIVE CLASS</Text>
              <Text style={styles.liveClassName}>{liveClassData.class.workoutName}</Text>
            </View>
          </View>
          <View style={styles.liveClassRight}>
            <Text style={styles.liveInstructor}>Coach ID: {liveClassData.class.coachId}</Text>
            <Text style={styles.liveCapacity}>
              Participants:{' '}
              {Array.isArray(liveClassData.participants) ? liveClassData.participants.length : 0}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Class Details</Text>
          <View style={styles.detailsContent}>
            <Text style={styles.detailsText}>{liveClassData.class.workoutContent}</Text>
          </View>
        </View>

        <View style={styles.scoreConfirmationContainer}>
          <Text style={styles.scoreConfirmationLabel}>Score</Text>
          <View style={styles.scoreConfirmationValueContainer}>
            <Text style={styles.scoreConfirmationValue}>{score}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitScore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Score</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  backButton: {
    backgroundColor: '#2a2a2a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  scoreInput: {
    color: '#a0a0a0',
    fontSize: 120,
    fontWeight: 'bold',
    minWidth: '80%',
  },
  liveClassBanner: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveClassLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20C934',
    marginRight: 12,
  },
  liveLabel: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveClassName: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  liveClassRight: {
    alignItems: 'flex-end',
  },
  liveInstructor: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '500',
  },
  liveCapacity: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    height: 200,
  },
  detailsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  detailsContent: {
    flex: 1,
  },
  detailsText: {
    color: '#a0a0a0',
    fontSize: 14,
    lineHeight: 20,
  },
  scoreConfirmationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreConfirmationLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreConfirmationValueContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  scoreConfirmationValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#D8FF3E',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LiveClassScreen;
