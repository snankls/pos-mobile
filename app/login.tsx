// login.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from './contexts/AuthContext';

const Login = () => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | null }>({
    text: '',
    type: null,
  });

  const handleLogin = async () => {
    if (!identifier || !password) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    // Basic validation
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    setIsLoading(true);
    setMessage({ text: '', type: null });

    // Add timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: isEmail ? identifier : undefined,
          username: !isEmail ? identifier : undefined,
          password: password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('Login response:', data);

      const userData = data?.data?.user;
      const authData = data?.data?.authorisation;

      if (response.ok && authData?.token && userData) {
        // Validate token before proceeding
        if (!isValidToken(authData.token)) {
          setMessage({ 
            text: 'Invalid authentication token received.', 
            type: 'error' 
          });
          return;
        }

        await login(authData.token, userData);
        setIdentifier('');
        setPassword('');
        setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
      } else {
        handleLoginError(response, data);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      handleLoginException(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Error handling for HTTP responses
  const handleLoginError = (response: Response, data: any) => {
    switch (response.status) {
      case 400:
        setMessage({ 
          text: 'Bad request. Please check your input.', 
          type: 'error' 
        });
        break;
      case 401:
        setMessage({ 
          text: 'Invalid credentials. Please check your email/username and password.', 
          type: 'error' 
        });
        break;
      case 403:
        setMessage({ 
          text: 'Access denied. Please contact administrator.', 
          type: 'error' 
        });
        break;
      case 422:
        const validationErrors = data.errors ? 
          Object.values(data.errors).flat().join(', ') : 
          data.message;
        setMessage({ 
          text: validationErrors || 'Please check your input.', 
          type: 'error' 
        });
        break;
      case 429:
        setMessage({ 
          text: 'Too many login attempts. Please try again later.', 
          type: 'error' 
        });
        break;
      case 500:
        setMessage({ 
          text: 'Server error. Please try again later.', 
          type: 'error' 
        });
        break;
      case 503:
        setMessage({ 
          text: 'Service temporarily unavailable. Please try again later.', 
          type: 'error' 
        });
        break;
      default:
        const errorMessage = data?.message || data?.error || `Login failed (${response.status}). Please try again.`;
        setMessage({ text: errorMessage, type: 'error' });
    }
  };

  // Error handling for exceptions
  const handleLoginException = (error: any) => {
    console.error('Login error:', error);
    
    if (error.name === 'AbortError') {
      setMessage({
        text: 'Request timeout. Please check your connection and try again.',
        type: 'error',
      });
    } else if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      setMessage({
        text: 'Network error. Please check your internet connection.',
        type: 'error',
      });
    } else if (error.name === 'SyntaxError') {
      setMessage({
        text: 'Invalid server response. Please contact support.',
        type: 'error',
      });
    } else {
      setMessage({
        text: 'An unexpected error occurred. Please try again.',
        type: 'error',
      });
    }
  };

  // Simple token validation
  const isValidToken = (token: string): boolean => {
    try {
      if (!token || typeof token !== 'string' || token.length < 10) {
        return false;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Basic JWT structure check
      const payload = JSON.parse(atob(parts[1]));
      return !!(payload && payload.exp && payload.iat);
    } catch {
      return false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
          />
          <Text style={styles.subtitle}>Welcome back! Log in to your account.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username / Email address</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* ✅ Message Area */}
          {message.text ? (
            <Text
              style={[
                styles.messageText,
                message.type === 'error' ? styles.errorText : styles.successText,
              ]}
            >
              {message.text}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoImage: {
    width: 150,
    height: (206 / 283) * 150,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    color: '#D9534F',
  },
  successText: {
    color: '#28A745',
  },
});

export default Login;
