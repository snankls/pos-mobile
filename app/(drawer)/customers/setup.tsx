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
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function CustomersSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const UPLOAD_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH;

  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [form, setForm] = useState({
    id: '',
    code: '',
    name: '',
    cnic: '',
    email_address: '',
    phone_number: '',
    mobile_number: '',
    city_id: '',
    credit_balance: '',
    credit_limit: '',
    status: 'Active',
    address: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalError, setGlobalError] = useState('');

  // 🔁 Load data
  useEffect(() => {
    if (token) {
      fetchCities();
      if (id) fetchCustomer(id as string);
      else resetForm();
    }
  }, [token, id]);

  const resetForm = () => {
    setForm({
      id: '',
      code: '',
      name: '',
      cnic: '',
      email_address: '',
      phone_number: '',
      mobile_number: '',
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
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
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
        phone_number: customer.phone_number ?? '',
        mobile_number: customer.mobile_number ?? '',
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
        setImagePreview(`${UPLOAD_PATH}/uploads/customers/${imageName}`);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      setGlobalError('Failed to load customer data.');
    } finally {
      setLoading(false);
    }
  };

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // correct enum
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
    }
  };


  const handleSubmit = async () => {
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    if (imageFile?.uri) {
      if (Platform.OS === 'web') {
        // Convert blob URI to File
        const response = await fetch(imageFile.uri);
        const blob = await response.blob();
        const filename = imageFile.name || 'photo.jpg';
        formData.append('customer_image', new File([blob], filename, { type: blob.type }));
      } else {
        // Native devices
        formData.append('customer_image', {
          uri: imageFile.uri,
          name: imageFile.name || 'photo.jpg',
          type: imageFile.type || 'image/jpeg',
        } as any);
      }
    }

    formData.append('isImageDeleted', isImageDeleted ? '1' : '0');

    await axios.post(`${API_URL}/customers`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
      },
    });
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
      <Text style={styles.title}>{id ? 'Edit Customer' : 'Add Customer'}</Text>

      <Text style={styles.label}>Code *</Text>
      <TextInput style={styles.input} value={form.code} onChangeText={(t) => handleChange('code', t)} />
      {formErrors.code && <Text style={styles.errorText}>{formErrors.code[0]}</Text>}

      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={(t) => handleChange('name', t)} />
      {formErrors.name && <Text style={styles.errorText}>{formErrors.name[0]}</Text>}

      <Text style={styles.label}>CNIC *</Text>
      <TextInput style={styles.input} value={form.cnic} onChangeText={(t) => handleChange('cnic', t)} />
      {formErrors.cnic && <Text style={styles.errorText}>{formErrors.cnic[0]}</Text>}

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={form.email_address} onChangeText={(t) => handleChange('email_address', t)} />

      <Text style={styles.label}>Mobile</Text>
      <TextInput style={styles.input} value={form.mobile_number} onChangeText={(t) => handleChange('mobile_number', t)} />

      {/* Credit Balance */}
      <Text style={styles.label}>Credit Balance</Text>
      <TextInput style={styles.input} value={form.credit_balance} keyboardType="numeric" onChangeText={(text) => handleChange('credit_balance', text)} />
      {formErrors.credit_balance && <Text style={styles.errorText}>{formErrors.credit_balance[0]}</Text>}

      {/* Credit Limit */}
      <Text style={styles.label}>Credit Limit</Text>
      <TextInput style={styles.input} value={form.credit_limit} keyboardType="numeric" onChangeText={(text) => handleChange('credit_limit', text)} />
      {formErrors.credit_limit && <Text style={styles.errorText}>{formErrors.credit_limit[0]}</Text>}

      {/* City */}
       <Text style={styles.label}>Select City</Text>
       <View style={styles.pickerContainer}>
         <Picker
           selectedValue={form.city_id}
           onValueChange={(value) => handleChange('city_id', value)}
           style={styles.picker}
         >
           <Picker.Item label="Select City" value="" />
           {cities.map((city) => (
             <Picker.Item key={city.id} label={city.name} value={String(city.id)} />
           ))}
         </Picker>
       </View>
       {formErrors.city_id && <Text style={styles.errorText}>{formErrors.city_id[0]}</Text>}

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        value={form.address}
        onChangeText={(t) => handleChange('address', t)}
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.status}
          onValueChange={(v) => handleChange('status', v)}
          style={styles.picker}>
          <Picker.Item label="Active" value="Active" />
          <Picker.Item label="Inactive" value="Inactive" />
        </Picker>
      </View>

      <Text style={styles.label}>Image</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
        <Ionicons name="image-outline" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Upload Image</Text>
      </TouchableOpacity>

      {imagePreview ? (
        <View>
          <Image
            source={{ uri: imagePreview }}
            style={{ width: 150, height: 150, borderRadius: 5, marginTop: 10 }}
          />
          <TouchableOpacity onPress={handleRemoveImage} style={styles.closeIconContainer}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </View>
      ) : (
        <Image
          source={require('../../../assets/images/placeholder.jpg')}
          style={{ width: 150, height: 150, borderRadius: 5, marginTop: 10 }}
        />
      )}

      <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

      {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
    </ScrollView>
  );
}


// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Alert
// } from 'react-native';
// import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
// import * as ImagePicker from 'expo-image-picker';
// import axios from 'axios';
// import { Picker } from '@react-native-picker/picker';
// import { useAuth } from '../../contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';
// import { useCallback } from 'react';

// export default function CustomersSetupScreen() {
//   const API_URL = process.env.EXPO_PUBLIC_API_URL;
//   const UPLOAD_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH;

//   const { token } = useAuth();
//   const { refresh } = useLocalSearchParams();
//   const [customers, setCustomers] = useState([]);
//   const router = useRouter();
//   const { id } = useLocalSearchParams();

//   const [form, setForm] = useState({
//     id: '',
//     code: '',
//     name: '',
//     cnic: '',
//     email_address: '',
//     phone_number: '',
//     mobile_number: '',
//     city_id: '',
//     credit_balance: '',
//     credit_limit: '',
//     status: 'Active',
//     address: '',
//     image_url: '',
//   });
  
//   const emptyForm = {
//     id: '',
//     code: '',
//     name: '',
//     cnic: '',
//     email_address: '',
//     phone_number: '',
//     mobile_number: '',
//     city_id: '',
//     credit_balance: '',
//     credit_limit: '',
//     status: 'Active',
//     address: '',
//     image_url: '',
//   };

//   const [cities, setCities] = useState<any[]>([]);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [isImageDeleted, setIsImageDeleted] = useState(false);
//   const [editStatus, setEditStatus] = useState('Active');
//   const [loading, setLoading] = useState(false);
//   const [formErrors, setFormErrors] = useState<any>({});
//   const [globalError, setGlobalError] = useState('');
//   const [refreshing, setRefreshing] = useState(false);

//   const handleAddNewCustomer = () => {
//     setForm({
//       id: '',
//       code: '',
//       name: '',
//       cnic: '',
//       email_address: '',
//       phone_number: '',
//       mobile_number: '',
//       city_id: '',
//       credit_balance: '',
//       credit_limit: '',
//       status: 'Active',
//       address: '',
//       image_url: '',
//     });
//     setImagePreview(null);
//     setEditStatus('Active');
//     router.push('/customers/setup'); // or your route
//   };

//   // 🔁 Automatically refresh when coming back from setup
//   useEffect(() => {
//     if (!id) {
//       setForm({
//         id: '',
//         code: '',
//         name: '',
//         cnic: '',
//         email_address: '',
//         phone_number: '',
//         mobile_number: '',
//         city_id: '',
//         credit_balance: '',
//         credit_limit: '',
//         status: 'Active',
//         address: '',
//         image_url: '',
//       });
//       setImagePreview(null);
//       setEditStatus('Active');
//     }

//     if (token) {
//       fetchCities();
//       if (id) fetchCustomer(id as string);
//     }
//   }, [token, id]);


//   const onRefresh = () => {
//     setRefreshing(true);
//     if (token) {
//       if (id) fetchCustomer(id as string);
//     }
//   };

//   // ✅ Always fetch data when token and id are ready
//   useEffect(() => {
//     if (token) {
//       fetchCities();
//       if (id) fetchCustomer(id as string);
//     }
//   }, [token, id]);

//   // ✅ Fetch Cities
//   const fetchCities = async () => {
//     try {
//       const response = await axios.get(`${API_URL}/cities`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const citiesData = Array.isArray(response.data)
//         ? response.data
//         : response.data.data || [];
//       setCities(citiesData);
//     } catch (error) {
//       console.error('Error loading cities:', error);
//       setCities([]);
//     }
//   };

