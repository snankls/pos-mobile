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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../components/LoadingScreen';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

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
  //const navigation = useNavigation();
  const perPage = 20;
  const [allRecords, setAllRecords] = useState<City[]>([]);
  const [records, setRecords] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<keyof City | null>(null);

  // Modal & editing states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStatus();
  }, []);

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, perPage, allRecords]);

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
  
  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    const filtered = allRecords.filter((city) =>
      city.name.toLowerCase().includes(text.toLowerCase())
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
      const res = await axios.get(`${API_URL}/cities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status === 'error') {
        if (res.data.message === 'Token missing in the request') logout();
        else setError(res.data.message);
      } else {
        let recordsData = res.data.data || res.data.records || res.data;

        // Remove duplicate cities by name
        const uniqueCities = recordsData.filter(
          (city: City, index: number, self: City[]) =>
            index === self.findIndex((c) => c.name.toLowerCase() === city.name.toLowerCase())
        );

        setAllRecords(uniqueCities || []);
        setTotalItems(uniqueCities?.length || 0);
        setTotalPages(Math.ceil((uniqueCities?.length || 0) / perPage));
        updatePageRecords(uniqueCities, page, perPage);
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

  const updatePageRecords = (all: City[], currentPage: number, perPageCount: number) => {
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

      const message = res.data?.message || 'Operation completed successfully';
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

  const resetForm = () => {
    setEditName('');
    setEditStatus('Active');
    setSelectedRecord(null);
    setValidationError('');
  };

  const handleAdd = () => {
    resetForm();
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
      case 'active': return '#34C759';
      case 'inactive': return '#FF3B30';
      default: return '#34C759';
    }
  };

  const handleSort = (field: keyof City) => {
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

  const COLUMN_WIDTHS = {
    id: 60,
    name: 200,
    status: 100,
    created_by: 120,
    actions: 80,
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
      {Object.keys(COLUMN_WIDTHS).map((key) => {
        const typedKey = key as keyof typeof COLUMN_WIDTHS;

        // Only these columns are sortable in the City table
        const sortableKeys: (keyof City)[] = [
          'name',
          'status'
        ];

        const isSortable = sortableKeys.includes(typedKey as keyof City);

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
                onPress={() => handleSort(typedKey as keyof City)}
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

  const TableRow = ({ item }: { item: City }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}><Text style={styles.cellText}>{item.id}</Text></View>
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
        <Text style={styles.title}>Cities</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city..."
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
            keyExtractor={(item) => item.id.toString()}
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
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit City' : 'Add City'}</Text>
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

              <TouchableOpacity
                style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                onPress={saveRecord}
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
      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.modalOverlay}>
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
        </View>
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

  // ==============================
  // TYPOGRAPHY STYLES
  // ==============================
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1C1C1E' 
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
  
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
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
  
  addButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  
  retryButton: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  
  retryButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  
  actionButtons: { 
    flexDirection: 'row', 
    gap: 8 
  },
  
  actionButton: { 
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  
  editButton: { 
    backgroundColor: '#E8F2FF' 
  },
  
  deleteButton: { 
    backgroundColor: '#FFEAEA' 
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

  // ==============================
  // SEARCH & INPUT STYLES
  // ==============================
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    margin: 10,
    height: 40,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 5,
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

  // ==============================
  // TABLE & DATA STYLES
  // ==============================
  tableHeader: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#F8F9FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
    minWidth: 600 
  },
  
  tableRow: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F2F2F7', 
    alignItems: 'center', 
    minWidth: 600 
  },
  
  statusBadge: { 
    marginHorizontal: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12, 
    alignSelf: 'flex-start',
  },
  
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },

  // ==============================
  // STATUS & INDICATOR STYLES
  // ==============================
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  
  noDataContainer: {
    padding: 22,
  },

  // ==============================
  // MODAL & OVERLAY STYLES
  // ==============================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  
  closeButton: {
    padding: 4,
  },
  
  modalBody: {
    padding: 16,
  },
  
  modalBodyWithPadding: {
    paddingBottom: 30,
  },

  // ==============================
  // FORM & FIELD STYLES
  // ==============================
  fieldGroup: {
    marginBottom: 16,
  },
  
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
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

  // ==============================
  // LIST & SELECTION STYLES
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
  
  modalItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
});