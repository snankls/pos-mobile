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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('snankls');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
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

    setIsLoading(true);
    setMessage({ text: '', type: null });

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });
      const data = await response.json();

      if (response.ok && data?.data?.authorisation?.token) {
        await login(data.data.authorisation.token, data.data.user);
        setMessage({ text: 'Login successful!', type: 'success' });
      } else {
        setMessage({ text: data.message || 'Login failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
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
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tap anywhere to dismiss keyboard */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
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
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.input, { paddingRight: 40 }]} // Add right padding so text doesn't overlap the icon
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#555"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgot}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
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
