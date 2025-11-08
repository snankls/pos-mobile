import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangePasswordScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  // Separate loading states
  const [screenLoading, setScreenLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [formErrors, setFormErrors] = useState<any>({});

  // 🔹 Simulate fetching user or other initial setup
  useEffect(() => {
    const initialize = async () => {
      try {
        // For example, you might validate token or prefetch something
        await new Promise(resolve => setTimeout(resolve, 1000));
      } finally {
        setScreenLoading(false);
      }
    };
    initialize();
  }, []);

  // Show global loader only when screen initially loads
  if (screenLoading) return <LoadingScreen />;

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
    setMessage('');
    setMessageType('');
  };

  const handleSubmit = async () => {
    if (!form.old_password || !form.new_password || !form.new_password_confirmation) {
      setMessage('Please fill all fields.');
      setMessageType('error');
      return;
    }

    if (form.new_password !== form.new_password_confirmation) {
      setMessage('New and confirm passwords do not match.');
      setMessageType('error');
      return;
    }

    try {
      setSubmitLoading(true);
      setMessage('');
      setMessageType('');
      setFormErrors({});

      const response = await axios.put(
        `${API_URL}/users/change-password`,
        {
          old_password: form.old_password,
          new_password: form.new_password,
          new_password_confirmation: form.new_password_confirmation,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      setMessage(response.data.message || 'Password updated successfully.');
      setMessageType('success');
      setForm({ old_password: '', new_password: '', new_password_confirmation: '' });

      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('Error changing password:', err.response?.data || err.message);

      if (err.response?.status === 422 && err.response?.data?.errors) {
        setFormErrors(err.response.data.errors || {});
        return;
      }

      const msg =
        err.response?.data?.message || 'Failed to update password. Please try again.';
      setMessage(msg);
      setMessageType('error');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Change Password</Text>

        {/* Old Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Old Password *</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input,
                formErrors.old_password && styles.inputError,
                { paddingRight: 40 },
              ]}
              secureTextEntry={!showOldPassword}
              value={form.old_password}
              onChangeText={(text) => handleChange('old_password', text)}
            />
            <TouchableOpacity
              onPress={() => setShowOldPassword(!showOldPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showOldPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#555"
              />
            </TouchableOpacity>
          </View>
          {formErrors.old_password && (
            <Text style={styles.errorText}>{formErrors.old_password[0]}</Text>
          )}
        </View>

        {/* New Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New Password *</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input,
                formErrors.new_password && styles.inputError,
                { paddingRight: 40 },
              ]}
              secureTextEntry={!showNewPassword}
              value={form.new_password}
              onChangeText={(text) => handleChange('new_password', text)}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#555"
              />
            </TouchableOpacity>
          </View>
          {formErrors.new_password && (
            <Text style={styles.errorText}>{formErrors.new_password[0]}</Text>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input,
                formErrors.new_password_confirmation && styles.inputError,
                { paddingRight: 40 },
              ]}
              secureTextEntry={!showConfirmPassword}
              value={form.new_password_confirmation}
              onChangeText={(text) =>
                handleChange('new_password_confirmation', text)
              }
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#555"
              />
            </TouchableOpacity>
          </View>
          {formErrors.new_password_confirmation && (
            <Text style={styles.errorText}>
              {formErrors.new_password_confirmation[0]}
            </Text>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.saveButton, submitLoading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitLoading}
        >
          {submitLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>

        {/* Global Message */}
        {message ? (
          <View
            style={[
              styles.globalMessage,
              messageType === 'success' ? styles.successMessage : styles.errorMessage,
            ]}
          >
            <Text style={styles.globalMessageText}>{message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ==============================
  // LAYOUT & CONTAINER STYLES
  // ==============================
  container: { 
    padding: 16, 
    flexGrow: 1, 
    backgroundColor: '#fff' 
  },

  // ==============================
  // TYPOGRAPHY STYLES
  // ==============================
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  
  label: { 
    fontSize: 15, 
    fontWeight: '500', 
    marginTop: 10 
  },
  
  errorText: { 
    color: '#FF3B30', 
    fontSize: 13, 
    marginTop: 4 
  },
  
  saveButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  
  globalMessageText: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#000' 
  },

  // ==============================
  // FORM & INPUT STYLES
  // ==============================
  fieldGroup: { 
    marginBottom: 10 
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    marginTop: 6,
  },
  
  inputError: { 
    borderColor: '#FF3B30' 
  },
  
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },

  // ==============================
  // STATUS & MESSAGE STYLES
  // ==============================
  globalMessage: { 
    padding: 12, 
    borderRadius: 6, 
    marginTop: 10, 
    alignItems: 'center' 
  },
  
  successMessage: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  
  errorMessage: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
  },
});