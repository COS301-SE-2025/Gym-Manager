import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeModules, Platform } from 'react-native';

const { Constants } = require('react-native-health');
const { width } = Dimensions.get('window');

interface StepData {
  date: string;
  steps: number;
}

const StatsScreen = ({ navigation }: any) => {
  const [stepData, setStepData] = useState<StepData[]>([]);
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStepData();
  }, []);

  const loadStepData = async () => {
    if (Platform.OS !== 'ios') {
      console.log('Step data only available on iOS');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const healthKit = NativeModules.RCTAppleHealthKit;
      
      if (!healthKit) {
        console.log('HealthKit not available');
        setIsLoading(false);
        return;
      }

      // Get today's steps
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const todayOptions = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      };

      console.log('Getting today\'s step count...');
      healthKit.getStepCount(todayOptions, (error: string, results: any) => {
        if (error) {
          console.log('Error getting today\'s steps:', error);
        } else {
          console.log('Today\'s step results:', results);
          if (results && results.value !== undefined) {
            setTodaySteps(Math.round(results.value));
          }
        }
      });

      // Get last 7 days of step data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfThisDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfThisDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const options = {
          startDate: startOfThisDay.toISOString(),
          endDate: endOfThisDay.toISOString(),
        };

        // Wrap in promise to handle async properly
        const stepPromise = new Promise<StepData>((resolve) => {
          healthKit.getStepCount(options, (error: string, results: any) => {
            if (error) {
              console.log(`Error getting steps for ${date.toDateString()}:`, error);
              resolve({
                date: date.toISOString(),
                steps: 0,
              });
            } else {
              resolve({
                date: date.toISOString(),
                steps: results && results.value !== undefined ? Math.round(results.value) : 0,
              });
            }
          });
        });

        last7Days.push(stepPromise);
      }

      // Wait for all step data to load
      const stepResults = await Promise.all(last7Days);
      console.log('7-day step data:', stepResults);
      setStepData(stepResults);
      
      // Calculate weekly total
      const total = stepResults.reduce((sum, day) => sum + day.steps, 0);
      setWeeklyTotal(total);

    } catch (error) {
      console.error('Error loading step data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatStepDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const getStepGoalProgress = () => {
    const dailyGoal = 10000; // 10,000 steps goal
    return Math.min((todaySteps / dailyGoal) * 100, 100);
  };

  const getAverageSteps = () => {
    if (stepData.length === 0) return 0;
    return Math.round(weeklyTotal / stepData.length);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading your step data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Step Counter</Text>
          <TouchableOpacity onPress={loadStepData} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#D8FF3E" />
          </TouchableOpacity>
        </View>

        {/* Today's Steps Card */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Ionicons name="footsteps-outline" size={28} color="#D8FF3E" />
            <Text style={styles.stepTitle}>Today's Steps</Text>
          </View>
          <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.stepSubtext}>steps today</Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getStepGoalProgress()}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {getStepGoalProgress().toFixed(0)}% of 10,000 daily goal
            </Text>
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={24} color="#D8FF3E" />
            <Text style={styles.summaryNumber}>{weeklyTotal.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="trending-up-outline" size={24} color="#D8FF3E" />
            <Text style={styles.summaryNumber}>{getAverageSteps().toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Daily Average</Text>
          </View>
        </View>

        {/* 7-Day Step History */}
        {stepData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day History</Text>
            <View style={styles.stepHistoryContainer}>
              {stepData.map((item, index) => {
                const isToday = formatStepDate(item.date) === 'Today';
                return (
                  <View key={index} style={[
                    styles.stepHistoryItem,
                    index === stepData.length - 1 && styles.lastItem
                  ]}>
                    <Text style={[
                      styles.stepHistoryDate,
                      isToday && styles.todayText
                    ]}>
                      {formatStepDate(item.date)}
                    </Text>
                    <View style={styles.stepHistoryRight}>
                      <Text style={[
                        styles.stepHistoryCount,
                        isToday && styles.todayStepCount
                      ]}>
                        {item.steps.toLocaleString()}
                      </Text>
                      {item.steps >= 10000 && (
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.goalIcon} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* No Data State */}
        {Platform.OS !== 'ios' && (
          <View style={styles.emptyState}>
            <Ionicons name="phone-portrait-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>iOS Only Feature</Text>
            <Text style={styles.emptyStateSubtext}>
              Step tracking is only available on iOS devices with HealthKit
            </Text>
          </View>
        )}

        {Platform.OS === 'ios' && stepData.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="footsteps-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No Step Data</Text>
            <Text style={styles.emptyStateSubtext}>
              Make sure you've granted permission to read step data in HealthKit
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  stepCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  stepCount: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#D8FF3E',
    marginBottom: 4,
  },
  stepSubtext: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D8FF3E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#888',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8FF3E',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  stepHistoryContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
  },
  stepHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  stepHistoryDate: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  todayText: {
    color: '#D8FF3E',
    fontWeight: '600',
  },
  stepHistoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepHistoryCount: {
    fontSize: 16,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  todayStepCount: {
    color: '#D8FF3E',
    fontWeight: 'bold',
  },
  goalIcon: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});

export default StatsScreen;