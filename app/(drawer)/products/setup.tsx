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
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProductsSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [form, setForm] = useState({
    id: '',
    sku: '',
    name: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    cost_price: '',
    sale_price: '',
    stock: '',
    description: '',
    status: 'Active',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalError, setGlobalError] = useState('');

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'brand' | 'unit' | 'status' | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetchDropdownData();
      if (id) fetchProduct(id as string);
      else resetForm();
    }
  }, [token, id]);

  useEffect(() => {
    // Filter data based on search query
    if (searchQuery) {
      const filtered = modalData.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(modalData);
    }
  }, [searchQuery, modalData]);

  const resetForm = () => {
    setForm({
      id: '',
      sku: '',
      name: '',
      category_id: '',
      brand_id: '',
      unit_id: '',
      cost_price: '',
      sale_price: '',
      stock: '',
      description: '',
      status: 'Active',
    });
    setImagePreview(null);
    setImageFile(null);
    setIsImageDeleted(false);
    setFormErrors({});
  };

  const fetchDropdownData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [catRes, brandRes, unitRes] = await Promise.all([
        axios.get(`${API_URL}/categories`, { headers }),
        axios.get(`${API_URL}/brands`, { headers }),
        axios.get(`${API_URL}/units`, { headers }),
      ]);

      setCategories(catRes.data?.data || catRes.data || []);
      setBrands(brandRes.data?.data || brandRes.data || []);
      setUnits(unitRes.data?.data || unitRes.data || []);
    } catch (error) {
      console.error('Error loading dropdowns:', error);
    }
  };

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const product = res.data;

      setForm({
        id: product.id?.toString() ?? '',
        sku: product.sku ?? '',
        name: product.name ?? '',
        category_id: product.category_id?.toString() ?? '',
        brand_id: product.brand_id?.toString() ?? '',
        unit_id: product.unit_id?.toString() ?? '',
        cost_price: product.cost_price?.toString() ?? '',
        sale_price: product.sale_price?.toString() ?? '',
        stock: product.stock?.toString() ?? '',
        description: product.description ?? '',
        status: product.status ?? 'Active',
      });

      const imageName =
        product.image_url ||
        product.image_name ||
        product.images?.image_name ||
        null;

      if (imageName) {
        setImagePreview(`${IMAGE_URL}/uploads/products/${imageName}`);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      setGlobalError('Failed to load product data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  // Modal functions
  const openModal = (type: 'category' | 'brand' | 'unit' | 'status') => {
    setModalType(type);
    setSearchQuery('');
    
    switch (type) {
      case 'category':
        setModalData(categories);
        setModalTitle('Select Category');
        break;
      case 'brand':
        setModalData(brands);
        setModalTitle('Select Brand');
        break;
      case 'unit':
        setModalData(units);
        setModalTitle('Select Unit');
        break;
      case 'status':
        setModalData([
          { id: 'Active', name: 'Active' },
          { id: 'Inactive', name: 'Inactive' }
        ]);
        setModalTitle('Select Status');
        break;
    }
    
    setModalVisible(true);
  };

  const handleSelectItem = (item: any) => {
    if (!modalType) return;

    const fieldMap = {
      category: 'category_id',
      brand: 'brand_id',
      unit: 'unit_id',
      status: 'status'
    };

    handleChange(fieldMap[modalType], item.id);
    setModalVisible(false);
    setSearchQuery(''); // Clear search when item is selected
  };

  // Fixed selection functions - they now properly find the selected item
  const getSelectedCategoryName = () => {
    if (!form.category_id) return 'Select One';
    
    // First try to find in the main categories array
    const selectedCategory = categories.find(cat => String(cat.id) === String(form.category_id));
    
    // If not found in main array, try to find in any data we have
    if (!selectedCategory && modalType === 'category') {
      const fromModal = modalData.find(cat => String(cat.id) === String(form.category_id));
      return fromModal ? fromModal.name : 'Select Category';
    }
    
    return selectedCategory ? selectedCategory.name : 'Select Category';
  };

  const getSelectedBrandName = () => {
    if (!form.brand_id) return 'Select One';
    
    const selectedBrand = brands.find(brand => String(brand.id) === String(form.brand_id));
    
    if (!selectedBrand && modalType === 'brand') {
      const fromModal = modalData.find(brand => String(brand.id) === String(form.brand_id));
      return fromModal ? fromModal.name : 'Select Brand';
    }
    
    return selectedBrand ? selectedBrand.name : 'Select Brand';
  };

  const getSelectedUnitName = () => {
    if (!form.unit_id) return 'Select One';
    
    const selectedUnit = units.find(unit => String(unit.id) === String(form.unit_id));
    
    if (!selectedUnit && modalType === 'unit') {
      const fromModal = modalData.find(unit => String(unit.id) === String(form.unit_id));
      return fromModal ? fromModal.name : 'Select Unit';
    }
    
    return selectedUnit ? selectedUnit.name : 'Select Unit';
  };

  const clearSearch = () => {
    setSearchQuery('');
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
        type: 'image/jpeg',
      });
      setImagePreview(image.uri);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setIsImageDeleted(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setGlobalError('');
      setFormErrors({});

      // Validation - check if required fields are filled
      if (!form.name) {
        setFormErrors({ name: ['Product name is required'] });
        setLoading(false);
        return;
      }

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
          formData.append('product_image', new File([blob], filename, { type: blob.type }));
        } else {
          formData.append('product_image', {
            uri: imageFile.uri,
            name: imageFile.name || 'photo.jpg',
            type: imageFile.type || 'image/jpeg',
          } as any);
        }
      }

      formData.append('isImageDeleted', isImageDeleted ? '1' : '0');

      const response = await axios.post(`${API_URL}/products`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      });

      if (response.status === 200 || response.status === 201) {
        resetForm();
        router.push('/(drawer)/products/lists');
      } else {
        setGlobalError(response.data.message || 'Unexpected response from server.');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
      } else {
        setGlobalError('Failed to save product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = ({ item }: { item: any }) => {
    // Get the current field value based on modal type
    let currentValue = '';
    switch (modalType) {
      case 'category':
        currentValue = form.category_id;
        break;
      case 'brand':
        currentValue = form.brand_id;
        break;
      case 'unit':
        currentValue = form.unit_id;
        break;
      case 'status':
        currentValue = form.status;
        break;
    }

    const isSelected = String(currentValue) === String(item.id);

    return (
      <TouchableOpacity
        style={[styles.modalItem, isSelected && styles.selectedModalItem]}
        onPress={() => handleSelectItem(item)}
      >
        <Text style={styles.modalItemText}>{item.name}</Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyModal = () => (
    <View style={styles.emptyModal}>
      <Ionicons name="search-outline" size={48} color="#999" />
      <Text style={styles.emptyModalText}>
        {searchQuery ? 'No results found' : 'No items available'}
      </Text>
      {searchQuery && (
        <Text style={[styles.emptyModalText, { fontSize: 14 }]}>
          Try searching with different keywords
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(drawer)/products/lists')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>SKU</Text>
        <TextInput 
          style={[styles.input, formErrors.sku && styles.inputError]} 
          value={form.sku} 
          onChangeText={(t) => handleChange('sku', t)} 
        />
        {formErrors.sku && <Text style={styles.errorText}>{formErrors.sku[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput 
          style={[styles.input, formErrors.name && styles.inputError]} 
          value={form.name} 
          onChangeText={(t) => handleChange('name', t)} 
        />
        {formErrors.name && <Text style={styles.errorText}>{formErrors.name[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity 
          style={[styles.modalTrigger, formErrors.category_id && styles.inputError]}
          onPress={() => openModal('category')}
        >
          <Text style={form.category_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {getSelectedCategoryName()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {formErrors.category_id && <Text style={styles.errorText}>{formErrors.category_id[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Brand</Text>
        <TouchableOpacity 
          style={[styles.modalTrigger, formErrors.brand_id && styles.inputError]}
          onPress={() => openModal('brand')}
        >
          <Text style={form.brand_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {getSelectedBrandName()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {formErrors.brand_id && <Text style={styles.errorText}>{formErrors.brand_id[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Unit</Text>
        <TouchableOpacity 
          style={[styles.modalTrigger, formErrors.unit_id && styles.inputError]}
          onPress={() => openModal('unit')}
        >
          <Text style={form.unit_id ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
            {getSelectedUnitName()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {formErrors.unit_id && <Text style={styles.errorText}>{formErrors.unit_id[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Cost Price</Text>
        <TextInput 
          style={[styles.input, formErrors.cost_price && styles.inputError]} 
          keyboardType="numeric" 
          value={form.cost_price} 
          onChangeText={(t) => handleChange('cost_price', t)} 
        />
        {formErrors.cost_price && <Text style={styles.errorText}>{formErrors.cost_price[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Sale Price</Text>
        <TextInput 
          style={[styles.input, formErrors.sale_price && styles.inputError]} 
          keyboardType="numeric" 
          value={form.sale_price} 
          onChangeText={(t) => handleChange('sale_price', t)} 
        />
        {formErrors.sale_price && <Text style={styles.errorText}>{formErrors.sale_price[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Stock</Text>
        <TextInput 
          style={[styles.input, formErrors.stock && styles.inputError]} 
          keyboardType="numeric" 
          value={form.stock} 
          onChangeText={(t) => handleChange('stock', t)} 
        />
        {formErrors.stock && <Text style={styles.errorText}>{formErrors.stock[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }, formErrors.description && styles.inputError]}
          multiline
          value={form.description}
          onChangeText={(t) => handleChange('description', t)}
        />
        {formErrors.description && <Text style={styles.errorText}>{formErrors.description[0]}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity 
          style={styles.modalTrigger}
          onPress={() => openModal('status')}
        >
          <Text style={styles.modalTriggerText}>{form.status}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Upload Image</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={20} color="#007AFF" />
          <Text style={styles.uploadButtonText}>Upload Image</Text>
        </TouchableOpacity>

        {imagePreview && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity onPress={handleRemoveImage} style={styles.closeIconContainer}>
              <Ionicons name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Product'}</Text>
      </TouchableOpacity>

      {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar - Only show for category, brand, unit */}
            {(modalType === 'category' || modalType === 'brand' || modalType === 'unit') && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${modalTitle.toLowerCase()}...`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            
            <FlatList
              data={filteredData}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={
                filteredData.length === 0 
                  ? styles.modalListContentEmpty 
                  : styles.modalListContent
              }
              ListEmptyComponent={renderEmptyModal}
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