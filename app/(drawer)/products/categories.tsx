import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';

interface Category {
  id: number;
  name: string;
  image_url: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function CategoriesScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const UPLOAD_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Category[]>([]);
  const [records, setRecords] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<keyof Category | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Modal & editing states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStatus();
  }, []);

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, perPage, allRecords]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    const filtered = allRecords.filter((category) =>
      category.name.toLowerCase().includes(text.toLowerCase())
    );

    setTotalItems(filtered.length);
    setTotalPages(Math.ceil(filtered.length / perPage));
    updatePageRecords(filtered, 1, perPage);
    setPage(1);
  };

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status === 'error') {
        if (res.data.message === 'Token missing in the request') logout();
        else setError(res.data.message);
      } else {
        const recordsData = res.data.data || res.data.records || res.data;
        setAllRecords(recordsData || []);
        setTotalItems(recordsData?.length || 0);
        setTotalPages(Math.ceil((recordsData?.length || 0) / perPage));
        updatePageRecords(recordsData, page, perPage);
      }
    } catch (err: any) {
      console.error('Fetch records error:', err);
      if (err.response?.status === 401) logout();
      else setError('Failed to load record. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
    
  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const fetchStatus = async () => {
    if (!token) return logout();

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
      if (err.response?.status === 401) logout();
    }
  };

  const updatePageRecords = (all: Category[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  // Unified Add + Edit handler
  const handleSubmit = async () => {
    try {
      setUpdating(true);
      setValidationError('');

      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('status', editStatus || 'Active');

      if (isEditing) {
        formData.append('_method', 'PUT');
      }

      if (editImage) {
        const filename = editImage.split('/').pop();
        const type = filename?.split('.').pop();
        formData.append('image', {
          uri: editImage,
          name: filename,
          type: `image/${type}`,
        } as any);
      }

      const url = isEditing && selectedRecord
        ? `${API_URL}/categories/${selectedRecord.id}`
        : `${API_URL}/categories`;

      const res = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          'X-Upload-Path': UPLOAD_PATH,
        },
      });

      const message = res.data?.message || 'record completed successfully';
      const isSuccess = res.data?.status === 'success' || message.toLowerCase().includes('success');

      if (isSuccess) {
        setEditModalVisible(false);
        await fetchRecords();
        resetForm();
      } else {
        setValidationError(message || 'Something went wrong.');
      }
    } catch (err: any) {
      console.error('Save record error:', err.response?.data || err.message);
      const message =
        err.response?.data?.errors?.name?.[0] ||
        err.response?.data?.message ||
        'Something went wrong.';
      setValidationError(message);
    } finally {
      setUpdating(false);
    }
  };
  // const handleSubmit = async () => {
  //   try {
  //     setUpdating(true);
  //     setValidationError('');

  //     const formData = new FormData();
  //     formData.append('name', editName.trim());
  //     formData.append('status', editStatus || 'Active');

  //     if (editImage) {
  //       const filename = editImage.split('/').pop();
  //       const type = filename?.split('.').pop();
  //       formData.append('image', {
  //         uri: editImage,
  //         name: filename,
  //         type: `image/${type}`,
  //       } as any);
  //     }

  //     const url = isEditing && selectedRecord
  //       ? `${API_URL}/categories/${selectedRecord.id}`
  //       : `${API_URL}/categories`;

  //     const res = await axios({
  //       method: isEditing ? 'PUT' : 'POST',
  //       url,
  //       data: formData,
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         'Content-Type': 'multipart/form-data',
  //         'X-Upload-Path': UPLOAD_PATH,
  //       },
  //     });

  //     const message = res.data?.message || 'record completed successfully';
  //     const isSuccess =
  //       res.data?.status === 'success' ||
  //       res.data?.success === true ||
  //       message.toLowerCase().includes('success');

  //     if (isSuccess) {
  //       setEditModalVisible(false);
  //       await fetchRecords();
  //       resetForm();
  //     } else {
  //       setValidationError(message || 'Something went wrong.');
  //     }
  //   } catch (err: any) {
  //     console.error('Save record error:', err.response?.data || err.message);
  //     const message =
  //       err.response?.data?.errors?.name?.[0] ||
  //       err.response?.data?.message ||
  //       'Something went wrong.';
  //     setValidationError(message);
  //   } finally {
  //     setUpdating(false);
  //   }
  // };

  const resetForm = () => {
    setEditName('');
    setEditStatus('Active');
    setEditImage(null);
    setSelectedRecord(null);
    setValidationError('');
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Denied", "You need to allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setEditImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picking error:", error);
    }
  };

  const handleAdd = () => {
    resetForm();
    setIsEditing(false);
    setEditModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedRecord(category);
    setEditName(category.name);
    setEditStatus(category.status);
    setEditImage(category.image_url ? `${IMAGE_URL}/categories/${category.image_url}` : null);
    setIsEditing(true);
    setEditModalVisible(true);
  };

  const handleDelete = (category: Category) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(category.id) },
    ]);
  };

  const deleteRecord = async (categoryId: number) => {
    try {
      await axios.delete(`${API_URL}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete record');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#34C759';
      case 'inactive': return '#FF3B30';
      default: return '#34C759';
    }
  };

  const handleSort = (field: keyof Category) => {
    // If clicking the same column, toggle asc/desc
    const newOrder =
      sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';

    setSortField(field);
    setSortOrder(newOrder);

    const sortedRecords = [...allRecords].sort((a, b) => {
      const valA = a[field]?.toString().toLowerCase() || '';
      const valB = b[field]?.toString().toLowerCase() || '';
      return newOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

    setAllRecords(sortedRecords);
    updatePageRecords(sortedRecords, 1, perPage);
    setPage(1);
  };

  // Define column widths and labels
  const COLUMN_WIDTHS = {
    id: 50,
    image: 70,
    name: 200,
    status: 100,
    created_by: 120,
    actions: 100,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    image: 'Image',
    name: 'Category Name',
    status: 'Status',
    created_by: 'Created By',
    actions: 'Actions',
  };
  
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {Object.keys(COLUMN_WIDTHS).map((key) => {
        const typedKey = key as keyof typeof COLUMN_WIDTHS;

        // Only these columns are sortable
        const sortableKeys: (keyof Category)[] = [
          'name',
          'status'
        ];

        const isSortable = sortableKeys.includes(typedKey as keyof Category);

        return (
          <View
            key={key}
            style={{
              width: COLUMN_WIDTHS[typedKey],
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={[
              styles.headerText,
              sortField === typedKey && { color: '#007AFF', fontWeight: '600' },
            ]}>
              {COLUMN_LABELS[typedKey]}
            </Text>

            {isSortable && (
              <TouchableOpacity
                onPress={() => handleSort(typedKey as keyof Category)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    sortField === typedKey
                      ? sortOrder === 'asc'
                        ? 'arrow-up'
                        : 'arrow-down'
                      : 'swap-vertical'
                  }
                  size={16}
                  color={sortField === typedKey ? '#007AFF' : '#9CA3AF'}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );

  const TableRow = ({ item }: { item: Category }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}><Text style={styles.cellText}>{item.id}</Text></View>
      
      <View style={{ width: COLUMN_WIDTHS.image }}>
        <TouchableOpacity
          onPress={() => {
            if (item.image_url) {
              setSelectedImage(`${IMAGE_URL}/categories/${item.image_url}`);
            } else {
              setSelectedImage(null);
            }
            setModalVisible(true);
          }}
        >
          <Image
            source={
              item.image_url
                ? { uri: `${IMAGE_URL}/categories/${item.image_url}` }
                : require('../../../assets/images/placeholder.jpg')
            }
            style={styles.imageContainer}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Full Image Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            {/* Close Icon */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Full Image */}
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../../../assets/images/placeholder.jpg')}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>

      <View style={{ width: COLUMN_WIDTHS.name }}><Text style={styles.cellText}>{item.name}</Text></View>

      <View style={{ width: COLUMN_WIDTHS.status }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={{ width: COLUMN_WIDTHS.created_by }}>
        <Text style={styles.cellText}>
          {item.created_by}{'\n'}{item.created_at ? item.created_at.split('T')[0] : ''}
        </Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.actions }}>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={[styles.actionButton, styles.editButton]}>
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionButton, styles.deleteButton]}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search category..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRecords}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FlatList
            data={records}
            renderItem={({ item }) => <TableRow item={item} />}
            ListHeaderComponent={<TableHeader />}
            ListEmptyComponent={
              !loading && (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No records found.</Text>
                </View>
              )
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </ScrollView>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        currentCount={records.length}
        onPageChange={setPage}
      />

      {/* Add/Edit Modal - WITH KEYBOARD HANDLING */}
      <Modal 
        visible={editModalVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Category' : 'Add Category'}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={[styles.modalBody, styles.modalBodyWithPadding]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name <Text style={styles.errorText}>*</Text></Text>
                <TextInput
                  style={[styles.input, validationError && styles.inputError]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholderTextColor="#34C759"
                />
                {validationError && <Text style={styles.errorText}>{validationError}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Status <Text style={styles.errorText}>*</Text></Text>
                <TouchableOpacity 
                  style={styles.modalTrigger}
                  onPress={() => setStatusModalVisible(true)}
                >
                  <Text style={editStatus ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
                    {editStatus || 'Select Status'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Image <Text style={styles.imageNote}>(Max size 5MB)</Text></Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Ionicons name="image-outline" size={20} color="#007AFF" />
                  <Text style={styles.uploadButtonText}>Select Image</Text>
                </TouchableOpacity>

                {editImage && (
                  <Image
                    source={{ uri: editImage }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Status Selection Modal */}
      <Modal 
        visible={statusModalVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setStatusModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, editStatus === item.key && styles.selectedModalItem]}
                  onPress={() => {
                    setEditStatus(item.key);
                    setStatusModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.value}</Text>
                  {editStatus === item.key && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalListContent}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ==============================
  // LAYOUT & CONTAINER STYLES
  // ==============================
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  
  tableHeader: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#F8F9FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
  },
  
  tableRow: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F2F2F7', 
    alignItems: 'center', 
  },
  
  noDataContainer: {
    padding: 22,
  },
  
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  modalBody: {
    padding: 16,
  },
  
  modalBodyWithPadding: {
    paddingBottom: 30,
  },
  
  fieldGroup: {
    marginBottom: 16,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    margin: 10,
    height: 40,
  },
  
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==============================
  // TYPOGRAPHY STYLES
  // ==============================
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1C1C1E' 
  },
  
  addButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  
  headerText: { 
    fontWeight: '600', 
    fontSize: 14, 
    color: '#1C1C1E', 
    paddingHorizontal: 10 
  },
  
  cellText: { 
    fontSize: 14, 
    color: '#1C1C1E', 
    paddingHorizontal: 10 
  },
  
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
  },
  
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  
  retryButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },

  imageNote: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
  },
  
  modalTriggerText: {
    color: '#1C1C1E',
    fontSize: 16,
  },
  
  modalTriggerPlaceholder: {
    fontSize: 16,
  },
  
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  modalItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 5,
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  addButton: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 16,
    paddingVertical: 8, 
    borderRadius: 8 
  },
  
  retryButton: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  
  actionButtons: { 
    flexDirection: 'row', 
    gap: 8 
  },
  
  actionButton: { 
    padding: 6, 
    borderRadius: 6 
  },
  
  editButton: { 
    backgroundColor: '#E8F2FF' 
  },
  
  deleteButton: { 
    backgroundColor: '#FFEAEA' 
  },
  
  closeButton: {
    padding: 4,
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
  
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },

  // ==============================
  // FORM & INPUT STYLES
  // ==============================
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

  // ==============================
  // IMAGE & MEDIA STYLES
  // ==============================
  imageContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 6, 
    marginHorizontal: 10 
  },
  
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
  },

  // ==============================
  // STATUS & BADGE STYLES
  // ==============================
  statusBadge: { 
    marginHorizontal: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12, 
    alignSelf: 'flex-start',
  },

  // ==============================
  // MODAL & LIST STYLES
  // ==============================
  modalListContent: {
    paddingBottom: 16,
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
});