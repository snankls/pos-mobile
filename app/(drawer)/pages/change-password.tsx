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
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function ChangePasswordScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  // ✅ Separate loading states
  const [screenLoading, setScreenLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [formErrors, setFormErrors] = useState<any>({});

  // 🔹 Simulate fetching user or other initial setup
  useEffect(() => {
    const initialize = async () => {
      try {
        // For example, you might validate token or prefetch something
        await new Promise(resolve => setTimeout(resolve, 1000)); // simulate API delay
      } finally {
        setScreenLoading(false); // ✅ hide global loader after setup
      }
    };
    initialize();
  }, []);

  // ✅ Show global loader only when screen initially loads
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Change Password</Text>

        {/* Old Password */}
        <Text style={styles.label}>Old Password *</Text>
        <TextInput
          style={[styles.input, formErrors.old_password && styles.inputError]}
          secureTextEntry
          value={form.old_password}
          onChangeText={(text) => handleChange('old_password', text)}
        />
        {formErrors.old_password && (
          <Text style={styles.errorText}>{formErrors.old_password[0]}</Text>
        )}

        {/* New Password */}
        <Text style={styles.label}>New Password *</Text>
        <TextInput
          style={[styles.input, formErrors.new_password && styles.inputError]}
          secureTextEntry
          value={form.new_password}
          onChangeText={(text) => handleChange('new_password', text)}
        />
        {formErrors.new_password && (
          <Text style={styles.errorText}>{formErrors.new_password[0]}</Text>
        )}

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={[
            styles.input,
            formErrors.new_password_confirmation && styles.inputError,
          ]}
          secureTextEntry
          value={form.new_password_confirmation}
          onChangeText={(text) => handleChange('new_password_confirmation', text)}
        />
        {formErrors.new_password_confirmation && (
          <Text style={styles.errorText}>
            {formErrors.new_password_confirmation[0]}
          </Text>
        )}

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
  container: { padding: 16, flexGrow: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '500', marginTop: 10 },
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
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 4 },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  globalMessage: { padding: 12, borderRadius: 6, marginTop: 10, alignItems: 'center' },
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
  globalMessageText: { fontSize: 14, textAlign: 'center', color: '#000' },
});
