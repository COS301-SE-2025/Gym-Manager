'use client';
import { useState } from 'react';
import './register.css';
import Image from 'next/image';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

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
        // Also validate confirm password if it's already filled
        if (confirmPassword && value !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (confirmPassword && value === confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
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

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    if (errors.password || errors.confirmPassword) {
      validateField('password', value);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      validateField('confirmPassword', value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setShowSuccess(false);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      setShowSuccess(true);
      
      // Clear form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error: any) {
      console.error('Register error:', error);
      let message = 'An unexpected error occurred. Please try again.';

      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            message =
              error.response.data?.message ||
              'Invalid registration data. Please check your information.';
            break;
          case 409:
            message =
              'An account with this email already exists. Please use a different email.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          default:
            message = error.response.data?.message || 'Registration failed. Please try again.';
        }
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    !Object.keys(errors).length &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    phone.trim() &&
    password.trim() &&
    confirmPassword.trim();

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="logo">
          <Image src="/trainwiselogo.svg" alt="Logo" width={320} height={73} priority />
        </div>
        <div className="register-header">
          <h1>Member Registration</h1>
          <h3>Create your account to get started</h3>
        </div>

        {showSuccess && (
          <div className="success-banner" role="alert" aria-live="polite">
            Registration successful! Your account is pending approval. Download the mobile app from the{' '}
            <a href="/" className="website-link">
              website
            </a>{' '}
            and login to track account status.
          </div>
        )}

        {errorMessage && (
          <div className="error-banner" role="alert" aria-live="polite">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="firstName">FIRST NAME</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              onBlur={() => validateField('firstName', firstName)}
              placeholder="John"
              disabled={isLoading}
              className={errors.firstName ? 'input-error' : ''}
            />
            {errors.firstName && <span className="error-text">{errors.firstName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">LAST NAME</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              onBlur={() => validateField('lastName', lastName)}
              placeholder="Doe"
              disabled={isLoading}
              className={errors.lastName ? 'input-error' : ''}
            />
            {errors.lastName && <span className="error-text">{errors.lastName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">PHONE</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => validateField('phone', phone)}
              placeholder="1234567890"
              maxLength={10}
              disabled={isLoading}
              className={errors.phone ? 'input-error' : ''}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">EMAIL</label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => validateField('email', email)}
              placeholder="youremail@example.com"
              disabled={isLoading}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => validateField('password', password)}
              placeholder="Enter a strong password"
              disabled={isLoading}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
            <span className="password-hint">
              Password must be at least 8 characters with uppercase, lowercase, and number
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              onBlur={() => validateField('confirmPassword', confirmPassword)}
              placeholder="Re-enter your password"
              disabled={isLoading}
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <button
            type="submit"
            className="register-button"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

