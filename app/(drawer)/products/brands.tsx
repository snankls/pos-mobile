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
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

interface Brand {
  id: number;
  name: string;
  image_url: string;
  status: string;
}

export default function BrandsScreen() {
  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setallRecords] = useState<Brand[]>([]);
  const [records, setRecords] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [validationError, setValidationError] = useState('');

  // Modal & editing states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const UPLOAD_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    updatePageRcord(allRecords, page, perPage);
  }, [page, perPage, allRecords]);

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/brands`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status === 'error') {
        if (res.data.message === 'Token missing in the request') logout();
        else setError(res.data.message);
      } else {
        const recordsData = res.data.data || res.data.records || res.data;
        setallRecords(recordsData || []);
        setTotalItems(recordsData?.length || 0);
        setTotalPages(Math.ceil((recordsData?.length || 0) / perPage));
        updatePageRcord(recordsData, page, perPage);
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

  const updatePageRcord = (all: Brand[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  // Unified Add + Edit handler
  const saveRecord = async () => {
    try {
      setUpdating(true);
      setValidationError('');

      if (!editName.trim()) {
        setValidationError('Please enter a name.');
        setUpdating(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('status', editStatus || 'Active');

      if (editImage) {
        const filename = editImage.split('/').pop();
        const type = filename?.split('.').pop();
        formData.append('image', {
          uri: editImage,
          name: filename,
          type: `image/${type}`,
        } as any);
      }

      let url = isEditing && selectedRecord
        ? `${API_URL}/brands/${selectedRecord.id}`
        : `${API_URL}/brands`;

      const res = await axios({
        method: isEditing ? 'PUT' : 'POST',
        url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          'X-Upload-Path': UPLOAD_PATH,
        },
      });

      const message = res.data?.message || 'Operation completed successfully';
      const isSuccess =
        res.data?.status === 'success' ||
        res.data?.success === true ||
        message.toLowerCase().includes('success');

      if (isSuccess) {
        setEditModalVisible(false);
        await fetchRecords();
        setEditName('');
        setEditStatus('Active');
        setSelectedRecord(null);
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
    setSelectedRecord(null);
    setEditName('');
    setEditStatus('Active');
    setIsEditing(false);
    setEditModalVisible(true);
  };

  const handleEdit = (brand: Brand) => {
    setSelectedRecord(brand);
    setEditName(brand.name);
    setEditStatus(brand.status);
    setIsEditing(true);
    setEditModalVisible(true);
  };

  const handleDelete = (brand: Brand) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${brand.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(brand.id) },
    ]);
  };

  const deleteRecord = async (brandId: number) => {
    try {
      await axios.delete(`${API_URL}/brands/${brandId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });``
      fetchRecords();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete record');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#34C759';
      case 'inactive':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return status || 'Unknown';
    }
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { flex: 0.5 }]}>
        <Text style={styles.headerText}>ID</Text>
      </View>
      <View style={[styles.headerCell, { flex: 1 }]}>
        <Text style={styles.headerText}>IMAGE</Text>
      </View>
      <View style={[styles.headerCell, { flex: 2 }]}>
        <Text style={styles.headerText}>NAME</Text>
      </View>
      <View style={[styles.headerCell, { flex: 1 }]}>
        <Text style={styles.headerText}>STATUS</Text>
      </View>
      <View style={[styles.headerCell, { flex: 1 }]}>
        <Text style={styles.headerText}>ACTIONS</Text>
      </View>
    </View>
  );

  const TableRow = ({ item }: { item: Brand }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { flex: 0.5 }]}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>
      <View style={[styles.cell, { flex: 1 }]}>
        <Image
          key={item.id}
          source={
            item.image_url
              ? { uri: `${IMAGE_URL}/uploads/brands/${item.image_url}` }
              : require('../../../assets/images/placeholder.jpg')
          }
          style={{ width: 50, height: 50, borderRadius: 5 }}
          resizeMode="cover"
          onError={(e) => console.log('Image error:', e.nativeEvent.error)}
        />
      </View>
      <View style={[styles.cell, { flex: 2 }]}>
        <Text style={[styles.cellText, styles.brandName]}>{item.name}</Text>
      </View>
      <View style={[styles.cell, { flex: 1 }]}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <View style={[styles.cell, { flex: 1 }]}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => handleEdit(item)} 
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleDelete(item)} 
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Pagination = () => (
    <View style={styles.pagination}>
      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          Showing {records.length} of {totalItems}
        </Text>
      </View>
      <View style={styles.paginationControls}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => setPage(page - 1)}
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
        >
          <Ionicons
            name="chevron-back-outline"
            size={20}
            color={page <= 1 ? '#C7C7CC' : '#007AFF'}
          />
        </TouchableOpacity>
        <Text style={styles.pageIndicatorText}>
          Page {page} of {totalPages}
        </Text>
        <TouchableOpacity
          disabled={page >= totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
        >
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={page >= totalPages ? '#C7C7CC' : '#007AFF'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Brands</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
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
        <>
          <FlatList
            data={records}
            renderItem={({ item }) => <TableRow item={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={<TableHeader />}
            ListFooterComponent={<Pagination />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      )}

      {/* Unified Add/Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              onPress={() => setEditModalVisible(false)} 
              style={styles.closeIcon}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Record' : 'Add Record'}
            </Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editStatus}
                onValueChange={(value) => setEditStatus(value)}
                style={styles.picker}
              >
                <Picker.Item label="Active" value="Active" />
                <Picker.Item label="Inactive" value="Inactive" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Image</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color="#007AFF" />
              <Text style={styles.uploadButtonText}>
                {editImage ? 'Change Image' : 'Upload Image'}
              </Text>
            </TouchableOpacity>

            {editImage && (
              <Image
                source={{ uri: editImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                onPress={saveRecord}
                disabled={updating}
              >
                <Text style={styles.saveButtonText}>
                  {updating
                    ? isEditing
                      ? 'Updating...'
                      : 'Saving...'
                    : isEditing
                    ? 'Update'
                    : 'Save Changing'}
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              {validationError ? (
                <Text style={styles.errorText}>{validationError}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  closeIcon: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  tableHeader: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#f0f0f0', 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc' 
  },
  headerCell: { 
    justifyContent: 'center' 
  },
  headerText: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#333' 
  },
  tableRow: { 
    flexDirection: 'row', 
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    alignItems: 'center' 
  },
  cell: { 
    justifyContent: 'center' 
  },
  cellText: { 
    fontSize: 14, 
    color: '#333' 
  },
  brandName: { 
    fontWeight: '600' 
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 12, 
    alignSelf: 'flex-start' 
  },
  statusText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  actionButtons: { 
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#E8F2FF',
  },
  deleteButton: {
    backgroundColor: '#FFEAEA',
  },
  pagination: { 
    marginTop: 15,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationInfo: { 
    marginBottom: 5 
  },
  paginationText: { 
    fontSize: 12, 
    color: '#555' 
  },
  paginationControls: { 
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
},

  pageButton: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  pageButtonDisabled: { 
    opacity: 0.5 
  },
  pageButtonText: { 
    fontSize: 14, 
    color: '#007AFF', 
    marginHorizontal: 4 
  },
  pageIndicatorText: { 
    fontSize: 14, 
    color: '#333', 
    marginHorizontal: 10 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorText: { 
    fontSize: 16, 
    color: '#FF3B30', 
    textAlign: 'center', 
    marginVertical: 10 
  },
  retryButton: { 
    padding: 10, 
    backgroundColor: '#007AFF', 
    borderRadius: 6 
  },
  retryButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorMessage: { 
    fontSize: 16, 
    color: '#FF3B30', 
    textAlign: 'center', 
    marginVertical: 10 
  },
});