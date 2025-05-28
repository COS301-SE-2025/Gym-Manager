import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TrainwiseLogo from '../../components/common/TrainwiseLogo';
import axios from 'axios';
import { storeToken, storeUser } from '../../utils/authStorage';

const { width } = Dimensions.get('window');

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Real-time validation
  const validateField = (field: 'email' | 'password', value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value.trim()) {
          newErrors.password = 'Password is required';
        } else if (value.length < 0) {
          newErrors.password = 'Password must be at least 6 characters';
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

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 0) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      validateField('email', value);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      validateField('password', value);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Login pressed', { email, password });
      const response = await axios.post('http://localhost:3000/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });

      console.log('Login response:', response.data);

      if (response.data && response.data.token) {
        await storeToken(response.data.token);
      } else {
        console.error('Login response does not contain a token.');
        Alert.alert('Login Error', 'Invalid response from server. Please try again.');
        return;
      }

      if (response.data && response.data.user) {
        await storeUser(response.data.user);
      } else {
        console.warn('Login response does not contain user information.');
      }

      // Add role-based navigation
      if (response.data && response.data.user && response.data.user.roles) {
        const roles = response.data.user.roles;
        if (roles.includes('member') && roles.includes('coach')) {
          navigation.navigate('RoleSelection' as never);
        } else if (roles.includes('member')) {
          navigation.navigate('Home' as never);
        } else {
          console.warn('User roles not recognized for navigation:', roles);
          navigation.navigate('Home' as never);
        }
      } else {
        console.error('Login response does not contain user roles information.');
        navigation.navigate('Home' as never);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Invalid email or password. Please check your credentials.';
            break;
          case 404:
            errorMessage = 'Account not found. Please check your email or register.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.message || 'Login failed. Please try again.';
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  const isFormValid = !errors.email && !errors.password && email.trim() && password.trim();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <TrainwiseLogo width={280} height={64} />
      </View>

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[
              styles.input,
              errors.email && styles.inputError
            ]}
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
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={[
              styles.input,
              errors.password && styles.inputError
            ]}
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={() => validateField('password', password)}
            placeholder="Enter your password"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Login Button */}
        <TouchableOpacity 
          style={[
            styles.loginButton,
            (!isFormValid || isLoading) && styles.disabledButton
          ]} 
          onPress={handleLogin}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <TouchableOpacity 
          style={styles.registerLink} 
          onPress={navigateToRegister}
          disabled={isLoading}
        >
          <Text style={[
            styles.registerLinkText,
            isLoading && styles.disabledText
          ]}>REGISTER</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 80,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 25,
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
  loginButton: {
    backgroundColor: '#9ACD32',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 150,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  disabledText: {
    opacity: 0.5,
  },
}); 