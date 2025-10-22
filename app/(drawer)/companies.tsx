import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function CompaniesScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;
  const { token } = useAuth();

  const [company, setCompany] = useState<any>({
    id: '',
    name: '',
    description: '',
    image: null
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');

  // ✅ Fetch company record
  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      setIsLoading(true);

      const res = await axios.get(`${API_URL}/user/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Handle both array and object API responses
      let data = Array.isArray(res.data) ? res.data[0] : res.data?.data || res.data;

      if (!data) {
        setCompany({ id: '', name: '', description: '', image: null });
        setImagePreview(null);
        return;
      }

      // ✅ Safely extract image filename
      const imageFileName = data.image_name || data.images?.image_name || null;

      setCompany({
        id: data.id || '',
        name: data.name || '',
        description: data.description || '',
        image: imageFileName,
      });

      if (imageFileName) {
        const fullImageUrl = `${IMAGE_URL}/uploads/companies/${imageFileName}`;
        setImagePreview(fullImageUrl);
      } else {
        setImagePreview(null);
      }

    } catch (error: any) {
      console.error('Fetch error:', error.response?.data || error.message);
      setGlobalErrorMessage('Failed to load company data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelected = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImagePreview(selectedImage.uri);
        setCompany({ ...company, image: selectedImage.uri });
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCompany({ ...company, [field]: value });
    setFormErrors({ ...formErrors, [field]: '' });
  };

  const updateRecord = async () => {
    if (!company.id) {
      setGlobalErrorMessage('No company record found to update.');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setGlobalErrorMessage('');
    setFormErrors({});

    try {
      const formData = new FormData();
      formData.append('name', company.name || '');
      formData.append('description', company.description || '');
      formData.append('_method', 'PUT');

      if (imagePreview && imagePreview.startsWith('file')) {
        const filename = (company.name || 'company').replace(/\s+/g, '_') + '.jpg';
        formData.append('company_image', {
          uri: imagePreview,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      await axios.post(`${API_URL}/companies/${company.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage('Company updated successfully!');
      fetchCompany();
    } catch (error: any) {
      console.error('Update error:', error.response?.data || error.message);
      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
      } else {
        setGlobalErrorMessage(error.response?.data?.message || 'Update failed.');
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
      <Text style={styles.title}>Edit Company</Text>

      {/* Company Name */}
      <Text style={styles.label}>Company Name *</Text>
      <TextInput
        style={styles.input}
        value={company.name || ''}
        onChangeText={(text) => handleInputChange('name', text)}
      />
      {formErrors.name && <Text style={styles.error}>{formErrors.name[0]}</Text>}

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={company.description || ''}
        onChangeText={(text) => handleInputChange('description', text)}
        multiline
      />
      {formErrors.description && <Text style={styles.error}>{formErrors.description[0]}</Text>}

      {/* Image Upload */}
      <Text style={styles.label}>Company Image</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={handleFileSelected}>
        <Ionicons name="image-outline" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Select Image</Text>
      </TouchableOpacity>

      {imagePreview && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imagePreview }} style={styles.preview} />
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
        onPress={updateRecord}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
      </TouchableOpacity>

      {globalErrorMessage ? <Text style={styles.globalError}>{globalErrorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
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
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    width: '100%',
    backgroundColor: '#F0F7FF',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  preview: {
    width: 150,
    height: 150,
    borderRadius: 6,
    marginTop: 12,
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
