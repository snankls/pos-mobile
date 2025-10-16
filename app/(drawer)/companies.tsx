import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function CompaniesScreen() {
  const { token } = useAuth(); // Get token from auth context
  const [company, setCompany] = useState({ id: '', name: '', description: '', image: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string>('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Fetch company record
  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${token}`, // send token
        },
      });
      const data = res.data[0];
      setCompany({ ...data });
      if (data.image) setImagePreview(data.image);
    } catch (error: any) {
      console.log(error);
      setGlobalErrorMessage(error.response?.data?.message || 'Failed to load company data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCompany({ ...company, [field]: value });
    setFormErrors({ ...formErrors, [field]: '' });
  };

  const handleFileSelected = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImagePreview(uri);
      setCompany({ ...company, image: uri });
    }
  };

  const updateRecord = async () => {
    setIsLoading(true);
    setSuccessMessage('');
    setGlobalErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('company_name', company.name);
      formData.append('description', company.description);
      if (company.image && !company.image.startsWith('http')) {
        const filename = company.image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename!);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('image', { uri: company.image, name: filename!, type } as any);
      }

      const res = await axios.put(`${API_URL}/companies/${company.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`, // send token
        },
      });

      setSuccessMessage('Company updated successfully!');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setGlobalErrorMessage(error.response?.data?.message || 'Something went wrong.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !company.id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Ionicons name="business-outline" size={50} color="#007AFF" />
      <Text style={styles.title}>Companies</Text>

      {globalErrorMessage ? <Text style={styles.globalError}>{globalErrorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      {/* Company Name */}
      <Text style={styles.label}>Company Name *</Text>
      <TextInput
        style={styles.input}
        value={company.name}
        onChangeText={(text) => handleInputChange('name', text)}
      />
      {formErrors.company_name && <Text style={styles.error}>{formErrors.company_name[0]}</Text>}

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={company.description}
        onChangeText={(text) => handleInputChange('description', text)}
        multiline
      />
      {formErrors.description && <Text style={styles.error}>{formErrors.description[0]}</Text>}

      {/* Image Upload */}
      <Text style={styles.label}>Upload Image (max 5MB)</Text>
      <TouchableOpacity style={styles.fileButton} onPress={handleFileSelected}>
        <Text style={{ color: '#fff' }}>Choose Image</Text>
      </TouchableOpacity>
      {formErrors.image && <Text style={styles.error}>{formErrors.image[0]}</Text>}

      {imagePreview ? <Image source={{ uri: imagePreview }} style={styles.preview} /> : null}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
        onPress={updateRecord}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 16,
    color: '#007AFF',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    marginTop: 12,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  fileButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  preview: {
    width: 150,
    height: 150,
    marginTop: 12,
    borderRadius: 6,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: '#ff3b30',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  globalError: {
    color: '#ff3b30',
    marginVertical: 8,
    textAlign: 'center',
  },
  success: {
    color: 'green',
    marginVertical: 8,
    textAlign: 'center',
  },
});
