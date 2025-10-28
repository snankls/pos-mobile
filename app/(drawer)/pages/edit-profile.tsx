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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import LoadingScreen from '../../components/LoadingScreen';

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
  const [image, setImage] = useState<any>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Modal states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // 🔹 Load current user and cities initially
  useEffect(() => {
    if (token) {
      Promise.all([fetchCurrentUser(), fetchCities()]).finally(() => {
        setLoading(false); // ✅ hide loader after both finish
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
      setGlobalError('Failed to load user data.');
    }
  };

  // 🔹 Fetch cities
  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API_URL}/cities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const citiesData = res.data.data || res.data;
      setCities(citiesData);
      setFilteredCities(citiesData);
    } catch (err: any) {
      console.error('Error loading cities:', err.response?.data || err.message);
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  // 🔹 Handle input change
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: null }));
  };

  // 🔹 Pick image
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setIsImageDeleted(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0]);
      setImagePreview(result.assets[0].uri);
      setIsImageDeleted(false); // Reset the flag when new image is selected
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
    setGlobalError('');
    setSuccessMsg('');
    
    if (!form.first_name || !form.last_name || !form.username || !form.gender) {
      setGlobalError('Please fill all required fields.');
      return;
    }
    
    if (!userId) {
      setGlobalError('User ID not found.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // ✅ Add image deletion flag
      formData.append('isImageDeleted', isImageDeleted ? '1' : '0');

      if (image) {
        formData.append('user_image', {
          uri: image.uri,
          name: image.fileName || 'profile.jpg',
          type: image.mimeType || 'image/jpeg',
        } as any);
      }

      const res = await axios.post(`${API_URL}/users/${userId}?_method=PUT`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      });

      setSuccessMsg(res.data.message || 'Profile updated successfully.');
      
      // ✅ Only refresh user data if image was NOT deleted
      // If image was deleted, we already have the correct state locally
      if (!isImageDeleted) {
        fetchCurrentUser();
      }
      
      // ✅ Reset the image deletion flag after successful update
      setIsImageDeleted(false);
      
    } catch (err: any) {
      console.error('Update error:', err.response?.data || err.message);
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setGlobalError(err.response?.data?.message || 'Failed to update user.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* First Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.first_name && styles.inputError]}
          value={form.first_name}
          onChangeText={(text) => handleChange('first_name', text)}
        />
        {errors.first_name && <Text style={styles.errorText}>{errors.first_name[0]}</Text>}
      </View>

      {/* Last Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={[styles.input, errors.last_name && styles.inputError]}
          value={form.last_name}
          onChangeText={(text) => handleChange('last_name', text)}
        />
        {errors.last_name && <Text style={styles.errorText}>{errors.last_name[0]}</Text>}
      </View>

      {/* Username */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={[styles.input, errors.username && styles.inputError]}
          value={form.username}
          onChangeText={(text) => handleChange('username', text)}
        />
        {errors.username && <Text style={styles.errorText}>{errors.username[0]}</Text>}
      </View>

      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: '#F3F4F6' }]}
          editable={false}
          value={form.email}
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth</Text>
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
      </View>

      {/* Select City */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Select City</Text>
        <TouchableOpacity 
          style={styles.modalTrigger}
          onPress={() => setCityModalVisible(true)}
        >
          <Text style={form.city_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {getSelectedCityName()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Gender */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Select Gender *</Text>
        <TouchableOpacity 
          style={styles.modalTrigger}
          onPress={() => setGenderModalVisible(true)}
        >
          <Text style={form.gender ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {form.gender || 'Select Gender'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
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
        <Text style={styles.label}>Profile Image</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={20} color="#007AFF" />
          <Text style={styles.uploadButtonText}>Upload Image</Text>
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
      {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
      {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

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
  );
}

const styles = StyleSheet.create({
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
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
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
  modalTriggerText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  modalTriggerPlaceholder: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
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
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  globalError: {
    color: '#fff',
    backgroundColor: '#FF3B30',
    textAlign: 'center',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  success: {
    color: '#fff',
    backgroundColor: '#34C759',
    textAlign: 'center',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
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
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
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
  modalItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  emptyModal: {
    alignItems: 'center',
    padding: 40,
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});