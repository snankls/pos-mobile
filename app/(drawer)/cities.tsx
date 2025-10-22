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
  ScrollView,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

interface City {
  id: number;
  name: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function CitiesScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setallRecords] = useState<City[]>([]);
  const [records, setRecords] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [validationError, setValidationError] = useState('');

  // Modal & editing states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<City | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStatus();
  }, []);

  useEffect(() => {
    updatePageRcord(allRecords, page, perPage);
  }, [page, perPage, allRecords]);

  const fetchStatus = async () => {
    if (!token) return logout();

    try {
      setStatusLoading(true);
      const res = await axios.get(`${API_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Status API Response:', res.data);

      // Access the data property from the response
      if (res.data.data && typeof res.data.data === 'object') {
        const statusData = res.data.data; // This is { Active: "Actives", Inactive: "Inactive" }
        
        // Convert object to array for FlatList
        const statusArray = Object.entries(statusData).map(([key, value]) => ({
          id: key, // Use the key as ID
          key: key, // "Active", "Inactive"
          value: value // "Actives", "Inactive"
        }));
        setStatusOptions(statusArray);
      } else {
        setStatusOptions([]);
      }

    } catch (err: any) {
      console.error('Fetch status error:', err);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/cities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status === 'error') {
        if (res.data.message === 'Token missing in the request') logout();
        else setError(res.data.message);
      } else {
        let recordsData = res.data.data || res.data.records || res.data;

        // ✅ Remove duplicate cities by name
        const uniqueCities = recordsData.filter(
          (city: City, index: number, self: City[]) =>
            index === self.findIndex((c) => c.name.toLowerCase() === city.name.toLowerCase())
        );

        setallRecords(uniqueCities || []);
        setTotalItems(uniqueCities?.length || 0);
        setTotalPages(Math.ceil((uniqueCities?.length || 0) / perPage));
        updatePageRcord(uniqueCities, page, perPage);
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

  const updatePageRcord = (all: City[], currentPage: number, perPageCount: number) => {
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

      const payload = { name: editName.trim(), status: editStatus || 'Active' };
      let res;

      if (isEditing && selectedRecord) {
        res = await axios.put(`${API_URL}/cities/${selectedRecord.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${API_URL}/cities`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const message =
        res.data?.message || 'Operation completed successfully';
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


  const handleAdd = () => {
    setSelectedRecord(null);
    setEditName('');
    setEditStatus('Active');
    setIsEditing(false);
    setEditModalVisible(true);
  };

  const handleEdit = (city: City) => {
    setSelectedRecord(city);
    setEditName(city.name);
    setEditStatus(city.status);
    setIsEditing(true);
    setEditModalVisible(true);
  };

  const handleDelete = (city: City) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${city.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(city.id) },
    ]);
  };

  const deleteRecord = async (cityId: number) => {
    try {
      await axios.delete(`${API_URL}/cities/${cityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        return '#ff3366';
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

  const COLUMN_WIDTHS = {
    id: 60,
    name: 200,
    status: 120,
    created_by: 120,
    actions: 100,
  };

  const COLUMN_LABELS = {
    id: 'ID',
    name: 'City Name',
    status: 'Status',
    created_by: 'Created By',
    actions: 'Actions',
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {Object.keys(COLUMN_WIDTHS).map((key) => (
        <View
          key={key}
          style={{ width: COLUMN_WIDTHS[key as keyof typeof COLUMN_WIDTHS] }}
        >
          <Text style={styles.headerText}>
            {COLUMN_LABELS[key as keyof typeof COLUMN_LABELS]}
          </Text>
        </View>
      ))}
    </View>
  );

  const TableRow = ({ item }: { item: City }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.name }}>
        <Text style={styles.cellText}>{item.name}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.status }}>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={{ width: COLUMN_WIDTHS.created_by }}>
        <Text style={styles.cellText}>
          {item.created_by}
          {'\n'}
          {item.created_at ? item.created_at.split('T')[0] : ''}
        </Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.actions }}>
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
        <Text style={styles.title}>Cities</Text>
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
          {/* ✅ Horizontal scroll for wide tables */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* ✅ Keep header outside FlatList to stay aligned */}
              <TableHeader />

              <FlatList
                data={records}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <TableRow item={item} />}
                ListFooterComponent={<Pagination />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007AFF']}
                  />
                }
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </ScrollView>
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
            <TouchableOpacity 
              style={styles.modalTrigger}
              onPress={() => setStatusModalVisible(true)}
            >
              <Text style={editStatus ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
                {editStatus || 'Select Status'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <Modal
              visible={statusModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setStatusModalVisible(false)}
            >
              <View style={styles.modalOverlay2}>
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
                          editStatus === item.key && styles.selectedModalItem
                        ]}
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
                  />
                </View>
              </View>
            </Modal>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                onPress={saveRecord}
                disabled={updating}
              >
                <Text style={styles.saveButtonText}>{updating ? 'Saving...' : isEditing ? 'Update' : 'Save Changing'}</Text>
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
  cityName: { 
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
  modalButtons: {
    width: '100%',
    marginTop: 20,
  },
  saveButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: { 
    fontSize: 16, 
    color: '#FF3B30', 
    textAlign: 'center', 
    marginVertical: 10 
  },
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  modalTriggerText: {
    color: '#374151',
    fontSize: 16,
  },
  modalTriggerPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  modalOverlay2: {
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
  closeButton: {
    padding: 4,
  },
  modalListContent: {
    paddingBottom: 16,
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
});