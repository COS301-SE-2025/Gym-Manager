import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BackupCodesModalProps {
  visible: boolean;
  backupCodes: string[];
  onClose: () => void;
}

export default function BackupCodesModal({ visible, backupCodes, onClose }: BackupCodesModalProps) {
  const handleCopyCodes = () => {
    const codesText = backupCodes.join('\n');
    // In a real app, you would use Clipboard.setString(codesText)
    Alert.alert(
      'Backup Codes',
      `Your backup codes:\n\n${codesText}\n\nPlease save these codes in a safe place.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#D8FF3E" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#D8FF3E" />
          </View>
          
          <Text style={styles.title}>Two-Factor Authentication Enabled!</Text>
          
          <Text style={styles.description}>
            Your backup codes are listed below. Save them in a safe place - you can use these to access your account if you lose your authenticator device.
          </Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.warningText}>
              Each backup code can only be used once. Store them securely!
            </Text>
          </View>

          <View style={styles.codesContainer}>
            <Text style={styles.codesTitle}>Backup Codes:</Text>
            <ScrollView style={styles.codesList} showsVerticalScrollIndicator={false}>
              {backupCodes.map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <Text style={styles.codeText}>{code}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCodes}>
            <Ionicons name="copy-outline" size={20} color="#1a1a1a" />
            <Text style={styles.copyButtonText}>Copy Codes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D8FF3E',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  warningText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  codesContainer: {
    flex: 1,
    marginBottom: 24,
  },
  codesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D8FF3E',
    marginBottom: 12,
  },
  codesList: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
  },
  codeItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  codeText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    backgroundColor: '#444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  doneButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});
