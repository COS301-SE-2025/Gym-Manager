import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ClassItem {
  id: string;
  name: string;
  time: string;
  date: string;
  capacity: string;
  instructor: string;
  duration: number;
  isBooked?: boolean;
}

interface BookingSheetProps {
  visible: boolean;
  classItem: ClassItem | null;
  onBook: (classId: string) => Promise<boolean>;
  onClose: () => void;
}

export default function BookingSheet({ visible, classItem, onBook, onClose }: BookingSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setIsBooking(false);
      setBookingError(null);
      // Fade in backdrop
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Slide up sheet
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out backdrop and slide down sheet simultaneously
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!classItem) return null;

  const handleBook = async () => {
    if (isBooking) return;

    setIsBooking(true);
    setBookingError(null);
    try {
      const success = await onBook(classItem.id);
      if (success) {
        onClose();
      } else {
        setBookingError('Booking failed. Please try again or check your connection.');
      }
    } catch (error) {
      console.error('Booking sheet caught error:', error);
      setBookingError('An unexpected error occurred during booking.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.classTitle}>{classItem.name}</Text>
              <View style={styles.capacityBadge}>
                <Text style={styles.capacityText}>{classItem.capacity}</Text>
              </View>
            </View>

            {/* Class Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{classItem.date}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{classItem.time}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Instructor</Text>
                  <Text style={styles.detailValue}>{classItem.instructor}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{classItem.duration} min</Text>
                </View>
              </View> 
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>About this class</Text>
              <Text style={styles.descriptionText}>
                Join us for an intensive workout session designed to challenge your limits and
                improve your fitness. This class combines strength training with cardio exercises
                for a complete workout experience.
              </Text>
            </View>

            {/* Display Booking Error */}
            {bookingError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{bookingError}</Text>
              </View>
            )}

            {/* Book Button */}
            <TouchableOpacity
              style={[styles.bookButtonContainer, isBooking && styles.disabledButton]}
              onPress={handleBook}
              disabled={isBooking}
            >
              <LinearGradient
                colors={isBooking ? ['#aaa', '#999'] : ['#D8FF3E', '#B8E02E']}
                style={styles.bookButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isBooking ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <Text style={styles.bookButtonText}>Book Class</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    paddingBottom: 15,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 15,
  },
  classTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  capacityBadge: {
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  capacityText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    marginRight: 16,
  },
  detailLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  descriptionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bookButtonContainer: {
    marginTop: 'auto',
  },
  disabledButton: {
    opacity: 0.7,
  },
  bookButton: {
    paddingVertical: 18,
    marginBottom: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#D8FF3E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorContainer: {
    backgroundColor: '#4B0000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFC0CB',
    fontSize: 14,
    textAlign: 'center',
  },
});
