import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function StocksViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [stock, setStock] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && id) {
      fetchStock(id as string);
    }
  }, [token, id]);

  const fetchStock = async (stockId: string) => {
    try {
      const response = await axios.get(`${API_URL}/stocks/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setStock(response.data);
      setStockItems(response.data.details || []);
    } catch (err) {
      setError('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { color: '#059669', bgColor: '#D1FAE5' };
      case 'inactive': return { color: '#6B7280', bgColor: '#F3F4F6' };
      case 'Deleted': return { color: '#DC2626', bgColor: '#FEE2E2' };
      default: return { color: '#6B7280', bgColor: '#F3F4F6' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(quantity);
  };

  if (error || !stock) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Stock Not Found</Text>
          <Text style={styles.errorText}>{error || 'The stock record you are looking for does not exist.'}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(drawer)/stocks/lists')}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Stocks</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusColor(stock.status);

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/stocks/lists')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Stock Details</Text>
          
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="download-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Stock Header Card */}
        <View style={styles.stockHeaderCard}>
          <View style={styles.stockHeaderRow}>
            <View>
              <Text style={styles.stockNumber}>{stock.stock_number}</Text>
              <Text style={styles.stockDate}>{formatDate(stock.stock_date)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {stock.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Summary */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={24} color="#6366F1" />
            <Text style={styles.statValue}>{formatQuantity(parseFloat(stock.total_stock))}</Text>
            <Text style={styles.statLabel}>Total Stock</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={styles.statValue}>₹{formatCurrency(parseFloat(stock.total_price))}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="list-outline" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{stockItems.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
        </View>

        {/* Stock Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Stock Items ({stockItems.length})</Text>
          </View>
          
          <View style={styles.itemsContainer}>
            {stockItems.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>
                    {item.product_name || `Product ${index + 1}`}
                  </Text>
                  <Text style={styles.itemSku}>
                    SKU: {item.product_sku}
                  </Text>
                  <Text style={styles.itemSku}>
                    Unit: {item.unit_name}
                  </Text>
                </View>
                
                <View style={styles.itemDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>
                      {formatQuantity(parseFloat(item.stock))}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Unit Price:</Text>
                    <Text style={styles.detailValue}>
                      ₹{formatCurrency(parseFloat(item.price))}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Amount:</Text>
                    <Text style={styles.detailValue}>
                      ₹{formatCurrency(parseFloat(item.total_amount))}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Stock Quantity</Text>
            <Text style={styles.summaryValue}>
              {formatQuantity(parseFloat(stock.total_stock))}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Stock Value</Text>
            <Text style={styles.summaryValue}>
              ₹{formatCurrency(parseFloat(stock.total_price))}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Net Value</Text>
            <Text style={styles.grandTotalValue}>
              ₹{formatCurrency(parseFloat(stock.total_price))}
            </Text>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Additional Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <DetailItem 
              icon="calendar-outline" 
              label="Stock Date" 
              value={formatDate(stock.stock_date)} 
            />
            <DetailItem 
              icon="time-outline" 
              label="Created Date" 
              value={formatDate(stock.created_at)} 
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="print-outline" size={18} color="#6366F1" />
            <Text style={styles.secondaryButtonText}>Print Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Share Stock</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Detail Item Component
const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={18} color="#6B7280" />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value || 'Not provided'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backText: {
    color: '#374151',
    marginLeft: 4,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  iconButton: {
    padding: 8,
  },
  stockHeaderCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  stockDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  sectionContent: {
    gap: 12,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 16,
  },
});