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
  Image,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  id: number;
  image?: string;
  sku?: string;
  name: string;
  brand_name: string;
  category_name: string;
  unit_name: string;
  cost_price?: number;
  sale_price?: number;
  stocks?: number;
  image_url?: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export default function ProductsListsScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const router = useRouter();
  const { token, logout } = useAuth();

  const perPage = 20;
  const [allRecords, setAllRecords] = useState<Product[]>([]);
  const [records, setRecords] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [settings, setSettings] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<keyof Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

    if (!text.trim()) {
      setTotalItems(allRecords.length);
      setTotalPages(Math.ceil(allRecords.length / perPage));
      updatePageRecords(allRecords, 1, perPage);
      setPage(1);
      return;
    }

    const lowerText = text.toLowerCase();

    const filtered = allRecords.filter((product) => {
      const productSKU = product.sku?.toLowerCase() || '';
      const productName = product.name?.toLowerCase() || '';

      return (
        productSKU.includes(lowerText) ||
        productName.includes(lowerText)
      );
    });

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
      const res = await axios.get(`${API_URL}/products`, {
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

  const updatePageRecords = (all: Product[], currentPage: number, perPageCount: number) => {
    const startIndex = (currentPage - 1) * perPageCount;
    const endIndex = startIndex + perPageCount;
    setRecords(all.slice(startIndex, endIndex));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleDelete = async (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/products/${product.id}`, {
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
        return '#34C759';
      case 'inactive':
        return '#FF3B30';
      default:
        return '#34C759';
    }
  };

  const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSort = (field: keyof Product) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);

    const sorted = [...allRecords].sort((a, b) => {
      const aVal = (a[field] ?? '').toString().toLowerCase();
      const bVal = (b[field] ?? '').toString().toLowerCase();
      return newOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    setAllRecords(sorted);
    updatePageRecords(sorted, 1, perPage);
    setPage(1);
  };

  // ✅ Column definitions (match actual Product fields)
  const COLUMN_WIDTHS = {
    id: 50,
    image: 70,
    sku: 100,
    name: 180,
    brand_name: 120,
    category_name: 120,
    unit_name: 100,
    cost_price: 150,
    sale_price: 150,
    stocks: 100,
    status: 100,
    created_by: 120,
    actions: 150,
  };

  const COLUMN_LABELS: Record<keyof typeof COLUMN_WIDTHS, string> = {
    id: 'ID',
    image: 'Image',
    sku: 'SKU',
    name: 'Product Name',
    brand_name: 'Brand',
    category_name: 'Category',
    unit_name: 'Units',
    cost_price: 'Cost Price',
    sale_price: 'Sale Price',
    stocks: 'Stocks',
    status: 'Status',
    created_by: 'Created By',
    actions: 'Actions',
  };

  // ✅ TableHeader with all sortable columns
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {Object.keys(COLUMN_WIDTHS).map((key) => {
        const typedKey = key as keyof typeof COLUMN_WIDTHS;

        const sortableKeys: (keyof Product)[] = [
          'sku',
          'name',
          'brand_name',
          'category_name',
          'unit_name',
          'cost_price',
          'sale_price',
          'stocks',
          'status',
        ];

        const isSortable = sortableKeys.includes(typedKey as keyof Product);

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
                onPress={() => handleSort(typedKey as keyof Product)}
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

  const TableRow = ({ item }: { item: Product }) => (
    <View style={styles.tableRow}>
      <View style={{ width: COLUMN_WIDTHS.id }}>
        <Text style={styles.cellText}>{item.id}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.image }}>
        <TouchableOpacity
          onPress={() => {
            if (item.image_url) {
              setSelectedImage(`${IMAGE_URL}/products/${item.image_url}`);
            } else {
              setSelectedImage(null);
            }
            setModalVisible(true);
          }}
        >
          <Image
            source={
              item.image_url
                ? { uri: `${IMAGE_URL}/products/${item.image_url}` }
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
            {/* ✅ Close Icon */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* ✅ Full Image */}
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


        {/* <Image
          source={
            item.image_url
              ? { uri: `${IMAGE_URL}/products/${item.image_url}` }
              : require('../../../assets/images/placeholder.jpg')
          }
          style={styles.imageContainer}
          resizeMode="cover"
        /> */}
      </View>

      <View style={{ width: COLUMN_WIDTHS.sku }}>
        <Text style={styles.cellText}>{item.sku}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.name }}>
        <Text style={styles.cellText}>{item.name}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.brand_name }}>
        <Text style={styles.cellText}>{item.brand_name}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.category_name }}>
        <Text style={styles.cellText}>{item.category_name}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.unit_name }}>
        <Text style={styles.cellText}>{item.unit_name}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.cost_price }}>
        <Text style={styles.cellText}>{settings.currency}{formatCurrency(item.cost_price ?? 0)}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.sale_price }}>
        <Text style={styles.cellText}>{settings.currency}{formatCurrency(item.sale_price ?? 0)}</Text>
      </View>

      <View style={{ width: COLUMN_WIDTHS.stocks }}>
        <Text style={styles.cellText}>{item.stocks || '-'}</Text>
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
            onPress={() => router.push(`/(drawer)/products/view?id=${item.id}`)}
            style={[styles.actionButton, styles.viewButton]}
          >
            <Ionicons name="eye-outline" size={18} color="#28A745" />
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => router.push(`/(drawer)/products/setup?id=${item.id}`)}
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
        <Text style={styles.title}>Products</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(drawer)/products/setup')}
        >
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sku, product name..."
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
  imageContainer: { width: 40, height: 40, borderRadius: 6, marginHorizontal: 10 },
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

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
});
