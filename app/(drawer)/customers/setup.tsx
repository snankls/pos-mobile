import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomersSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [form, setForm] = useState({
    id: '',
    code: '',
    name: '',
    cnic: '',
    email_address: '',
    mobile_number: '',
    phone_number: '',
    whatsapp: '',
    city_id: '',
    credit_balance: '',
    credit_limit: '',
    status: 'Active',
    address: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalError, setGlobalError] = useState('');

  // Modal states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // 🔁 Load data
  useEffect(() => {
    if (token) {
      fetchCities();
      fetchStatus();
      
      if (id)
        fetchCustomer(id as string);
      else
        resetForm();
    }
  }, [token, id]);

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

  const fetchStatus = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.data && typeof res.data.data === 'object') {
        const statusData = res.data.data;
        const statusArray = Object.entries(statusData).map(([key, value]) => ({
          id: key,
          key: key,
          value: value
        }));
        setStatusOptions(statusArray);
      }
    } catch (err: any) {
      console.error('Fetch status error:', err);
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      code: '',
      name: '',
      cnic: '',
      email_address: '',
      mobile_number: '',
      phone_number: '',
      whatsapp: '',
      city_id: '',
      credit_balance: '',
      credit_limit: '',
      status: 'Active',
      address: '',
    });
    setImagePreview(null);
    setImageFile(null);
    setIsImageDeleted(false);
    setFormErrors({});
    setCitySearch('');
  };

  // ✅ Fetch Cities
  const fetchCities = async () => {
    try {
      const response = await axios.get(`${API_URL}/cities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const citiesData = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      setCities(citiesData);
      setFilteredCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
      setFilteredCities([]);
    }
  };

  const fetchCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customer = res.data;

      setForm({
        id: customer.id?.toString() ?? '',
        code: customer.code ?? '',
        name: customer.name ?? '',
        cnic: customer.cnic ?? '',
        email_address: customer.email_address ?? '',
        mobile_number: customer.mobile_number ?? '',
        phone_number: customer.phone_number ?? '',
        whatsapp: customer.whatsapp ?? '',
        city_id: customer.city_id?.toString() ?? '',
        credit_balance: customer.credit_balance?.toString() ?? '',
        credit_limit: customer.credit_limit?.toString() ?? '',
        status: customer.status ?? 'Active',
        address: customer.address ?? '',
      });

      const imageName =
        customer.image_url ||
        customer.image_name ||
        customer.images?.image_name ||
        null;

      if (imageName) {
        setImagePreview(`${IMAGE_URL}/customers/${imageName}`);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      setGlobalError('Failed to load customer data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
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

    if (!result.canceled) {
      const image = result.assets[0];
      setImageFile({
        uri: image.uri,
        name: image.uri.split('/').pop(),
        type: image.type ? `image/${image.type}` : 'image/jpeg',
      });
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

  // 🔹 Handle status selection
  const handleStatusSelect = (status: string) => {
    handleChange('status', status);
    setStatusModalVisible(false);
  };

  // 🔹 Get selected city name
  const getSelectedCityName = () => {
    if (!form.city_id) return 'Select One';
    const selectedCity = cities.find(city => String(city.id) === form.city_id);
    return selectedCity ? selectedCity.name : 'Select City';
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setGlobalError('');
      setFormErrors({});

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (imageFile?.uri) {
        if (Platform.OS === 'web') {
          const response = await fetch(imageFile.uri);
          const blob = await response.blob();
          const filename = imageFile.name || 'photo.jpg';
          formData.append('customer_image', new File([blob], filename, { type: blob.type }));
        } else {
          formData.append('customer_image', {
            uri: imageFile.uri,
            name: imageFile.name || 'photo.jpg',
            type: imageFile.type || 'image/jpeg',
          } as any);
        }
      }

      formData.append('isImageDeleted', isImageDeleted ? '1' : '0');

      let url = `${API_URL}/customers`;
      let method = 'POST';

      if (id) {
        url = `${API_URL}/customers/${id}`;
        method = 'PUT';
        formData.append('_method', 'PUT');
      }

      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      });

      // ✅ Handle success
      if (response.status === 200 || response.status === 201) {
        resetForm();
        setImagePreview(null);
        setImageFile(null);
        setIsImageDeleted(false);
        router.push('/(drawer)/customers/lists');
      } else {
        setGlobalError(response.data.message || 'Unexpected response from server.');
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);

      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
      } else {
        setGlobalError('Failed to save customer. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(drawer)/customers/lists')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? 'Edit Customer' : 'Add Customer'}</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* ID/Code */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>ID/Code <Text style={styles.errorText}>*</Text></Text>
        <TextInput 
          style={[styles.input, formErrors.code && styles.inputError]} 
          value={form.code} 
          onChangeText={(t) => handleChange('code', t)} 
        />
        {formErrors.code && <Text style={styles.errorText}>{formErrors.code[0]}</Text>}
      </View>

      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Name <Text style={styles.errorText}>*</Text></Text>
        <TextInput 
          style={[styles.input, formErrors.name && styles.inputError]} 
          value={form.name} 
          onChangeText={(t) => handleChange('name', t)} 
        />
        {formErrors.name && <Text style={styles.errorText}>{formErrors.name[0]}</Text>}
      </View>

      {/* CNIC */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>CNIC <Text style={styles.errorText}>*</Text></Text>
        <TextInput 
          style={[styles.input, formErrors.cnic && styles.inputError]} 
          value={form.cnic} 
          onChangeText={(t) => handleChange('cnic', t)} 
        />
        {formErrors.cnic && <Text style={styles.errorText}>{formErrors.cnic[0]}</Text>}
      </View>

      {/* Email Address */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput 
          style={styles.input} 
          value={form.email_address} 
          onChangeText={(t) => handleChange('email_address', t)} 
        />
      </View>

      {/* Mobile Number */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput 
          style={styles.input} 
          value={form.mobile_number} 
          onChangeText={(t) => handleChange('mobile_number', t)} 
        />
      </View>

      {/* Phone Number */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput 
          style={styles.input} 
          value={form.phone_number} 
          onChangeText={(t) => handleChange('phone_number', t)} 
        />
      </View>

      {/* Whatsapp */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Whatsapp</Text>
        <TextInput 
          style={styles.input} 
          value={form.whatsapp} 
          placeholder='+923001234567'
          onChangeText={(t) => handleChange('whatsapp', t)} 
        />
      </View>

      {/* City - Modal Version */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Select City</Text>
        <TouchableOpacity 
          style={[styles.modalTrigger, formErrors.city_id && styles.inputError]}
          onPress={() => setCityModalVisible(true)}
        >
          <Text style={form.city_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {getSelectedCityName()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {formErrors.city_id && <Text style={styles.errorText}>{formErrors.city_id[0]}</Text>}
      </View>

      {/* Credit Balance */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Credit Balance</Text>
        <TextInput 
          style={[styles.input, formErrors.credit_balance && styles.inputError]} 
          value={form.credit_balance || '0'} 
          keyboardType="numeric" 
          onChangeText={(text) => handleChange('credit_balance', text)} 
        />
        {formErrors.credit_balance && <Text style={styles.errorText}>{formErrors.credit_balance[0]}</Text>}
      </View>

      {/* Credit Limit */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Credit Limit</Text>
        <TextInput 
          style={[styles.input, formErrors.credit_limit && styles.inputError]} 
          value={form.credit_limit || '0'} 
          keyboardType="numeric" 
          onChangeText={(text) => handleChange('credit_limit', text)} 
        />
        {formErrors.credit_limit && <Text style={styles.errorText}>{formErrors.credit_limit[0]}</Text>}
      </View>

      {/* Address */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          value={form.address}
          onChangeText={(t) => handleChange('address', t)}
        />
      </View>

      {/* Status - Modal Version */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity 
          style={styles.modalTrigger}
          onPress={() => setStatusModalVisible(true)}
        >
          <Text style={form.status ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {form.status || 'Select Status'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Image Upload */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Image</Text>
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
        onPress={handleSubmit} 
        style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changing</Text>
        )}
      </TouchableOpacity>

      {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}

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
                  <Text style={styles.modalItemText}>{item.name}</Text>
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
                </View>
              }
              contentContainerStyle={filteredCities.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
            />
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity 
                onPress={() => setStatusModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    form.status === item.key && styles.selectedModalItem
                  ]}
                  onPress={() => handleStatusSelect(item.key)}
                >
                  <Text style={styles.modalItemText}>{item.value}</Text>
                  {form.status === item.key && (
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
  backButton: {
    padding: 4,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    color: '#1C1C1E',
    fontSize: 16,
  },
  modalTriggerPlaceholder: {
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
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
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  globalError: {
    color: '#fff',
    backgroundColor: '#FF3B30',
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