//   // Fetch Single Customer
//   const fetchCustomer = async (customerId: string) => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${API_URL}/customers/${customerId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const customer = res.data;
//       setForm({
//         id: customer.id?.toString() ?? '',
//         code: customer.code ?? '',
//         name: customer.name ?? '',
//         cnic: customer.cnic ?? '',
//         email_address: customer.email_address ?? '',
//         phone_number: customer.phone_number ?? '',
//         mobile_number: customer.mobile_number ?? '',
//         city_id: customer.city_id?.toString() ?? '',
//         credit_balance: customer.credit_balance?.toString() ?? '',
//         credit_limit: customer.credit_limit?.toString() ?? '',
//         status: customer.status ?? 'Active',
//         address: customer.address ?? '',
//         image_url:
//         customer.image_url ??
//         customer.image_name ??
//         customer.images?.image_name ??
//         '',
//       });

//       if (
//         customer.image_url ||
//         customer.image_name ||
//         customer.images?.image_name
//       ) {
//         setImagePreview(
//           `${UPLOAD_PATH}/uploads/customers/${
//             customer.image_url ||
//             customer.image_name ||
//             customer.images?.image_name
//           }`
//         );
//       } else {
//         setImagePreview(null);
//       }
//     } catch (err) {
//       console.error('Customer fetch error:', err);
//       setGlobalError('Failed to load customer data.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Controlled input change
//   const handleChange = (field: string, value: any) => {
//     setForm((prev) => ({ ...prev, [field]: value }));
//     setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
//   };

//   // Image Picker
//   const handlePickImage = async () => {
//     try {
//       const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (permissionResult.granted === false) {
//         Alert.alert("Permission Denied", "You need to allow access to your photo library.");
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         quality: 0.8,
//       });

//       if (!result.canceled) {
//         const selectedImage = result.assets[0];
//         setImagePreview(selectedImage.uri);

//         // ✅ Store file object in form for FormData upload
//         const localUri = selectedImage.uri;
//         const filename = localUri.split('/').pop() || `image_${Date.now()}.jpg`;
//         const match = /\.(\w+)$/.exec(filename);
//         const type = match ? `image/${match[1]}` : `image`;

//         setForm((prev) => ({
//           ...prev,
//           image_url: {
//             uri: localUri,
//             name: filename,
//             type,
//           },
//         }));
//       }
//     } catch (error) {
//       console.error("Image picking error:", error);
//     }
//   };

//   // Submit form
//   const handleSubmit = async () => {
//     try {
//     const formData = new FormData();

//     Object.keys(form).forEach((key) => {
//       if (form[key] !== null && form[key] !== undefined) {
//         formData.append(key, form[key]);
//       }
//     });

//     // Attach image if available
//     if (imagePreview) {
//       const uriParts = imagePreview.split('.');
//       const fileType = uriParts[uriParts.length - 1];

//       formData.append('customer_image', {
//         uri: imagePreview,
//         name: `customer_${Date.now()}.${fileType}`,
//         type: `image/${fileType}`,
//       });
//     }

//     // Include image delete flag if needed
//     formData.append('isImageDeleted', isImageDeleted ? '1' : '0');

//     const method = form.id ? 'put' : 'post';
//     const url = form.id
//       ? `${API_URL}/customers/${form.id}`
//       : `${API_URL}/customers`;

//     const response = await axios({
//       method,
//       url,
//       data: formData,
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'multipart/form-data',
//       },
//     });

//     Alert.alert('Success', response.data.message);
//     fetchCustomer(id as string);
//   } catch (error) {
//     console.log('Save error:', error.response?.data || error.message);
//     Alert.alert('Error', 'Failed to save record.');
//   }
//   };

//   // ✅ Loader
//   if (loading) {
//     return (
//       <View style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   // ✅ UI
//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>{id ? 'Edit Customer' : 'Add Customer'}</Text>

//       {/* Code */}
//       <Text style={styles.label}>ID / Code *</Text>
//       <TextInput
//         style={styles.input}
//         value={form.code}
//         onChangeText={(text) => handleChange('code', text)}
//       />
//       {formErrors.code && <Text style={styles.errorText}>{formErrors.code[0]}</Text>}

//       {/* Name */}
//       <Text style={styles.label}>Customer Name *</Text>
//       <TextInput
//         style={styles.input}
//         value={form.name}
//         onChangeText={(text) => handleChange('name', text)}
//       />
//       {formErrors.name && <Text style={styles.errorText}>{formErrors.name[0]}</Text>}

