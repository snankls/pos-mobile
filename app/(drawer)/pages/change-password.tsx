import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      setLoading(true);
      setMessage('');
      setMessageType('');

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

      // 🔹 Handle validation errors (422)
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        let combinedErrors = '';

        Object.keys(validationErrors).forEach((key) => {
          combinedErrors += `• ${validationErrors[key].join(', ')}\n`;
        });

        setMessage(combinedErrors.trim());
        setMessageType('error');
        return;
      }

      // 🔹 Handle other API errors
      const msg =
        err.response?.data?.message ||
        'Failed to update password. Please try again.';
      setMessage(msg);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
        </View>

        {/* Old Password */}
        <Text style={styles.label}>Old Password *</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.old_password}
          onChangeText={(text) => handleChange('old_password', text)}
        />

        {/* New Password */}
        <Text style={styles.label}>New Password *</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.new_password}
          onChangeText={(text) => handleChange('new_password', text)}
        />

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.new_password_confirmation}
          onChangeText={(text) =>
            handleChange('new_password_confirmation', text)
          }
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Message (Below Button) */}
        {message ? (
          <View
            style={[
              styles.alertBox,
              messageType === 'success'
                ? styles.alertSuccess
                : styles.alertError,
            ]}
          >
            <Text
              style={[
                styles.alertText,
                { color: messageType === 'success' ? '#065F46' : '#991B1B' },
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  label: { fontSize: 14, color: '#374151', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  alertBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  alertSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  alertError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
  },
  alertText: { fontSize: 14, textAlign: 'center' },
});
