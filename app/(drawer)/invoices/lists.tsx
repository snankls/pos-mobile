import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';

interface Invoice {
  id: number;
  invoice_number?: string;
  customer_name?: string;
  invoice_date?: string;
  total_quantity: string;
  total_price: string;
  discount_value: string;
  total_discount: string;
  grand_total?: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function InvoicesListsScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const router = useRouter();
  const { token, logout } = useAuth();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Invoice[]>([]);
  const [records, setRecords] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
      fetchSettings();
    }, [token])
  );

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, allRecords]);

  const fetchSettings = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const settingsObj: Record<string, string> = {};

      Object.values(response.data).forEach((setting: any) => {
        if (setting.data_name && setting.data_value !== undefined) {
          settingsObj[setting.data_name] = setting.data_value;
        }
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/invoices`, {
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
      else setError('Failed to load records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const updatePageRecords = (all: Invoice[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleDelete = async (invoice: Invoice) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete "${invoice.invoice_number}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/invoices/${invoice.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchRecords();
            } catch {
              setError('Failed to delete record.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#05a34a';
      case 'inactive':
        return '#ff3366';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  // Column definitions
  const COLUMN_WIDTHS = {
    id: 50,
    invoice_number: 100,
    customer_name: 150,
    invoice_date: 120,
    total_quantity: 80,
    total_price: 100,
    total_discount: 100,
    grand_total: 120,
    status: 80,
    created_by: 120,
    actions: 150,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    invoice_number: 'Invoice#',
    customer_name: 'Customer Name',
    invoice_date: 'Invoice Date',
    total_quantity: 'Quantity',
    total_price: 'Price',
    total_discount: 'Discount',
    grand_total: 'Grand Total',
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

  const TableRow = ({ item }: { item: Invoice }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>
      
      <View style={{ width: COLUMN_WIDTHS.invoice_number }}>
        <Text style={styles.cellText}>{item.invoice_number}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.customer_name }}>
        <Text style={styles.cellText}>{item.customer_name}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.invoice_date }}>
        <Text style={styles.cellText}>{item.invoice_date ? item.invoice_date.split('T')[0] : ''}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.total_quantity }}>
        <Text style={styles.cellText}>{item.total_quantity}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.total_price }}>
        <Text style={styles.cellText}>{settings.currency}{item.total_price}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.total_discount }}>
        <Text style={styles.cellText}>{settings.currency}{item.total_discount}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.grand_total }}>
        <Text style={styles.cellText}>{settings.currency}{item.grand_total || '-'}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.status }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
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
          {/* View Button */}
          <TouchableOpacity
            onPress={() => router.push(`/(drawer)/invoices/view?id=${item.id}`)}
            style={[styles.actionButton, styles.viewButton]}
          >
            <Ionicons name="eye-outline" size={18} color="#28A745" />
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => router.push(`/(drawer)/invoices/setup?id=${item.id}`)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>

          {/* Delete Button */}
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Invoices</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(drawer)/invoices/setup')}
        >
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
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  headerText: { fontWeight: 'bold', fontSize: 14, color: '#333', paddingHorizontal: 10 },
  cellText: { fontSize: 14, color: '#333', paddingHorizontal: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#E9F9EE',
  },
  editButton: { backgroundColor: '#E8F2FF' },
  deleteButton: { backgroundColor: '#FFEAEA' },
  
  noDataContainer: {
    padding: 22,
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
  },
  
  pagination: { marginTop: 15, marginBottom: 30, alignItems: 'center', justifyContent: 'center' },
  paginationText: { fontSize: 12, color: '#555', marginBottom: 5 },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pageButton: { flexDirection: 'row', alignItems: 'center' },
  pageButtonDisabled: { opacity: 0.5 },
  pageIndicatorText: { fontSize: 14, color: '#333', marginHorizontal: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#FF3B30', textAlign: 'center', marginVertical: 10 },
  retryButton: { padding: 10, backgroundColor: '#007AFF', borderRadius: 6 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
});
