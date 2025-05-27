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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TrainwiseLogo from '../../components/common/TrainwiseLogo';
import axios from 'axios';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const navigation = useNavigation();

  const handleRegister = () => {
    // Handle registration logic here
    console.log('Register pressed', { firstName, lastName, email, password });
    axios.post('http://localhost:3000/register', { firstName, lastName, email, phone, password })
        .then(response => {
        console.log('Register response:', response.data);
        navigation.navigate('RoleSelection' as never);
      })
      .catch(error => {
        console.error('Register error:', error);
      });

  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <TrainwiseLogo width={270} height={54} />
      </View>

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Full Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>FIRST NAME</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
            placeholderTextColor="#666"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Last Name Input */}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>LAST NAME</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Pork"
            placeholderTextColor="#666"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>PHONE</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="1234567890"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="youremail@example.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="12345"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity style={styles.loginLink} onPress={navigateToLogin}>
          <Text style={styles.loginLinkText}>LOGIN</Text>
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
    marginTop: 20,
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
  registerButton: {
    backgroundColor: '#9ACD32',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  registerButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
}); 