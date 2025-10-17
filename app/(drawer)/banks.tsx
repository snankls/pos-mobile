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
  ScrollView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

interface Bank {
  id: number;
  account_title: string;
  bank_name: string;
  account_number: string;
  iban_number: string;
  swift_code: string;
  address: string;
  status: string;
}

export default function BanksScreen() {
  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setallRecords] = useState<Bank[]>([]);
  const [records, setRecords] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [validationError, setValidationError] = useState('');

  // Modal & editing states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Bank | null>(null);

  const [editAccountTitle, setEditAccountTitle] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIBAN, setEditIBAN] = useState('');
  const [editSWIFT, setEditSWIFT] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('Active');

  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
      const res = await axios.get(`${API_URL}/banks`, {
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

  const updatePageRcord = (all: Bank[], currentPage: number, perPageCount: number) => {
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

      // Build record data
      const recordData = {
        account_title: editAccountTitle.trim(),
        bank_name: selectedRecord?.bank_name?.trim() || '',
        account_number: selectedRecord?.account_number?.trim() || '',
        iban_number: selectedRecord?.iban_number?.trim() || '',
        swift_code: selectedRecord?.swift_code?.trim() || '',
        address: selectedRecord?.address?.trim() || '',
        status: editStatus.trim(),
      };

      // Validation
      if (!recordData.account_title) {
        setValidationError('Please enter Account Title.');
        setUpdating(false);
        return;
      }
      if (!recordData.bank_name) {
        setValidationError('Please enter Bank Name.');
        setUpdating(false);
        return;
      }
      if (!recordData.account_number) {
        setValidationError('Please enter Account Number.');
        setUpdating(false);
        return;
      }
      if (!recordData.iban_number) {
        setValidationError('Please enter IBAN Number.');
        setUpdating(false);
        return;
      }
      if (!recordData.swift_code) {
        setValidationError('Please enter SWIFT Code.');
        setUpdating(false);
        return;
      }
      if (!recordData.address) {
        setValidationError('Please enter Address.');
        setUpdating(false);
        return;
      }
      if (!recordData.status) {
        setValidationError('Please select Status.');
        setUpdating(false);
        return;
      }

      let res;
      if (isEditing && selectedRecord?.id) {
        res = await axios.put(`${API_URL}/banks/${selectedRecord.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${API_URL}/banks`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const message = res.data?.message || 'Operation completed successfully';
      const isSuccess =
        res.data?.status === 'success' ||
        res.data?.success === true ||
        message.toLowerCase().includes('success');

      if (isSuccess) {
        setEditModalVisible(false);
        await fetchRecords();
        setSelectedRecord(null);
        setEditAccountTitle('');
        setEditStatus('Active');
      } else {
        setValidationError(message || 'Something went wrong.');
      }
    } catch (err: any) {
      console.error('Save record error:', err.response?.data || err.message);
      const message =
        err.response?.data?.errors?.account_title?.[0] ||
        err.response?.data?.message ||
        'Something went wrong.';
      setValidationError(message);
    } finally {
      setUpdating(false);
    }
  };


  const handleAdd = () => {
    setSelectedRecord(null);
    setEditAccountTitle('');
    setEditBankName('');
    setEditAccountNumber('');
    setEditIBAN('');
    setEditSWIFT('');
    setEditAddress('');
    setEditStatus('Active'); // <-- default
    setIsEditing(false);
    setEditModalVisible(true);
  };

  const handleEdit = (bank: Bank) => {
    setSelectedRecord(bank);
    setEditAccountTitle(bank.account_title);
    setEditBankName(bank.bank_name);
    setEditAccountNumber(bank.account_number);
    setEditIBAN(bank.iban_number);
    setEditSWIFT(bank.swift_code);
    setEditAddress(bank.address);
    setEditStatus(bank.status);
    setIsEditing(true);
    setEditModalVisible(true);
  };

  const handleDelete = (bank: Bank) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${bank.account_title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(bank.id) },
    ]);
  };

  const deleteRecord = async (bankId: number) => {
    try {
      await axios.delete(`${API_URL}/banks/${bankId}`, {
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

  const COLUMN_WIDTHS = {
    id: 50,
    account_title: 150,
    bank_name: 150,
    account_number: 120,
    iban_number: 180,
    swift_code: 100,
    address: 200,
    status: 80,
    actions: 100,
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.headerText}>ID</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.account_title }}>
        <Text style={styles.headerText}>A/C TITLE</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.bank_name }}>
        <Text style={styles.headerText}>BANK NAME</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.account_number }}>
        <Text style={styles.headerText}>A/C NUMBER</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.iban_number }}>
        <Text style={styles.headerText}>IBAN NUMBER</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.swift_code }}>
        <Text style={styles.headerText}>SWIFT CODE</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.address }}>
        <Text style={styles.headerText}>ADDRESS</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.status }}>
        <Text style={styles.headerText}>STATUS</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.actions }}>
        <Text style={styles.headerText}>ACTIONS</Text>
      </View>
    </View>
  );

  const TableRow = ({ item }: { item: Bank }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.account_title }}>
        <Text style={styles.cellText}>{item.account_title}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.bank_name }}>
        <Text style={styles.cellText}>{item.bank_name}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.account_number }}>
        <Text style={styles.cellText}>{item.account_number}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.iban_number }}>
        <Text style={styles.cellText}>{item.iban_number}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.swift_code }}>
        <Text style={styles.cellText}>{item.swift_code}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.address }}>
        <Text style={styles.cellText}>{item.address}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.status }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
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
        <>
          <ScrollView horizontal={true} contentContainerStyle={{ flexGrow: 1 }}>
            <FlatList
              data={records}
              renderItem={({ item }) => <TableRow item={item} />}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={<TableHeader />}
              ListFooterComponent={<Pagination />}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
              }
            />
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

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Account Title */}
              <Text style={styles.modalLabel}>Account Title</Text>
              <TextInput
                style={styles.input}
                value={editAccountTitle}
                onChangeText={setEditAccountTitle}
              />

              {/* Bank Name */}
              <Text style={styles.modalLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={selectedRecord?.bank_name || ''}
                onChangeText={(text) =>
                  setSelectedRecord((prev) =>
                    prev ? { ...prev, bank_name: text } : { bank_name: text } as Bank
                  )
                }
              />

              {/* Account Number */}
              <Text style={styles.modalLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={selectedRecord?.account_number || ''}
                onChangeText={(text) =>
                  setSelectedRecord((prev) =>
                    prev ? { ...prev, account_number: text } : { account_number: text } as Bank
                  )
                }
                keyboardType="numeric"
              />

              {/* IBAN Number */}
              <Text style={styles.modalLabel}>IBAN Number</Text>
              <TextInput
                style={styles.input}
                value={selectedRecord?.iban_number || ''}
                onChangeText={(text) =>
                  setSelectedRecord((prev) =>
                    prev ? { ...prev, iban_number: text } : { iban_number: text } as Bank
                  )
                }
              />

              {/* SWIFT Code */}
              <Text style={styles.modalLabel}>SWIFT Code</Text>
              <TextInput
                style={styles.input}
                value={selectedRecord?.swift_code || ''}
                onChangeText={(text) =>
                  setSelectedRecord((prev) =>
                    prev ? { ...prev, swift_code: text } : { swift_code: text } as Bank
                  )
                }
              />

              {/* Address */}
              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={selectedRecord?.address || ''}
                onChangeText={(text) =>
                  setSelectedRecord((prev) =>
                    prev ? { ...prev, address: text } : { address: text } as Bank
                  )
                }
                multiline
              />

              {/* Status */}
              <Text style={styles.modalLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedRecord?.status || 'Active'}
                  onValueChange={(value) =>
                    setSelectedRecord((prev) =>
                      prev ? { ...prev, status: value } : { status: value } as Bank
                    )
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Inactive" value="Inactive" />
                </Picker>
              </View>
              
              {/* Validation Error */}
              {validationError ? (
                <Text style={styles.errorMessage}>{validationError}</Text>
              ) : null}

              {/* Save / Update Button */}
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
            </ScrollView>
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
    borderBottomColor: '#ccc',
    minWidth: 900,
  },
  tableRow: { 
    flexDirection: 'row', 
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    alignItems: 'center',
    minWidth: 900,
  },
  headerCell: { 
    justifyContent: 'center' 
  },
  headerText: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#333' 
  },
  cell: { 
    justifyContent: 'center' 
  },
  cellText: { 
    fontSize: 14, 
    color: '#333' 
  },
  bankName: { 
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
    marginVertical: 20,
    padding: 24,
    width: '95%',
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