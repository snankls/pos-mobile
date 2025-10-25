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
  TextInput,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import LoadingScreen from '../components/LoadingScreen';
import Pagination from '../components/Pagination';

interface Bank {
  id?: number;
  account_title: string;
  bank_name: string;
  account_number: string;
  iban_number?: string;
  swift_code?: string;
  address?: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

interface BankForm {
  id?: number;
  account_title: string;
  bank_name: string;
  account_number: string;
  iban_number?: string;
  swift_code?: string;
  address?: string;
  status: string;
}

export default function BanksScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Bank[]>([]);
  const [records, setRecords] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal & form
  const [modalVisible, setModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BankForm>({
    account_title: '',
    bank_name: '',
    account_number: '',
    iban_number: '',
    swift_code: '',
    address: '',
    status: 'Active',
  });
  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState<Partial<Record<keyof Bank, string>>>({});

  useEffect(() => {
    fetchRecords();
    fetchStatus();
  }, []);

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, perPage, allRecords]);

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/banks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data || res.data?.records || res.data;
      if (res.data?.status === 'error') {
        if (res.data?.message === 'Token missing in the request') logout();
        else setError(res.data?.message || 'Error fetching records.');
      } else {
        setAllRecords(data || []);
        setTotalItems(data?.length || 0);
        setTotalPages(Math.ceil((data?.length || 0) / perPage));
        updatePageRecords(data, page, perPage);
      }
    } catch (err: any) {
      console.error('Fetch records error:', err);
      if (err.response?.status === 401) logout();
      else setError('Failed to load records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Show global loader until data fetched
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

  const updatePageRecords = (all: Bank[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const resetForm = () => {
    setFormData({
      account_title: '',
      bank_name: '',
      account_number: '',
      iban_number: '',
      swift_code: '',
      address: '',
      status: 'Active',
    });
    setValidationError({});
  };

  const handleAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEdit = (bank: Bank) => {
    setFormData(bank);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (bank: Bank) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${bank.account_title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(bank.id!) },
    ]);
  };

  const deleteRecord = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/banks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete record.');
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof Bank, string>> = {};
    if (!formData.account_title?.trim()) errors.account_title = 'Please enter account title.';
    if (!formData.bank_name?.trim()) errors.bank_name = 'Please enter bank name.';
    if (!formData.account_number?.trim()) errors.account_number = 'Please enter account number.';

    setValidationError(errors);
    return Object.keys(errors).length === 0;
  };

  const saveRecord = async () => {
    if (!validateForm()) return;

    try {
      setUpdating(true);
      setValidationError({});

      let res;
      if (isEditing && formData.id) {
        res = await axios.put(`${API_URL}/banks/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${API_URL}/banks`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const message = res.data?.message || 'Operation completed successfully';
      const isSuccess = res.data?.status === 'success' || message.toLowerCase().includes('success');

      if (isSuccess) {
        setModalVisible(false);
        await fetchRecords();
        resetForm();
      } else {
        Alert.alert('Error', message || 'Something went wrong.');
      }
    } catch (err: any) {
      console.error('Save record error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save record.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#34C759';
      case 'inactive': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const COLUMN_WIDTHS = {
    id: 50,
    account_title: 150,
    bank_name: 150,
    account_number: 120,
    iban_number: 180,
    swift_code: 100,
    address: 200,
    status: 80,
    created_by: 120,
    actions: 100,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    account_title: 'A/C Title',
    bank_name: 'Bank Name',
    account_number: 'A/C Number',
    iban_number: 'IBAN',
    swift_code: 'SWIFT Code',
    address: 'Address',
    status: 'Status',
    created_by: 'Created By',
    actions: 'Actions',
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {Object.keys(COLUMN_WIDTHS).map((key) => (
        <View key={key} style={{ width: COLUMN_WIDTHS[key as keyof typeof COLUMN_WIDTHS] }}>
          <Text style={styles.headerText}>{COLUMN_LABELS[key as keyof typeof COLUMN_LABELS]}</Text>
        </View>
      ))}
    </View>
  );

  const TableRow = ({ item }: { item: Bank }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}><Text style={styles.cellText}>{item.id}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.account_title }}><Text style={styles.cellText}>{item.account_title}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.bank_name }}><Text style={styles.cellText}>{item.bank_name}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.account_number }}><Text style={styles.cellText}>{item.account_number}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.iban_number }}><Text style={styles.cellText}>{item.iban_number}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.swift_code }}><Text style={styles.cellText}>{item.swift_code}</Text></View>
      <View style={{ width: COLUMN_WIDTHS.address }}><Text style={styles.cellText}>{item.address}</Text></View>
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
        <Text style={styles.title}>Banks</Text>
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
        <ScrollView horizontal>
          <FlatList
            data={records}
            renderItem={({ item }) => <TableRow item={item} />}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            ListHeaderComponent={<TableHeader />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />}
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

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Bank' : 'Add Bank'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Required Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account Title *</Text>
                <TextInput
                  style={[styles.input, validationError.account_title && styles.inputError]}
                  value={formData.account_title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, account_title: text }))}
                />
                {validationError.account_title && <Text style={styles.errorText}>{validationError.account_title}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bank Name *</Text>
                <TextInput
                  style={[styles.input, validationError.bank_name && styles.inputError]}
                  value={formData.bank_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bank_name: text }))}
                />
                {validationError.bank_name && <Text style={styles.errorText}>{validationError.bank_name}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account Number *</Text>
                <TextInput
                  style={[styles.input, validationError.account_number && styles.inputError]}
                  value={formData.account_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, account_number: text }))}
                  keyboardType="numeric"
                />
                {validationError.account_number && <Text style={styles.errorText}>{validationError.account_number}</Text>}
              </View>

              {/* Optional Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>IBAN Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.iban_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, iban_number: text }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SWIFT Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.swift_code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, swift_code: text }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Status Field with Modal */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Status *</Text>
                <TouchableOpacity 
                  style={styles.modalTrigger}
                  onPress={() => setStatusModalVisible(true)}
                >
                  <Text style={formData.status ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
                    {formData.status || 'Select Status'}
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
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Update Bank' : 'Add Bank'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.modalOverlay}>
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
                  style={[styles.modalItem, formData.status === item.key && styles.selectedModalItem]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, status: item.key }));
                    setStatusModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.value}</Text>
                  {formData.status === item.key && (
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
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E' },
  addButton: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 16,
    paddingVertical: 8, 
    borderRadius: 8 
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Table Styles
  tableHeader: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#F8F9FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
    minWidth: 900 
  },
  tableRow: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F2F2F7', 
    alignItems: 'center', 
    minWidth: 900 
  },
  headerText: { fontWeight: '600', fontSize: 14, color: '#1C1C1E' },
  cellText: { fontSize: 14, color: '#1C1C1E' },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignSelf: 'flex-start' 
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, borderRadius: 6 },
  editButton: { backgroundColor: '#E8F2FF' },
  deleteButton: { backgroundColor: '#FFEAEA' },
  
  // Error Styles
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#FF3B30', fontSize: 16, textAlign: 'center', marginVertical: 12 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  
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
  pageIndicatorText: { 
    fontSize: 14, 
    color: '#333', 
    marginHorizontal: 10 
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
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
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
    color: '#8E8E93',
    fontSize: 16,
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