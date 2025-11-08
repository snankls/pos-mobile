import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();

  type SettingsForm = {
    invoice_prefix: string;
    invoice_limit: string;
    currency: string;
  };

  const [form, setForm] = useState<SettingsForm>({
    invoice_prefix: '',
    invoice_limit: '',
    currency: '',
  });

  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');

  // Only one useEffect to fetch settings
  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const settingsData = res.data;
      setForm({
        invoice_prefix: settingsData.invoice_prefix?.data_value || '',
        invoice_limit: settingsData.invoice_limit?.data_value || '',
        currency: settingsData.currency?.data_value || '',
      });
    } catch (err: any) {
      console.error('Error fetching settings:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  // Loader placed AFTER hooks, so order is stable
  if (loading) return <LoadingScreen />;

  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev: SettingsForm) => ({ ...prev, [field]: value }));
    setErrors((prev: Record<string, string[] | null>) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    if (!form.invoice_prefix || !form.invoice_limit || !form.currency) {
      setErrors({
        invoice_prefix: !form.invoice_prefix ? ['This field is required'] : null,
        invoice_limit: !form.invoice_limit ? ['This field is required'] : null,
        currency: !form.currency ? ['This field is required'] : null,
      });
      setIsLoading(false);
      return;
    }

    try {
      const payload = [
        { data_name: 'invoice_prefix', data_value: form.invoice_prefix },
        { data_name: 'invoice_limit', data_value: form.invoice_limit },
        { data_name: 'currency', data_value: form.currency },
      ];

      const response = await axios.post(`${API_URL}/settings`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      //setSuccessMessage('Settings updated successfully.');
      setSuccessMessage(response.data?.message || 'Record updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

    } catch (err: any) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to update settings.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      style={{ backgroundColor: '#fff' }}
    >
      <View style={styles.container}>
        {/* Invoice Prefix */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Number Prefix <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={form.invoice_prefix}
            onChangeText={(text) => handleChange('invoice_prefix', text)}
          />
          {errors.invoice_prefix && <Text style={styles.error}>{errors.invoice_prefix[0]}</Text>}
        </View>

        {/* Invoice Count */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Number Limit <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={form.invoice_limit}
            onChangeText={(text) => handleChange('invoice_limit', text)}
            keyboardType="numeric"
          />
          {errors.invoice_limit && <Text style={styles.error}>{errors.invoice_limit[0]}</Text>}
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Currency <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={form.currency}
            onChangeText={(text) => handleChange('currency', text)}
          />
          {errors.currency && <Text style={styles.error}>{errors.currency[0]}</Text>}
        </View>

        {/* Submit */}
        <View style={styles.fieldGroup}>
          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Global Messages */}
        {globalErrorMessage ? (
          <View style={styles.globalErrorContainer}>
            <Ionicons name="warning-outline" size={20} color="#fff" />
            <Text style={styles.globalError}>{globalErrorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.success}>{successMessage}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ==============================
  // LAYOUT & CONTAINER STYLES
  // ==============================
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ==============================
  // FORM & FIELD STYLES
  // ==============================
  fieldGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  
  buttonText: { 
    color: '#fff', 
    marginLeft: 6, 
    fontWeight: '600' 
  },

  // ==============================
  // STATUS & MESSAGE STYLES
  // ==============================
  error: { 
    color: 'red', 
    marginTop: 4 
  },
  
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  
  globalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  
  globalError: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  
  success: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});