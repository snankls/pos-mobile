import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/LoadingScreen';
import Pagination from '../../components/Pagination';

interface Stock {
  id: number;
  stock_number?: string;
  stock_date: string;
  total_stock: string;
  total_price: number;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function StocksListsScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const router = useRouter();
  const { token, logout } = useAuth();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Stock[]>([]);
  const [records, setRecords] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [settings, setSettings] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<keyof Stock | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
      fetchSettings();
    }, [token])
  );

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, allRecords]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    const filtered = allRecords.filter((stock) =>
      (stock.stock_number?.toLowerCase() || '').includes(text.toLowerCase())
    );

    setTotalItems(filtered.length);
    setTotalPages(Math.ceil(filtered.length / perPage));
    updatePageRecords(filtered, 1, perPage);
    setPage(1);
  };

  const fetchSettings = async () => {
    if (!token) {
      console.error('Token missing for settings API');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/settings`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const settingsObj: Record<string, string> = {};

      Object.values(response.data).forEach((setting: any) => {
        if (setting.data_name && setting.data_value !== undefined) {
          settingsObj[setting.data_name] = setting.data_value;
        }
      });

      setSettings(settingsObj);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      if (error.response?.status === 401) {
        console.log('Authentication Error', 'Please login again');
      }
    }
  };

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/stocks`, {
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

  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const updatePageRecords = (all: Stock[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleDelete = async (stock: Stock) => {
    Alert.alert(
      'Delete Stock',
      `Are you sure you want to delete "${stock.stock_number}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/stocks/${stock.id}`, {
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
    switch (status?.toLowerCase()) {
      case 'active': return '#34C759';
      case 'inactive': return '#FF3B30';
      case 'posted': return '#007AFF';
      default: return '#34C759';
    }
  };

  const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSort = (field: keyof Stock) => {
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

  // Column definitions
  const COLUMN_WIDTHS = {
    id: 50,
    stock_number: 150,
    stock_date: 120,
    total_stock: 120,
    total_price: 150,
    status: 100,
    created_by: 120,
    actions: 150,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    stock_number: 'Stock Number',
    stock_date: 'Stock Date',
    total_stock: 'Total Stock',
    total_price: 'Total Price',
    status: 'Status',
    created_by: 'Created By',
    actions: 'Actions',
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {Object.keys(COLUMN_WIDTHS).map((key) => {
        const typedKey = key as keyof typeof COLUMN_WIDTHS;

        // valid sortable fields
        const sortableKeys: (keyof Stock)[] = [
          'stock_number',
          'stock_date',
          'total_stock',
          'total_price',
          'status',
        ];

        const isSortable = sortableKeys.includes(typedKey as keyof Stock);

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
              ]}
            >
              {COLUMN_LABELS[typedKey]}
            </Text>

            {isSortable && (
              <TouchableOpacity
                onPress={() => handleSort(typedKey as keyof Stock)}
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

  const TableRow = ({ item }: { item: Stock }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.stock_number }}>
        <Text style={styles.cellText}>{item.stock_number}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.stock_date }}>
        <Text style={styles.cellText}>{item.stock_date}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.total_stock }}>
        <Text style={styles.cellText}>{item.total_stock}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.total_price }}>
        <Text style={styles.cellText}>{settings.currency}{formatCurrency(item.total_price ?? 0)}</Text>
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
            onPress={() => router.push(`/(drawer)/stocks/view?id=${item.id}`)}
            style={[styles.actionButton, styles.viewButton]}
          >
            <Ionicons name="eye-outline" size={18} color="#28A745" />
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => router.push(`/(drawer)/stocks/setup?id=${item.id}`)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            disabled={item.status === 'Posted'}
            style={[
              styles.actionButton,
              styles.deleteButton,
              (item.status === 'Posted') && styles.deleteButtonDisabled
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={item.status === 'Posted' ? '#ccc' : '#FF3B30'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Stocks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(drawer)/stocks/setup')}
        >
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stock number..."
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
    color: '#000',
  },
  
  headerText: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#333', 
    paddingHorizontal: 10 
  },
  
  cellText: { 
    fontSize: 14, 
    color: '#333', 
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
  
  retryButton: { 
    padding: 10, 
    backgroundColor: '#007AFF', 
    borderRadius: 6 
  },
  
  retryButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  
  actionButtons: { 
    flexDirection: 'row', 
    gap: 10 
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },
  viewButton: {
    backgroundColor: '#E9F9EE',
  },
  editButton: { 
    backgroundColor: '#E8F2FF' 
  },
  deleteButton: { 
    backgroundColor: '#FFEAEA' 
  },
  deleteButtonDisabled: {
    opacity: 0.7,
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
    alignItems: 'center' 
  },
  
  errorText: { 
    fontSize: 16, 
    color: '#FF3B30', 
    textAlign: 'center', 
    marginVertical: 10 
  },
  
  noDataContainer: {
    padding: 22,
  },
});