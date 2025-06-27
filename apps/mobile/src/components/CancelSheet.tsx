import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
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
}

interface CancelSheetProps {
  visible: boolean;
  classItem: ClassItem | null;
  onCancel: (classId: string) => void;
  onClose: () => void;
}

export default function CancelSheet({ visible, classItem, onCancel, onClose }: CancelSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
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

  const handleCancel = () => {
    onCancel(classItem.id);
    onClose();
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
                  <Text style={styles.detailValue}>60 min</Text>
                </View>
              </View>
            </View>

            {/* Cancellation Warning */}
            <View style={styles.warningContainer}>
              <Text style={styles.warningTitle}>Cancel Booking</Text>
              <Text style={styles.warningText}>
                Are you sure you want to cancel your booking for this class? This action cannot be
                undone and your spot will be made available to other members.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.keepButton} onPress={onClose}>
                <Text style={styles.keepButtonText}>Keep Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButtonContainer} onPress={handleCancel}>
                <LinearGradient
                  colors={['#FF4444', '#CC3333']}
                  style={styles.cancelButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.cancelButtonText}>Cancel Class</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  warningContainer: {
    marginBottom: 32,
  },
  warningTitle: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  warningText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  keepButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#555',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  keepButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonContainer: {
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
