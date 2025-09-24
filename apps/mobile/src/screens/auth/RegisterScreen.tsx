import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TrainwiseLogo from '../../components/common/TrainwiseLogo';
import axios from 'axios';
import config from '../../config';
import {storeToken, storeUser } from '../../utils/authStorage';

const { width } = Dimensions.get('window');

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-Z\s]{2,30}$/;
    return nameRegex.test(name.trim());
  };

  // Real-time validation
  const validateField = (field: keyof ValidationErrors, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'firstName':
        if (!value.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (!validateName(value)) {
          newErrors.firstName = 'First name must be 2-30 characters and contain only letters';
        } else {
          delete newErrors.firstName;
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          newErrors.lastName = 'Last name is required';
        } else if (!validateName(value)) {
          newErrors.lastName = 'Last name must be 2-30 characters and contain only letters';
        } else {
          delete newErrors.lastName;
        }
        break;
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'phone':
        if (!value.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(value)) {
          newErrors.phone = 'Phone number must be exactly 10 digits';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'password':
        if (!value.trim()) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          newErrors.password =
            'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        } else {
          delete newErrors.password;
        }
        break;
    }

    setErrors(newErrors);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!validateName(firstName)) {
      newErrors.firstName = 'First name must be 2-30 characters and contain only letters';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!validateName(lastName)) {
      newErrors.lastName = 'Last name must be 2-30 characters and contain only letters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Field change handlers
  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (errors.firstName) {
      validateField('firstName', value);
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (errors.lastName) {
      validateField('lastName', value);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      validateField('email', value);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (errors.phone) {
      validateField('phone', value);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      validateField('password', value);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Register pressed', { firstName, lastName, email, password });
      const response = await axios.post(`${config.BASE_URL}/register`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      if (response.data?.token) {
        await storeToken(response.data.token);
      }

      if (response.data?.user) {
        await storeUser(response.data.user);
      }

      console.log('Register response:', response.data);

      Alert.alert(
        'Registration Successful!',
        'Your account has been created successfully. Please proceed to select your role.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('Pending' as never),
          },
        ],
      );
    } catch (error: any) {
      console.error('Register error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage =
              error.response.data?.message ||
              'Invalid registration data. Please check your information.';
            break;
          case 409:
            errorMessage =
              'An account with this email already exists. Please use a different email or try logging in.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.message || 'Registration failed. Please try again.';
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const isFormValid =
    !Object.keys(errors).length &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    phone.trim() &&
    password.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <TrainwiseLogo width={270} height={54} />
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>FIRST NAME</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                value={firstName}
                onChangeText={handleFirstNameChange}
                onBlur={() => validateField('firstName', firstName)}
                placeholder="John"
                placeholderTextColor="#666"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>LAST NAME</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                value={lastName}
                onChangeText={handleLastNameChange}
                onBlur={() => validateField('lastName', lastName)}
                placeholder="Doe"
                placeholderTextColor="#666"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>PHONE</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={handlePhoneChange}
                onBlur={() => validateField('phone', phone)}
                placeholder="1234567890"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                maxLength={10}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                onBlur={() => validateField('email', email)}
                placeholder="youremail@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => validateField('password', password)}
                placeholder="Enter a strong password"
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              <Text style={styles.passwordHint}>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, (!isFormValid || isLoading) && styles.disabledButton]}
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={navigateToLogin}
              disabled={isLoading}
            >
              <Text style={[styles.loginLinkText, isLoading && styles.disabledText]}>LOGIN</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHint: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
    lineHeight: 14,
  },
  registerButton: {
    backgroundColor: '#9ACD32',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginLinkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  disabledText: {
    opacity: 0.5,
  },
});
