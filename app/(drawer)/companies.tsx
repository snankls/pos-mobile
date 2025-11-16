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
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

export default function CompaniesScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token, user } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<any>({
    id: '',
    name: '',
    address: '',
    image: null
  });

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');

  // Fetch company record
  useEffect(() => {
    if (user?.company_id) {
      fetchCompany(user.company_id);
    }
  }, [user]);

  const fetchCompany = async (companyId: number) => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_URL}/user/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data || res.data;

      if (!data) {
        setCompany({ id: '', name: '', address: '', image: null });
        setImagePreview(null);
        return;
      }

      const imageFileName =
        data.image_name || data.images?.image_name || null;

      setCompany({
        id: data.id,
        name: data.name,
        address: data.address,
        image: imageFileName
      });

      imageFileName
        ? setImagePreview(`${IMAGE_URL}/companies/${imageFileName}`)
        : setImagePreview(null);

    } catch (error: any) {
      console.error("Fetch error:", error.response?.data || error.message);
      setGlobalErrorMessage("Failed to load company data.");
    } finally {
      setLoading(false);
    }
  };

  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const handleFileSelected = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        console.log('Permission Denied', 'Please allow photo access to upload images.');
        return;
      }

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
      setGlobalErrorMessage('Failed to pick image.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCompany({ ...company, [field]: value });
    setFormErrors({ ...formErrors, [field]: '' });
    setGlobalErrorMessage('');
    setSuccessMessage('');
  };

  const updateRecord = async () => {
    if (!company.id) {
      setGlobalErrorMessage('No company record found to update.');
      return;
    }

    if (!company.name?.trim()) {
      setFormErrors({ name: ['Company name is required'] });
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setGlobalErrorMessage('');
    setFormErrors({});

    try {
      const formData = new FormData();
      formData.append('name', company.name?.trim() || '');
      formData.append('address', company.address?.trim() || '');
      formData.append('_method', 'PUT');

      const isLocalImage = imagePreview?.startsWith('file:') || imagePreview?.startsWith('data:');
      if (isLocalImage) {
        const filename = (company.name || 'company').replace(/\s+/g, '_') + '.jpg';
        formData.append('company_image', {
          uri: imagePreview,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      const response = await axios.post(`${API_URL}/companies/${company.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(response.data?.message || 'Record updated successfully!');
      fetchCompany(company.id);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

    } catch (error: any) {
      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
      } else {
        setGlobalErrorMessage(error.response?.data?.message || 'Failed to update company. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={60} color="#007AFF" />
        </View>
        <Text style={styles.title}>Edit Company</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Company Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Company Name <Text style={styles.errorText}>*</Text></Text>
        <TextInput
          style={[styles.input, formErrors.name && styles.inputError]}
          value={company.name || ''}
          onChangeText={(text) => handleInputChange('name', text)}
        />
        {formErrors.name && <Text style={styles.errorText}>{formErrors.name[0]}</Text>}
      </View>

      {/* Address */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea, formErrors.address && styles.inputError]}
          value={company.address || ''}
          onChangeText={(text) => handleInputChange('address', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {formErrors.address && <Text style={styles.errorText}>{formErrors.address[0]}</Text>}
      </View>

      {/* Image Upload */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Image <Text style={styles.errorText}>*</Text></Text>
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={handleFileSelected}
          disabled={isLoading}
        >
          <Ionicons name="image-outline" size={20} color="#007AFF" />
          <Text style={styles.uploadButtonText}>Select Image</Text>
        </TouchableOpacity>
        {formErrors.company_image && (
          <Text style={styles.errorText}>{formErrors.company_image[0]}</Text>
        )}

        {imagePreview && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={updateRecord}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ==============================
  // LAYOUT & CONTAINER STYLES
  // ==============================
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  // ==============================
  // TYPOGRAPHY STYLES
  // ==============================
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },

  // ==============================
  // FORM & INPUT STYLES
  // ==============================
  fieldGroup: {
    marginBottom: 20,
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: '#333',
  },
  
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FEF2F2',
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    backgroundColor: '#F0F7FF',
  },
  
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  saveButtonDisabled: {
    opacity: 0.6,
  },
  
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ==============================
  // IMAGE & MEDIA STYLES
  // ==============================
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },

  // ==============================
  // STATUS & MESSAGE STYLES
  // ==============================
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
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