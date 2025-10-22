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
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

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
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Modal states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // 🔹 Load current user and cities
  useEffect(() => {
    if (token) {
      Promise.all([fetchCurrentUser(), fetchCities()]);
    }
  }, [token]);

  // 🔹 Filter cities based on search
  useEffect(() => {
    if (citySearch) {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities);
    }
  }, [citySearch, cities]);

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

      // ✅ Set image preview if user has an image
      const imageUrl = user?.images?.image_name
        ? `${IMAGE_URL}/uploads/users/${user.images.image_name}`
        : null;

      if (imageUrl) {
        setImagePreview(imageUrl);
      }

    } catch (err: any) {
      console.error('Error loading current user:', err.response?.data || err.message);
      setGlobalError('Failed to load user data.');
    } finally {
      setFetching(false);
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

  if (fetching) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Edit Profile</Text>

      {/* First Name */}
      <Text style={styles.label}>First Name *</Text>
      <TextInput
        style={styles.input}
        value={form.first_name}
        onChangeText={(text) => handleChange('first_name', text)}
      />
      {errors.first_name && <Text style={styles.error}>{errors.first_name[0]}</Text>}

      {/* Last Name */}
      <Text style={styles.label}>Last Name *</Text>
      <TextInput
        style={styles.input}
        value={form.last_name}
        onChangeText={(text) => handleChange('last_name', text)}
      />
      {errors.last_name && <Text style={styles.error}>{errors.last_name[0]}</Text>}

      {/* Username */}
      <Text style={styles.label}>Username *</Text>
      <TextInput
        style={styles.input}
        value={form.username}
        onChangeText={(text) => handleChange('username', text)}
      />
      {errors.username && <Text style={styles.error}>{errors.username[0]}</Text>}

      {/* Email */}
      <Text style={styles.label}>Email Address *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: '#F3F4F6' }]}
        editable={false}
        value={form.email}
      />

      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth *</Text>
      <TouchableOpacity 
        style={styles.input}
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
      
      {/* Select City - Modal Version */}
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

      {/* Gender - Modal Version */}
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

      {/* Phone */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={form.phone_number}
        onChangeText={(text) => handleChange('phone_number', text)}
      />

      {/* Address */}
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        multiline
        value={form.address}
        onChangeText={(text) => handleChange('address', text)}
      />

      {/* Image Upload */}
      <Text style={styles.label}>Upload Image</Text>
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

      {/* Submit */}
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
            <Text style={styles.buttonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>

      {globalError ? <Text style={[styles.message, styles.errorText]}>{globalError}</Text> : null}
      {successMsg ? <Text style={[styles.message, styles.successText]}>{successMsg}</Text> : null}

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
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor="#999"
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
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityName}>{item.name}</Text>
                  </View>
                  {form.city_id === String(item.id) && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyModal}>
                  <Ionicons name="location-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyModalText}>
                    {citySearch ? 'No cities found' : 'No cities available'}
                  </Text>
                  <Text style={styles.emptyModalSubtext}>
                    {citySearch 
                      ? 'Try a different search term' 
                      : 'No cities found in the system'
                    }
                  </Text>
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
                <Ionicons name="close" size={24} color="#333" />
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
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 4, color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalTriggerText: {
    color: '#374151',
    fontSize: 16,
  },
  modalTriggerPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  error: { color: '#DC2626', fontSize: 12, marginBottom: 8 },
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#F0F7FF',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 15,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  message: { textAlign: 'center', marginTop: 10 },
  errorText: { color: '#DC2626' },
  successText: { color: '#16A34A' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles from your provided stylesheet
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
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    borderColor: '#ddd',
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
    borderBottomColor: '#f5f5f5',
  },
  selectedModalItem: {
    backgroundColor: '#f0f8ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
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
  emptyModalSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});