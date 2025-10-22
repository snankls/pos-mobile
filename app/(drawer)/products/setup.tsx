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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
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

  useEffect(() => {
    if (token) {
      fetchDropdownData();
      if (id) fetchProduct(id as string);
      else resetForm();
    }
  }, [token, id]);

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

      <Text style={styles.label}>SKU</Text>
      <TextInput style={styles.input} value={form.sku} onChangeText={(t) => handleChange('sku', t)} />

      <Text style={styles.label}>Product Name *</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={(t) => handleChange('name', t)} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.category_id}
          onValueChange={(v) => handleChange('category_id', v)}
          style={styles.picker}>
          <Picker.Item label="Select Category" value="" />
          {categories.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={String(c.id)} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Brand</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.brand_id}
          onValueChange={(v) => handleChange('brand_id', v)}
          style={styles.picker}>
          <Picker.Item label="Select Brand" value="" />
          {brands.map((b) => (
            <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Unit</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.unit_id}
          onValueChange={(v) => handleChange('unit_id', v)}
          style={styles.picker}>
          <Picker.Item label="Select Unit" value="" />
          {units.map((u) => (
            <Picker.Item key={u.id} label={u.name} value={String(u.id)} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Cost Price</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={form.cost_price} onChangeText={(t) => handleChange('cost_price', t)} />

      <Text style={styles.label}>Sale Price</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={form.sale_price} onChangeText={(t) => handleChange('sale_price', t)} />

      <Text style={styles.label}>Stock</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={form.stock} onChangeText={(t) => handleChange('stock', t)} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        value={form.description}
        onChangeText={(t) => handleChange('description', t)}
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={form.status} onValueChange={(v) => handleChange('status', v)} style={styles.picker}>
          <Picker.Item label="Active" value="Active" />
          <Picker.Item label="Inactive" value="Inactive" />
        </Picker>
      </View>

      <Text style={styles.label}>Product Image</Text>
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

      <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Product'}</Text>
      </TouchableOpacity>

      {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
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
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
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
    padding: 12,
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
    color: 'red',
    marginBottom: 8,
    fontSize: 13,
  },
  globalError: {
    color: '#fff',
    backgroundColor: '#FF3B30',
    textAlign: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
