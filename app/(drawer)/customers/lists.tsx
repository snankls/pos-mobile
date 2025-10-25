import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/LoadingScreen';
import Pagination from '../../components/Pagination';

interface Customer {
  id: number;
  image?: string;
  code?: string;
  name: string;
  mobile_number?: string;
  city_name?: string;
  whatsapp?: string;
  image_url?: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function CustomersListsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const { token, logout } = useAuth();
  const navigation = useNavigation();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Customer[]>([]);
  const [records, setRecords] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [token])
  );

  useEffect(() => {
    updatePageRecords(allRecords, page, perPage);
  }, [page, allRecords]);

  const fetchRecords = async () => {
    if (!token) return logout();

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/customers`, {
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

  const updatePageRecords = (all: Customer[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleDelete = async (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/customers/${customer.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchRecords();
            } catch (err) {
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
      case 'blocked':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  const COLUMN_WIDTHS = {
    id: 50,
    image: 70,
    id_code: 100,
    customer_name: 180,
    mobile_number: 120,
    whatsapp: 100,
    city: 120,
    status: 80,
    created_by: 100,
    actions: 150,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    image: 'Image',
    id_code: 'Code',
    customer_name: 'Customer Name',
    mobile_number: 'Mobile Number',
    whatsapp: 'Whatsapp',
    city: 'City',
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

  const TableRow = ({ item }: { item: Customer }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.image }}>
        <Image
          key={item.id}
          source={
            item.image_url
              ? { uri: `${IMAGE_URL}/uploads/customers/${item.image_url}` }
              : require('../../../assets/images/placeholder.jpg')
          }
          style={{ width: 50, height: 50, borderRadius: 5 }}
          resizeMode="cover"
          onError={(e) => console.log('Image error:', e.nativeEvent.error)}
        />
      </View>
      <View style={{ width: COLUMN_WIDTHS.id_code }}>
        <Text style={styles.cellText}>{item.code}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.customer_name }}>
        <Text style={styles.cellText}>{item.name}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.mobile_number }}>
        <Text style={styles.cellText}>{item.mobile_number || '-'}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.whatsapp }}>
        <Text style={styles.cellText}>{item.whatsapp || '-'}</Text>
      </View>
      <View style={{ width: COLUMN_WIDTHS.city }}>
        <Text style={styles.cellText}>{item.city_name || '-'}</Text>
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
            onPress={() => router.push(`/(drawer)/customers/view?id=${item.id}`)}
            style={[styles.actionButton, styles.viewButton]}
          >
            <Ionicons name="eye-outline" size={18} color="#28A745" />
          </TouchableOpacity>
          
          {/* Edit Button */}
          <TouchableOpacity onPress={() => router.push(`/(drawer)/customers/setup?id=${item.id}`)} style={[styles.actionButton, styles.editButton]}>
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          {/* Delete Button */}
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
        <Text style={styles.title}>Customers</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(drawer)/customers/setup')}
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
            keyExtractor={(item) => item.id.toString()}
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
  headerText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  cellText: { fontSize: 14, color: '#333' },
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
