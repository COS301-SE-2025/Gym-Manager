import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import IconLogo from '../components/common/IconLogo';
import BookingSheet from '../components/BookingSheet';
import CancelSheet from '../components/CancelSheet';
import axios from 'axios';
import { getToken, getUser, User } from '../utils/authStorage';

const { width } = Dimensions.get('window');

interface ClassItem {
  id: string;
  name: string;
  time: string;
  date: string;
  capacity: string;
  instructor: string;
  isBooked?: boolean;
}

interface ApiBookedClass {
  bookingId: string;
  classId: string;
  scheduledDate: string;
  scheduledTime: string;
  workoutName: string;
}

// Define a type for the API response item for All Classes
interface ApiUpcomingClass {
  classId: number; // Assuming classId is number from schema
  capacity: number; // Total capacity
  scheduledDate: string;
  scheduledTime: string;
  workoutName?: string; // Added workoutName, make it optional for now
  // workoutId: number; // Available, but we need workoutName
  // coachId: number; // Available, but we need coachName
  // Potentially other fields from the 'classes' table
}

export default function HomeScreen() {
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedCancelClass, setSelectedCancelClass] = useState<ClassItem | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [bookedClasses, setBookedClasses] = useState<ClassItem[]>([]);
  const [isLoadingBooked, setIsLoadingBooked] = useState<boolean>(true);
  const [bookedError, setBookedError] = useState<string | null>(null);

  const [upcomingClasses, setUpcomingClasses] = useState<ClassItem[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState<boolean>(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  // Extracted fetch logic to be reusable
  const fetchBookedClasses = async (token: string) => {
    setIsLoadingBooked(true);
    setBookedError(null);
    try {
      const bookedResponse = await axios.get<ApiBookedClass[]>('http://localhost:3000/member/getBookedClass', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const formattedBookedClasses: ClassItem[] = bookedResponse.data.map(apiClass => ({
        id: apiClass.bookingId, // This is bookingId, for cancellation
        name: apiClass.workoutName || ' ',
        time: apiClass.scheduledTime ? new Date(`1970-01-01T${apiClass.scheduledTime}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A',
        date: apiClass.scheduledDate ? new Date(apiClass.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        capacity: ' ', 
        instructor: ' ', 
        isBooked: true,
      }));
      setBookedClasses(formattedBookedClasses);
    } catch (error: any) {
      console.error('Failed to fetch booked classes:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
          setBookedError('Session expired. Please login again.');
      } else {
          setBookedError('Failed to load your booked classes.');
      }
    } finally {
      setIsLoadingBooked(false);
    }
  };

  const fetchUpcomingClasses = async (token: string) => {
    setIsLoadingUpcoming(true);
    setUpcomingError(null);
    try {
      const upcomingResponse = await axios.get<ApiUpcomingClass[]>('http://localhost:3000/member/getAllClasses', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const formattedUpcomingClasses: ClassItem[] = upcomingResponse.data.map(apiClass => ({
          id: apiClass.classId.toString(), // This is classId, for booking
          name: apiClass.workoutName || 'Fitness Class', 
          time: apiClass.scheduledTime ? new Date(`1970-01-01T${apiClass.scheduledTime}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A',
          date: apiClass.scheduledDate ? new Date(apiClass.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
          capacity: `0/${apiClass.capacity}`, 
          instructor: ' ', 
          isBooked: false, 
      }));
      setUpcomingClasses(formattedUpcomingClasses);
    } catch (error: any) {
      console.error('Failed to fetch upcoming classes:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
          setUpcomingError('Session expired. Please login again.');
      } else {
          setUpcomingError('Failed to load upcoming classes.');
      }
    } finally {
      setIsLoadingUpcoming(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const user = await getUser();
      setCurrentUser(user);
      const token = await getToken();

      if (!token) {
        setBookedError("Authentication token not found. Please login again.");
        setIsLoadingBooked(false);
        setUpcomingError("Authentication token not found. Please login again.");
        setIsLoadingUpcoming(false);
        return;
      }
      await fetchBookedClasses(token);
      await fetchUpcomingClasses(token);
    };

    fetchInitialData();
  }, []);

  const handleCancelClass = (classId: string) => {
    const classToCancel = bookedClasses.find(c => c.id === classId);
    if (classToCancel) {
      setSelectedCancelClass(classToCancel);
    }
  };

  const handleBookClass = (classId: string) => {
    const classToBook = upcomingClasses.find(c => c.id === classId);
    if (classToBook) {
      setSelectedClass(classToBook);
    }
  };

  const handleConfirmBooking = async (classId: string): Promise<boolean> => {
    console.log('Attempting to book class:', classId);
    // Note: classId here is a string, from ClassItem.id which comes from apiClass.classId.toString()
    // The backend API /member/bookClass expects { classId: classId_value }
    // The actual classId in the database is a number. 
    // For Drizzle, string numbers in 'eq' comparisons might work due to type coercion in some DBs, but it's safer to ensure type consistency.
    // However, req.body.classId will be a string from JSON. The controller uses it directly.
    // Let's assume the API handles string `classId` correctly or change it if issues arise.

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Authentication Error", "No session token found. Please log in again.");
        return false;
      }

      // The classId parameter for the API should be the numeric class ID.
      // The `classId` argument to this function is already the correct ID (as a string).
      const response = await axios.post(
        'http://localhost:3000/member/bookClass',
        { classId: classId }, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert("Success!", "Class booked successfully.");
        // Refresh data
        const currentToken = await getToken(); // Re-fetch token in case it was involved in an expiry
        if (currentToken) {
            await fetchBookedClasses(currentToken);
            await fetchUpcomingClasses(currentToken); // To reflect any capacity changes or if it should be removed
        }
        return true;
      } else {
        // This path might not be hit if API throws HTTP errors for business logic failures
        Alert.alert("Booking Failed", response.data.error || "Could not book the class. Please try again.");
        return false;
      }
    } catch (error: any) {
      console.error('Booking request failed:', error);
      let errorMessage = "An unexpected error occurred during booking.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.error || `Booking failed: ${error.response.statusText} (Status: ${error.response.status})`;
        if (error.response.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          // Here you might want to navigate to a login screen or trigger a re-login flow
        }
      }
      Alert.alert("Booking Error", errorMessage);
      return false;
    }
  };

  const handleConfirmCancellation = (classId: string) => {
    console.log('Cancellation confirmed for class:', classId);
    // Here you would typically make an API call to cancel the class
  };

  const handleCloseSheet = () => {
    setSelectedClass(null);
  };

  const handleCloseCancelSheet = () => {
    setSelectedCancelClass(null);
  };

  const renderBookedClass = (classItem: ClassItem) => (
    <View key={classItem.id} style={styles.bookedClassCard}>
      <View style={styles.classHeader}>
      <View style={styles.classInfo}>
      <Text style={styles.classDate}>{classItem.date}</Text>
      <Text style={styles.classTime}>{classItem.time}</Text>
      </View>
        
       {/* <Text style={styles.classCapacity}>{classItem.capacity}</Text> */}
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
    <View key={classItem.id} style={styles.upcomingClassCard}>
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
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => handleBookClass(classItem.id)}
        >
          <Text style={styles.bookButtonText}>Book</Text>
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
          <Text style={styles.welcomeText}>
            Welcome
            {/*, {currentUser?.firstName || 'User'} */} 👋
          </Text>
          {/*}
          <View style={styles.passContainer}>
            <Text style={styles.passText}>Your Pass</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>2/3</Text>
            </View>
          </View>
          */}
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
              {bookedClasses.map(renderBookedClass)}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIcon}>
                <Text style={styles.emptyStateIconText}>📅</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No Booked Classes</Text>
              <Text style={styles.emptyStateDescription}>
                You haven't booked any classes yet. Browse upcoming classes below to get started with your fitness journey.
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
          ) : upcomingClasses.length > 0 ? (
            <View style={styles.upcomingClassesContainer}>
                {upcomingClasses.map(renderUpcomingClass)}
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
    paddingTop: 10,
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
    gap: 12,
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
    width: width - 150,
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
}); 