import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconLogo from '../components/common/IconLogo';
import BookingSheet from '../components/BookingSheet';
import CancelSheet from '../components/CancelSheet';
import apiClient from '../utils/apiClient';
import { getToken, getUser, User } from '../utils/authStorage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Ionicons } from '@expo/vector-icons';
import config from '../config';

const { width } = Dimensions.get('window');

interface ClassItem {
  id: string;
  name: string;
  time: string;
  date: string;
  capacity: string;
  instructor: string;
  duration?: number;
  isBooked?: boolean;
}

interface ApiBookedClass {
  bookingId: number | string;
  classId: number | string;
  scheduledDate: string;
  scheduledTime: string;
  workoutName: string;
  capacity: number;
  bookingsCount: number;
  coachFirstName?: string;
  coachLastName?: string;
  durationMinutes: number;
}

interface ApiUpcomingClass {
  classId: number;
  capacity: number;
  scheduledDate: string;
  scheduledTime: string;
  workoutName?: string;
  bookedCount?: number;
  durationMinutes?: number;
  coachFirstName?: string;
  coachLastName?: string;
  bookingsCount: number;
}

export interface ApiLiveClassResponse {
  ongoing: boolean;
  roles: string[];
  class: {
    classId: number;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    coachId: number;
    workoutId: number;
    workoutName: string;
    workoutContent: string;
    workoutType: 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA';
  };
  participants: {
    userId: number;
    firstName: string;
    lastName: string;
    score: number | null;
  }[];
}

type HomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'MemberTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Helper function to get day with suffix (e.g., 1st, 2nd, 3rd, 4th)
const getDayWithSuffix = (day: number) => {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

// Helper function to format date for the card (Today, Tomorrow, or Month Day)
const formatDateForCard = (dateString: string): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const classDate = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);

  if (classDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (classDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  return classDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedCancelClass, setSelectedCancelClass] = useState<ClassItem | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [bookedClasses, setBookedClasses] = useState<ClassItem[]>([]);
  const [isLoadingBooked, setIsLoadingBooked] = useState<boolean>(true);
  const [bookedError, setBookedError] = useState<string | null>(null);

  const [upcomingClasses, setUpcomingClasses] = useState<{ [key: string]: ClassItem[] }>({});
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState<boolean>(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const [liveClass, setLiveClass] = useState<ApiLiveClassResponse | null>(null);
  const [isLoadingLiveClass, setIsLoadingLiveClass] = useState<boolean>(true);
  const [liveClassError, setLiveClassError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Credit balance state
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(true);

  // Fetch credit balance
  const fetchCreditBalance = async () => {
    if (!currentUser?.userId) return;
    
    setIsLoadingCredits(true);
    try {
      const response = await apiClient.get(`/members/${currentUser.userId}/credits`);
      setCreditBalance(response.data.creditsBalance || 0);
    } catch (error) {
      console.error('Failed to fetch credit balance:', error);
      setCreditBalance(0);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // Extracted fetch logic to be reusable
const fetchBookedClasses = async () => {
  setIsLoadingBooked(true);
  setBookedError(null);
  try {
    const bookedResponse = await apiClient.get<ApiBookedClass[]>('/member/classes');
    const now = new Date();

    const formattedBookedClasses: ClassItem[] = bookedResponse.data
      .filter((apiClass) => {
        // Check if class has ended: current time > class end time
        const classDateTime = new Date(`${apiClass.scheduledDate}T${apiClass.scheduledTime}`);
        const classEndTime = new Date(classDateTime.getTime() + (apiClass.durationMinutes || 60) * 60 * 1000);
        return classEndTime > now; // Only show classes that haven't ended yet
      })
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
        const dateTimeB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      })
      .map((apiClass) => ({
        id: String(apiClass.classId),
        name: apiClass.workoutName || 'Workout',
        time: apiClass.scheduledTime ? apiClass.scheduledTime.slice(0, 5) : 'N/A',
        date: apiClass.scheduledDate
          ? new Date(`${apiClass.scheduledDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'N/A',
        capacity: `${apiClass.bookingsCount ?? 0}/${apiClass.capacity}`,
        instructor: `${apiClass.coachFirstName || ''} ${apiClass.coachLastName || ''}`.trim() || 'Coach',
        duration: apiClass.durationMinutes ?? 0,
        isBooked: true,
      }));
    setBookedClasses(formattedBookedClasses);
  } catch (error: any) {
    console.error('Failed to fetch booked classes:', error);
    if (error.response?.status === 401) {
      setBookedError('Session expired. Please login again.');
    } else {
      setBookedError('Failed to load your booked classes.');
    }
  } finally {
    setIsLoadingBooked(false);
  }
};

const fetchUpcomingClasses = async () => {
  setIsLoadingUpcoming(true);
  setUpcomingError(null);
  try {
    const upcomingResponse = await apiClient.get<ApiUpcomingClass[]>('/member/unbookedclasses');
    const now = new Date();

    const groupedClasses = upcomingResponse.data
      .filter((apiClass) => {
        // Check if class has ended: current time > class end time
        const classDateTime = new Date(`${apiClass.scheduledDate}T${apiClass.scheduledTime}`);
        const classEndTime = new Date(classDateTime.getTime() + (apiClass.durationMinutes || 60) * 60 * 1000);
        return classEndTime > now; // Only show classes that haven't ended yet
      })
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
        const dateTimeB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      })
      .reduce((acc: { [key: string]: ClassItem[] }, apiClass) => {
        const dateKey = apiClass.scheduledDate;
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push({
          id: apiClass.classId.toString(),
          name: apiClass.workoutName || 'Workout',
          time: apiClass.scheduledTime ? apiClass.scheduledTime.slice(0, 5) : 'N/A',
          date: formatDateForCard(apiClass.scheduledDate),
          capacity: `${apiClass.bookingsCount ?? 0}/${apiClass.capacity}`,
          instructor:
            `${apiClass.coachFirstName || ''} ${apiClass.coachLastName || ''}`.trim() || 'Coach',
            duration: apiClass.durationMinutes || 60,
          isBooked: false,
          
        });
        return acc;
      }, {});

    setUpcomingClasses(groupedClasses);
  } catch (error: any) {
    console.error('Failed to fetch upcoming classes:', error);
    if (error.response?.status === 401) {
      setUpcomingError('Session expired. Please login again.');
    } else {
      setUpcomingError('Failed to load upcoming classes.');
    }
  } finally {
    setIsLoadingUpcoming(false);
  }
};

  const fetchLiveClass = async () => {
    setIsLoadingLiveClass(true);
    setLiveClassError(null);
    try {
      const response = await apiClient.get<ApiLiveClassResponse>('/live/class');
      if (response.data.ongoing && response.data.class) {
        setLiveClass(response.data);
      } else {
        setLiveClass(null);
      }
    } catch (error: any) {
      // Benign on first load (token race / no live class yet / transient)
      if (error.response) {
        const status = error.response?.status;
        if (!status || status === 401 || status === 404 || status === 429 || status === 503) {
          setLiveClass(null);
          return; // don't log or set user-visible error
        }
      }
      console.error('fetchLiveClass:', error);
      setLiveClassError('Failed to load live class information.');
    } finally {
      setIsLoadingLiveClass(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveClass();
    await fetchBookedClasses();
    await fetchUpcomingClasses();
    await fetchCreditBalance();
    setRefreshing(false);
  }, [currentUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const user = await getUser();
      setCurrentUser(user);
      await fetchLiveClass();
      await fetchBookedClasses();
      await fetchUpcomingClasses();
      await fetchCreditBalance();
    };

    fetchInitialData();
  }, []);

  // Fetch credit balance when user changes
  useEffect(() => {
    if (currentUser?.userId) {
      fetchCreditBalance();
    }
  }, [currentUser]);

  const handleCancelClass = (classId: string) => {
    const classToCancel = bookedClasses.find((c) => c.id === classId);
    if (classToCancel) {
      setSelectedCancelClass(classToCancel);
    }
  };

  const handleBookClass = (classId: string) => {
    const classToBook = Object.values(upcomingClasses)
      .flat()
      .find((c) => c.id === classId);
    if (classToBook) {
      setSelectedClass(classToBook);
    }
  };

  const handleConfirmBooking = async (classId: string): Promise<boolean> => {

    try {
      const response = await apiClient.post('/book', { classId: classId });

      if (response.data.success) {
        // Remove the booked class from the upcoming list
        const numericClassId = parseInt(classId, 10);
        setUpcomingClasses((prev) => {
          const newUpcoming = { ...prev };
          for (const date in newUpcoming) {
            newUpcoming[date] = newUpcoming[date].filter(
              (c) => parseInt(c.id, 10) !== numericClassId,
            );
            if (newUpcoming[date].length === 0) {
              delete newUpcoming[date];
            }
          }
          return newUpcoming;
        });

        // Refresh booked classes to show the new one
        await fetchBookedClasses();
        // Refresh credit balance
        await fetchCreditBalance();
        return true;
      } else {
        Alert.alert(
          'Booking Failed',
          response.data.error || 'Could not book the class. Please try again.',
        );
        return false;
      }
    } catch (error: any) {
      console.error('Booking request failed:', error);
      let errorMessage = 'An unexpected error occurred during booking.';
      if (error.response) {
        errorMessage =
          error.response.data.error ||
          `Booking failed: ${error.response.statusText} (Status: ${error.response.status})`;
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (
          error.response.status === 400 &&
          error.response.data.error === 'Already booked'
        ) {
          errorMessage = 'You have already booked this class.';
        } else if (
          error.response.status === 400 &&
          error.response.data.error === 'Insufficient credits'
        ) {
          errorMessage = 'You don\'t have enough credits to book this class. Purchase more credits in your profile.';
        }
      }
      Alert.alert('Booking Error', errorMessage);
      return false;
    }
  };

  const handleConfirmCancellation = async (classId: string) => {
    try {
      const response = await apiClient.post('/cancel', { classId: parseInt(classId, 10) });

      if (response.data?.success) {
        Alert.alert('Cancellation Successful', 'Your booking has been cancelled.');
        // Remove from booked list
        setBookedClasses((prev) => prev.filter((c) => c.id !== classId));

        // Optionally refresh upcoming to re-show class availability
        await fetchUpcomingClasses();
        // Refresh credit balance
        await fetchCreditBalance();
      } else {
        Alert.alert('Cancellation Failed', response.data?.error || 'Please try again.');
      }
    } catch (error: any) {
      console.error('Cancellation request failed:', error);
      let errorMessage = 'An unexpected error occurred during cancellation.';
      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          `Cancellation failed: ${error.response.statusText} (Status: ${error.response.status})`;
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.response.status === 404) {
          errorMessage = 'Booking not found or already cancelled.';
        }
      }
      Alert.alert('Cancellation Error', errorMessage);
    }
  };

  const handleCloseSheet = () => {
    setSelectedClass(null);
  };

  const handleCloseCancelSheet = () => {
    setSelectedCancelClass(null);
  };

  const renderBookedClass = (classItem: ClassItem) => (
    <View style={styles.bookedClassCard}>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.classDate}>{classItem.date}</Text>
          <Text style={styles.classTime}>{classItem.time}</Text>
        </View>

        <Text style={styles.classCapacity}>{classItem.capacity}</Text>
      </View>
      <View style={styles.classContent}>
        <View style={styles.classInfo}>
          <Text style={styles.classTime}>{classItem.instructor}</Text>
          <Text style={styles.className}>{classItem.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelClass(classItem.id)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUpcomingClass = (classItem: ClassItem) => (
    <View style={styles.upcomingClassCard}>
      <View style={styles.upcomingClassHeader}>
        <View style={styles.upcomingClassInfo}>
          <View style={styles.upcomingClassDetails}>
            <Text style={styles.upcomingClassDate}>{classItem.date}</Text>
            <Text style={styles.upcomingClassTime}>{classItem.time}</Text>
          </View>

          <Text style={styles.upcomingClassCapacity}>{classItem.capacity}</Text>
        </View>
      </View>
      <View style={styles.upcomingClassContent}>
        <View style={styles.upcomingClassDetails}>
          <Text style={styles.upcomingClassTime}>{classItem.instructor}</Text>
          <Text style={styles.upcomingClassName}>{classItem.name}</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={() => handleBookClass(classItem.id)}>
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <IconLogo width={50} height={46} />
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome , {currentUser?.firstName || 'User'} 👋</Text>

          <View style={styles.passContainer}>
            <Text style={styles.passText}>Credits</Text>
            <View style={styles.progressContainer}>
              {isLoadingCredits ? (
                <Text style={styles.progressText}>Loading...</Text>
              ) : (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min((creditBalance / 10) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{creditBalance}</Text>
                </>
              )}
            </View>
          </View>
        </View>
        {/* Help Icon */}
        <TouchableOpacity style={styles.helpIcon} onPress={() => navigation.navigate('FAQ')}>
          <Ionicons name="help-circle-outline" size={32} color="#D8FF3E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
        }
      >

        {/* Live Class Banner */}
        {!isLoadingLiveClass && !liveClassError && liveClass && (
          <TouchableOpacity
            style={styles.liveClassBanner}
            onPress={() => {
              const rolesFromApi = Array.isArray(liveClass?.roles) ? liveClass.roles : [];
              if (rolesFromApi.includes('coach')) {
                navigation.navigate('CoachLive', {
                  classId: liveClass.class.classId,
                  liveClassData: liveClass,
                });
              } else {
                // New member flow starts at the Overview screen
                navigation.navigate('Overview', {
                  classId: liveClass.class.classId,
                  liveClassData: liveClass,
                });
              }
            }}

          >
            <View style={styles.liveClassLeft}>
              <View style={styles.liveIndicator} />
              <View>
                <Text style={styles.liveLabel}>LIVE CLASS</Text>
                <Text style={styles.liveClassName}>{liveClass.class.workoutName || 'Workout'}</Text>
              </View>
            </View>
            <View style={styles.liveClassRight}>
              <Text style={styles.liveInstructor}>
                {/* You may want to fetch coach name elsewhere if needed */}
                Coach
              </Text>
              <Text style={styles.liveJoinText}>TAP TO JOIN</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Booked Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booked Classes</Text>
          {isLoadingBooked ? (
            <ActivityIndicator size="large" color="#D8FF3E" style={{ marginTop: 20 }} />
          ) : bookedError ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.errorText}>{bookedError}</Text>
            </View>
          ) : bookedClasses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookedClassesContainer}
              style={styles.bookedClassesScrollView}
            >
              {/* {bookedClasses.map(renderBookedClass)} */}

              {bookedClasses.map((classItem) => (
                // set the key here on the immediate child returned from map
                <React.Fragment key={`booked-${classItem.id}`}>{renderBookedClass(classItem)}</React.Fragment>
              ))}

            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIcon}>
                <Text style={styles.emptyStateIconText}>📅</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No Booked Classes</Text>
              <Text style={styles.emptyStateDescription}>
                You haven't booked any classes yet. Browse upcoming classes below to get started
                with your fitness journey.
              </Text>
              <TouchableOpacity style={styles.emptyStateButton}>
                <Text style={styles.emptyStateButtonText}>Explore Classes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upcoming Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          {isLoadingUpcoming ? (
            <ActivityIndicator size="large" color="#D8FF3E" style={{ marginTop: 20 }} />
          ) : upcomingError ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.errorText}>{upcomingError}</Text>
            </View>
          ) : Object.keys(upcomingClasses).length > 0 ? (
            <View style={styles.upcomingClassesContainer}>
              {Object.keys(upcomingClasses).map((date) => {
                const classDate = new Date(`${date}T00:00:00`);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = classDate.getTime() === today.getTime();

                return (
                  <View key={date} style={styles.dayGroupContainer}>
                    <View style={styles.dateTimeline}>
                      <View style={styles.dateContainer}>
                        {isToday ? (
                          <Text style={styles.dayText}>Today</Text>
                        ) : (
                          <>
                            <Text style={styles.dayText}>
                              {getDayWithSuffix(classDate.getDate())}
                            </Text>
                            <Text style={styles.monthText}>
                              {classDate.toLocaleDateString('en-US', { month: 'short' })}
                            </Text>
                          </>
                        )}
                      </View>
                      <View style={styles.timelineBar} />
                    </View>
                    <View style={styles.classesForDay}>
                      {/* {upcomingClasses[date].map(renderUpcomingClass)} */}

                      {upcomingClasses[date].map((classItem) => (
                        // unique key per date+classId to make sure it's stable and unique
                        <React.Fragment key={`${date}-${classItem.id}`}>
                          {renderUpcomingClass(classItem)}
                        </React.Fragment>
                      ))}

                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIcon}>
                <Text style={styles.emptyStateIconText}>✨</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No Upcoming Classes</Text>
              <Text style={styles.emptyStateDescription}>
                Check back soon for new classes and schedules!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BookingSheet
        visible={selectedClass !== null}
        classItem={selectedClass}
        onBook={handleConfirmBooking}
        onClose={handleCloseSheet}
      />

      <CancelSheet
        visible={selectedCancelClass !== null}
        classItem={selectedCancelClass}
        onCancel={handleConfirmCancellation}
        onClose={handleCloseCancelSheet}
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
    paddingBottom: 30,
  },
  welcomeContainer: {
    marginLeft: 12,
  },
  welcomeText: {
    color: 'white',
    fontSize: 18,
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
  bookedClassesContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  bookedClassesScrollView: {
    marginHorizontal: -20,
    paddingLeft: 20,
  },
  bookedClassCard: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D8FF3E',
    padding: 16,
    width: width * 0.75,
    height: 150,
    marginRight: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  classDate: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
  },
  classCapacity: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
  },
  classContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  classInfo: {
    flex: 1,
  },
  classTime: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  className: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingClassesContainer: {
    gap: 20,
  },
  upcomingClassCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  upcomingClassHeader: {
    marginBottom: 12,
  },
  upcomingClassInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  upcomingClassDate: {
    color: '#888',
    fontSize: 12,
  },
  upcomingClassCapacity: {
    color: '#888',
    fontSize: 12,
  },
  upcomingClassContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  upcomingClassDetails: {
    flex: 1,
  },
  upcomingClassTime: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  upcomingClassName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  passContainer: {
    marginTop: 2,
  },
  passText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    backgroundColor: '#333',
    borderRadius: 10,
    height: 8,
    width: width - 180,
    marginRight: 12,
  },
  progressFill: {
    backgroundColor: '#D8FF3E',
    borderRadius: 10,
    height: '100%',
    width: '67%',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
  },
  emptyStateContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#333',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateIconText: {
    fontSize: 32,
  },
  emptyStateTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyStateButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D8FF3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  liveClassBanner: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  liveJoinText: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  dayGroupContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  dateTimeline: {
    alignItems: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  dayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  monthText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  timelineBar: {
    flex: 1,
    width: 2,
    backgroundColor: '#3a3a3a',
  },
  classesForDay: {
    flex: 1,
    gap: 12,
  },
  helpIcon: {
    marginLeft: 'auto',
    padding: 4,
  },
});
