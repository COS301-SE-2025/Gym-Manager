import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfaPasswordService, MfaSetupResponse, MfaEnableResponse } from '../../services/mfaPasswordService';

interface MfaSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onMfaEnabled: (backupCodes: string[]) => void;
}

export default function MfaSetupModal({ visible, onClose, onMfaEnabled }: MfaSetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [mfaData, setMfaData] = useState<MfaSetupResponse | null>(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      generateMfaSecret();
    } else {
      // Reset state when modal closes
      setStep('setup');
      setMfaData(null);
      setToken('');
    }
  }, [visible]);

  const generateMfaSecret = async () => {
    try {
      setIsLoading(true);
      const data = await mfaPasswordService.generateMfaSecret();
      setMfaData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate MFA setup. Please try again.');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter the verification code from your authenticator app.');
      return;
    }

    try {
      setIsLoading(true);
      const result: MfaEnableResponse = await mfaPasswordService.enableMfa(token);
      onMfaEnabled(result.backupCodes);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSetupStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Set Up Two-Factor Authentication</Text>
      <Text style={styles.description}>
        Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
      </Text>
      
      {mfaData && (
        <View style={styles.qrContainer}>
          {/* Note: In a real app, you'd render the QR code image here */}
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code would be displayed here</Text>
            <Text style={styles.secretText}>Secret: {mfaData.secret}</Text>
          </View>
        </View>
      )}

      <Text style={styles.instructions}>
        1. Install an authenticator app on your phone{'\n'}
        2. Scan the QR code above{'\n'}
        3. Enter the 6-digit code from your app
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={() => setStep('verify')}
          disabled={!mfaData}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Verify Setup</Text>
      <Text style={styles.description}>
        Enter the 6-digit code from your authenticator app
      </Text>

      <TextInput
        style={styles.tokenInput}
        value={token}
        onChangeText={setToken}
        placeholder="123456"
        keyboardType="numeric"
        maxLength={6}
        autoFocus
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => setStep('setup')}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleVerifyToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.continueButtonText}>Verify & Enable</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#D8FF3E" />
          </TouchableOpacity>
        </View>

        {isLoading && !mfaData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D8FF3E" />
            <Text style={styles.loadingText}>Setting up MFA...</Text>
          </View>
        ) : (
          <>
            {step === 'setup' && renderSetupStep()}
            {step === 'verify' && renderVerifyStep()}
          </>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D8FF3E',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D8FF3E',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  secretText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  instructions: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  tokenInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 16,
  },
});
