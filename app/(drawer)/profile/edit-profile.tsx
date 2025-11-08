import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function EditProfileScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    date_of_birth: '',
    gender: '',
    city_id: '',
    phone_number: '',
    address: '',
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<any>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');

  // Modal states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // 🔹 Load current user and cities initially
  useEffect(() => {
    if (token) {
      Promise.all([fetchCurrentUser(), fetchCities()]).finally(() => {
        setLoading(false);
      });
    }
  }, [token]);

  // 🔹 Fetch user from current-user API
  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/current-user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = res.data.data ? res.data.data : res.data;

      setUserId(String(user.id));
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        email: user.email || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        city_id: user.city_id ? String(user.city_id) : '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });

      if (user?.images?.image_name) {
        setImagePreview(`${IMAGE_URL}/users/${user.images.image_name}`);
      }
    } catch (err: any) {
      console.error('Error loading current user:', err.response?.data || err.message);
      setGlobalErrorMessage('Failed to load user data.');
    }
  };

  // 🔹 Fetch cities
  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API_URL}/active/cities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const citiesData = res.data.data || res.data;
      setCities(citiesData);
      setFilteredCities(citiesData);
    } catch (err: any) {
      console.error('Error loading cities:', err.response?.data || err.message);
    }
  };

  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  // 🔹 Handle input change
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: null }));
  };

  // 🔹 Pick image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setIsImageDeleted(true);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Allow photo access to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const image = result.assets[0];
      
      // Create proper file object for FormData
      const imageFile = {
        uri: image.uri,
        name: image.fileName || `photo_${Date.now()}.jpg`,
        type: 'image/jpeg', // Default type
      };

      setImageFile(imageFile);
      setImagePreview(image.uri);
      setIsImageDeleted(false);
    }
  };

  // 🔹 Handle city selection
  const handleCitySelect = (city: any) => {
    handleChange('city_id', String(city.id));
    setCityModalVisible(false);
    setCitySearch('');
  };

  // 🔹 Handle gender selection
  const handleGenderSelect = (gender: string) => {
    handleChange('gender', gender);
    setGenderModalVisible(false);
  };

  // 🔹 Get selected city name
  const getSelectedCityName = () => {
    if (!form.city_id) return 'Select City';
    const selectedCity = cities.find(city => String(city.id) === form.city_id);
    return selectedCity ? selectedCity.name : 'Select City';
  };

  // Date handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleChange('date_of_birth', formattedDate);
      setSelectedDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // Submit handler - update the success part
  const handleSubmit = async () => {
    setErrors({});
    setGlobalErrorMessage('');
    setSuccessMessage('');

    if (!userId) {
      Alert.alert('Error', 'User ID not found.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      // ✅ Append all fields but skip empty or null values (important for nullable date)
      Object.entries(form).forEach(([key, value]) => {
        if (value === '' || value === undefined || value === null) {
          return; // skip empty fields
        }
        formData.append(key, String(value));
      });

      // ✅ Handle image upload
      if (imageFile) {
        formData.append('user_image', imageFile);
      }

      // ✅ Handle image delete flag
      if (isImageDeleted) {
        formData.append('delete_image', '1');
      }

      // ✅ Submit the form
      const res = await axios.post(`${API_URL}/users/${userId}?_method=PUT`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      // ✅ Show success message smoothly
      setSuccessMessage(res.data?.message || 'Profile updated successfully!');

      // Auto-hide message after fadeout
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

      // ✅ Refresh updated user info
      await fetchCurrentUser();

      // ✅ Reset image deletion flags
      setIsImageDeleted(false);
      setImageFile(null);
    } catch (err: any) {
      console.error('Update failed:', err.response?.data || err.message);

      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else if (err.response?.data?.message) {
        setGlobalErrorMessage(err.response.data.message);
      } else if (err.message === 'Network Error') {
        setGlobalErrorMessage('Network error — please check your internet connection.');
      } else {
        setGlobalErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* First Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First Name <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.first_name && styles.inputError]}
            value={form.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
          />
          {errors.first_name && <Text style={styles.errorText}>{errors.first_name[0]}</Text>}
        </View>

        {/* Last Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last Name <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.last_name && styles.inputError]}
            value={form.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
          />
          {errors.last_name && <Text style={styles.errorText}>{errors.last_name[0]}</Text>}
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.username && styles.inputError]}
            value={form.username}
            onChangeText={(text) => handleChange('username', text)}
          />
          {errors.username && <Text style={styles.errorText}>{errors.username[0]}</Text>}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address <Text style={styles.errorText}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#F3F4F6' }]}
            editable={false}
            value={form.email}
          />
        </View>

        {/* Date of Birth */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date of Birth <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity 
            style={styles.modalTrigger}
            onPress={showDatepicker}
          >
            <Text style={form.date_of_birth ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
              {form.date_of_birth || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          {errors.date_of_birth && <Text style={styles.errorText}>{errors.date_of_birth[0]}</Text>}
        </View>

        {/* Select City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select City <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity 
            style={styles.modalTrigger}
            onPress={() => setCityModalVisible(true)}
          >
            <Text style={form.city_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
              {getSelectedCityName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          {errors.city_id && <Text style={styles.errorText}>{errors.city_id[0]}</Text>}
        </View>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select Gender <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity 
            style={styles.modalTrigger}
            onPress={() => setGenderModalVisible(true)}
          >
            <Text style={form.gender ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
              {form.gender || 'Select Gender'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          {errors.gender && <Text style={styles.errorText}>{errors.gender[0]}</Text>}
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, errors.phone_number && styles.inputError]}
            value={form.phone_number}
            onChangeText={(text) => handleChange('phone_number', text)}
          />
          {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number[0]}</Text>}
        </View>

        {/* Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, { height: 80 }, errors.address && styles.inputError]}
            multiline
            value={form.address}
            onChangeText={(text) => handleChange('address', text)}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address[0]}</Text>}
        </View>

        {/* Image Upload */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Image <Text style={styles.imageNote}>(Max size 5MB)</Text></Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={20} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Select Image</Text>
          </TouchableOpacity>

          {imagePreview && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imagePreview }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={handleRemoveImage} style={styles.closeIconContainer}>
                <Ionicons name="close-circle" size={26} color="red" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
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

        {/* City Selection Modal */}
        <Modal
          visible={cityModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setCityModalVisible(false);
            setCitySearch('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select City</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setCityModalVisible(false);
                    setCitySearch('');
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search cities..."
                  value={citySearch}
                  onChangeText={setCitySearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {citySearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setCitySearch('')}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredCities}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      form.city_id === String(item.id) && styles.selectedModalItem
                    ]}
                    onPress={() => handleCitySelect(item)}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    {form.city_id === String(item.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModal}>
                    <Ionicons name="search-outline" size={48} color="#999" />
                    <Text style={styles.emptyModalText}>
                      {citySearch ? 'No results found' : 'No cities available'}
                    </Text>
                    {citySearch && (
                      <Text style={[styles.emptyModalText, { fontSize: 14 }]}>
                        Try searching with different keywords
                      </Text>
                    )}
                  </View>
                }
                contentContainerStyle={filteredCities.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
              />
            </View>
          </View>
        </Modal>

        {/* Gender Selection Modal */}
        <Modal
          visible={genderModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setGenderModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <TouchableOpacity 
                  onPress={() => setGenderModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={['Male', 'Female', 'Other']}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      form.gender === item && styles.selectedModalItem
                    ]}
                    onPress={() => handleGenderSelect(item)}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                    {form.gender === item && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalListContent}
              />
            </View>
          </View>
        </Modal>
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
    backgroundColor: '#fff',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  closeIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
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
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },

  imageNote: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
  },
  
  modalTriggerText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  modalTriggerPlaceholder: {
    fontSize: 16,
  },
  
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  
  // globalError: {
  //   color: '#fff',
  //   backgroundColor: '#FF3B30',
  //   textAlign: 'center',
  //   padding: 12,
  //   borderRadius: 6,
  //   marginTop: 10,
  // },
  
  // success: {
  //   color: '#fff',
  //   backgroundColor: '#34C759',
  //   textAlign: 'center',
  //   padding: 12,
  //   borderRadius: 6,
  //   marginTop: 10,
  // },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  
  modalItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },

  // ==============================
  // FORM & INPUT STYLES
  // ==============================
  fieldGroup: {
    marginBottom: 16,
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  
  inputError: {
    borderColor: '#FF3B30',
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#F0F7FF',
  },
  
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  
  closeButton: {
    padding: 4,
  },
  
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },

  // ==============================
  // MODAL & LIST STYLES
  // ==============================
  modalListContent: {
    paddingBottom: 16,
  },
  
  modalListContentEmpty: {
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  
  selectedModalItem: {
    backgroundColor: '#F0F8FF',
  },
  
  emptyModal: {
    alignItems: 'center',
    padding: 40,
  },

  // ==============================
  // IMAGE & MEDIA STYLES
  // ==============================
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  
  searchIcon: {
    marginRight: 8,
  },
});