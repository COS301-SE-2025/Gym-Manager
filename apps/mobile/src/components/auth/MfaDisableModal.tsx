import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfaPasswordService } from '../../services/mfaPasswordService';

interface MfaDisableModalProps {
  visible: boolean;
  onClose: () => void;
  onMfaDisabled: () => void;
}

export default function MfaDisableModal({ visible, onClose, onMfaDisabled }: MfaDisableModalProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleDisableMfa = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter the verification code from your authenticator app.');
      return;
    }

    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await mfaPasswordService.disableMfa(token);
              Alert.alert('Success', 'Two-factor authentication has been disabled.', [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                    onMfaDisabled();
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disable MFA. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setToken('');
    setShowToken(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#D8FF3E" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-outline" size={48} color="#FF6B6B" />
          </View>
          
          <Text style={styles.title}>Disable Two-Factor Authentication</Text>
          
          <Text style={styles.description}>
            Enter the 6-digit code from your authenticator app to disable two-factor authentication.
          </Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.warningText}>
              Disabling two-factor authentication will make your account less secure.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Verification Code</Text>
            <View style={styles.tokenInputWrapper}>
              <TextInput
                style={styles.tokenInput}
                value={token}
                onChangeText={setToken}
                placeholder="123456"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry={!showToken}
                autoFocus
              />
              <TouchableOpacity 
                onPress={() => setShowToken(!showToken)} 
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showToken ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.disableButton} 
              onPress={handleDisableMfa}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.disableButtonText}>Disable MFA</Text>
              )}
            </TouchableOpacity>
          </View>
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
    color: '#FF6B6B',
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
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D8FF3E',
    marginBottom: 8,
  },
  tokenInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  tokenInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  eyeButton: {
    padding: 16,
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
  disableButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
