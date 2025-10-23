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
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../components/LoadingScreen';

export default function SettingsScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();

  type SettingsForm = {
    invoice_prefix: string;
    invoice_count: string;
    currency_sign: string;
  };

  const [form, setForm] = useState<SettingsForm>({
    invoice_prefix: '',
    invoice_count: '',
    currency_sign: '',
  });

  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // ✅ Only one useEffect to fetch settings
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
        invoice_count: settingsData.invoice_count?.data_value || '',
        currency_sign: settingsData.currency_sign?.data_value || '',
      });
    } catch (err: any) {
      console.error('Error fetching settings:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  // ✅ Loader placed AFTER hooks, so order is stable
  if (loading) return <LoadingScreen />;

  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev: SettingsForm) => ({ ...prev, [field]: value }));
    setErrors((prev: Record<string, string[] | null>) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    if (!form.invoice_prefix || !form.invoice_count || !form.currency_sign) {
      setErrors({
        invoice_prefix: !form.invoice_prefix ? ['This field is required'] : null,
        invoice_count: !form.invoice_count ? ['This field is required'] : null,
        currency_sign: !form.currency_sign ? ['This field is required'] : null,
      });
      setIsLoading(false);
      return;
    }

    try {
      const payload = [
        { data_name: 'invoice_prefix', data_value: form.invoice_prefix },
        { data_name: 'invoice_count', data_value: form.invoice_count },
        { data_name: 'currency_sign', data_value: form.currency_sign },
      ];

      await axios.post(`${API_URL}/settings`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      setSuccessMessage('Settings updated successfully.');
    } catch (err: any) {
      console.error('Update error:', err.response?.data || err.message);
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
        <Text style={styles.label}>Invoice Number Prefix *</Text>
        <TextInput
          style={styles.input}
          value={form.invoice_prefix}
          onChangeText={(text) => handleChange('invoice_prefix', text)}
        />
        {errors.invoice_prefix && <Text style={styles.error}>{errors.invoice_prefix[0]}</Text>}

        {/* Invoice Count */}
        <Text style={styles.label}>Invoice Number Total *</Text>
        <TextInput
          style={styles.input}
          value={form.invoice_count}
          onChangeText={(text) => handleChange('invoice_count', text)}
          keyboardType="numeric"
        />
        {errors.invoice_count && <Text style={styles.error}>{errors.invoice_count[0]}</Text>}

        {/* Currency Sign */}
        <Text style={styles.label}>Currency Sign *</Text>
        <TextInput
          style={styles.input}
          value={form.currency_sign}
          onChangeText={(text) => handleChange('currency_sign', text)}
        />
        {errors.currency_sign && <Text style={styles.error}>{errors.currency_sign[0]}</Text>}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
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
  error: { color: 'red', marginTop: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 6,
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  success: { color: 'green', marginTop: 16, fontWeight: 'bold', textAlign: 'center' },
});