//       {/* CNIC */}
//       <Text style={styles.label}>CNIC *</Text>
//       <TextInput
//         style={styles.input}
//         value={form.cnic}
//         onChangeText={(text) => handleChange('cnic', text)}
//       />
//       {formErrors.cnic && <Text style={styles.errorText}>{formErrors.cnic[0]}</Text>}

//       {/* Email */}
//       <Text style={styles.label}>Email Address</Text>
//       <TextInput
//         style={styles.input}
//         value={form.email_address}
//         onChangeText={(text) => handleChange('email_address', text)}
//       />
//       {formErrors.email_address && <Text style={styles.errorText}>{formErrors.email_address[0]}</Text>}

//       {/* Mobile */}
//       <Text style={styles.label}>Mobile Number</Text>
//       <TextInput
//         style={styles.input}
//         value={form.mobile_number}
//         onChangeText={(text) => handleChange('mobile_number', text)}
//       />
//       {formErrors.mobile_number && <Text style={styles.errorText}>{formErrors.mobile_number[0]}</Text>}

//       {/* City */}
//       <Text style={styles.label}>Select City</Text>
//       <View style={styles.pickerContainer}>
//         <Picker
//           selectedValue={form.city_id}
//           onValueChange={(value) => handleChange('city_id', value)}
//           style={styles.picker}
//         >
//           <Picker.Item label="Select City" value="" />
//           {cities.map((city) => (
//             <Picker.Item key={city.id} label={city.name} value={String(city.id)} />
//           ))}
//         </Picker>
//       </View>
//       {formErrors.city_id && <Text style={styles.errorText}>{formErrors.city_id[0]}</Text>}
                                    
//       {/* Credit Balance */}
//       <Text style={styles.label}>Credit Balance</Text>
//       <TextInput style={styles.input} value={form.credit_balance} keyboardType="numeric" onChangeText={(text) => handleChange('credit_balance', text)} />
//       {formErrors.credit_balance && <Text style={styles.errorText}>{formErrors.credit_balance[0]}</Text>}

//       {/* Credit Limit */}
//       <Text style={styles.label}>Credit Limit</Text>
//       <TextInput style={styles.input} value={form.credit_limit} keyboardType="numeric" onChangeText={(text) => handleChange('credit_limit', text)} />
//       {formErrors.credit_limit && <Text style={styles.errorText}>{formErrors.credit_limit[0]}</Text>}

//       {/* Address */}
//       <Text style={styles.label}>Address</Text>
//       <TextInput
//         style={[styles.input, { height: 80 }]}
//         value={form.address}
//         multiline
//         onChangeText={(text) => handleChange('address', text)}
//       />
//       {formErrors.address && <Text style={styles.errorText}>{formErrors.address[0]}</Text>}

//       <Text style={styles.label}>Status</Text>
//       <View style={styles.pickerContainer}>
//         <Picker
//           selectedValue={editStatus}
//           onValueChange={(value) => setEditStatus(value)}
//           style={styles.picker}
//         >
//           <Picker.Item label="Active" value="Active" />
//           <Picker.Item label="Inactive" value="Inactive" />
//         </Picker>
//       </View>

//       {/* Image */}
//       <Text style={styles.label}>Image</Text>
//       <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
//         <Ionicons name="image-outline" size={20} color="#007AFF" />
//         <Text style={styles.uploadButtonText}>Upload Image</Text>
//       </TouchableOpacity>

//       <Image
//         key={form.id}
//         source={
//           imagePreview
//             ? { uri: imagePreview }
//             : form.image_url && typeof form.image_url === 'string'
//             ? { uri: `${UPLOAD_PATH}/uploads/customers/${form.image_url}` }
//             : require('../../../assets/images/placeholder.jpg')
//         }
//         style={{ width: 150, height: 150, borderRadius: 5, marginTop: 10 }}
//         resizeMode="cover"
//       />

//       {/* Submit */}
//       <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={loading}>
//         <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
//       </TouchableOpacity>

//       {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
//     </ScrollView>
//   );
// }

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
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
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  closeIconContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    elevation: 4, // adds shadow on Android
    shadowColor: '#000', // shadow for iOS
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
  },

  // imagePreview: {
  //   width: 100,
  //   height: 100,
  //   borderRadius: 8,
  //   marginVertical: 10,
  // },
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
