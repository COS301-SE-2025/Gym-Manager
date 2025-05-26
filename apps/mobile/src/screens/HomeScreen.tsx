import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import IconLogo from '../components/common/IconLogo';

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

export default function HomeScreen() {
  const bookedClasses: ClassItem[] = [
    {
      id: '1',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
      isBooked: true,
    },
    {
      id: '2',
      name: 'Workout 2',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
      isBooked: true,
    },
  ];

  const upcomingClasses: ClassItem[] = [
    {
      id: '2',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
    },
    {
      id: '3',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
    },
    {
      id: '4',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
    },
    {
      id: '5',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
      },
    {
      id: '6',
      name: 'Workout 1',
      time: '06:00',
      date: 'Tomorrow',
      capacity: '8/12',
      instructor: 'John Doe',
    },
  ];

  const handleCancelClass = (classId: string) => {
    console.log('Cancel class:', classId);
  };

  const handleBookClass = (classId: string) => {
    console.log('Book class:', classId);
  };

  const renderBookedClass = (classItem: ClassItem) => (
    <View key={classItem.id} style={styles.bookedClassCard}>
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
          <Text style={styles.welcomeText}>Welcome, Jason 👋</Text>
          <View style={styles.passContainer}>
            <Text style={styles.passText}>Your Pass</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>2/3</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Booked Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booked Classes</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookedClassesContainer}
            style={styles.bookedClassesScrollView}
          >
            {bookedClasses.map(renderBookedClass)}
          </ScrollView>
        </View>

        {/* Upcoming Classes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <View style={styles.upcomingClassesContainer}>
            {upcomingClasses.map(renderUpcomingClass)}
          </View>
        </View>
      </ScrollView>
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
}); 