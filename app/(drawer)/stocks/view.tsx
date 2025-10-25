import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function StocksViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && id) {
      fetchSettings();
      fetchStock(id as string);
    }
  }, [token, id]);

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

  const fetchStock = async (stockId: string) => {
    try {
      const res = await axios.get(`${API_URL}/stocks/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStock(res.data);
    } catch (err) {
      setError('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'Out of Stock', color: '#DC2626', bgColor: '#FEE2E2' };
    if (stock <= 10) return { status: 'Low Stock', color: '#D97706', bgColor: '#FEF3C7' };
    return { status: 'In Stock', color: '#059669', bgColor: '#D1FAE5' };
  };

  const calculateProfit = () => {
    if (!stock?.sale_price || !stock?.cost_price) return 0;
    return stock.sale_price - stock.cost_price;
  };

  const calculateProfitMargin = () => {
    if (!stock?.sale_price || !stock?.cost_price || stock.cost_price === 0) return 0;
    return ((stock.sale_price - stock.cost_price) / stock.cost_price) * 100;
  };

  if (error || !stock) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Stock Not Found</Text>
          <Text style={styles.errorText}>{error || 'The stock you are looking for does not exist.'}</Text>
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

  const imageUrl = stock.images && stock.images.image_name
    ? `${IMAGE_URL}/uploads/stocks/${stock.images.image_name}`
    : null;

  const stockStatus = getStockStatus(stock.stock);
  const profit = calculateProfit();
  const profitMargin = calculateProfitMargin();

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
          
          <TouchableOpacity onPress={() => router.push(`/(drawer)/stocks/setup?id=${id}`)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Stock Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.stockImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={50} color="#9CA3AF" />
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
          </View>
          
          <View style={styles.heroInfo}>
            <Text style={styles.stockName}>{stock.name}</Text>
            <Text style={styles.stockSKU}>SKU: {stock.sku || 'N/A'}</Text>
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, 
                stock.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={styles.statusText}>{stock.status}</Text>
              </View>
              
              <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
                <Text style={[styles.stockText, { color: stockStatus.color }]}>
                  {stockStatus.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#6366F1" />
            <Text style={styles.statValue}>{stock.stock}</Text>
            <Text style={styles.statLabel}>Current Stock</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="currency-usd" size={24} color="#10B981" />
            <Text style={styles.statValue}>{settings.currency_sign}{stock.sale_price || '0.00'}</Text>
            <Text style={styles.statLabel}>Sale Price   {settings.currency_sign}</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="chart-line" size={20} color={profit >= 0 ? '#059669' : '#DC2626'} />
            <Text style={[styles.statValue, { color: profit >= 0 ? '#059669' : '#DC2626' }]}>
              {settings.currency_sign}{profit.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
        </View>

        {/* Pricing Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Pricing & Profit</Text>
          </View>
          
          <View style={styles.pricingGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Cost Price</Text>
              <Text style={styles.costPrice}>{settings.currency_sign}{stock.cost_price || '0.00'}</Text>
            </View>
            
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Sale Price</Text>
              <Text style={styles.salePrice}>{settings.currency_sign}{stock.sale_price || '0.00'}</Text>
            </View>
            
            <View style={styles.profitItem}>
              <Text style={styles.priceLabel}>Profit Margin</Text>
              <View style={styles.marginRow}>
                <Text style={[
                  styles.profitMargin,
                  { color: profitMargin >= 0 ? '#059669' : '#DC2626' }
                ]}>
                  {profitMargin.toFixed(1)}%
                </Text>
                <MaterialCommunityIcons 
                  name={profitMargin >= 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={profitMargin >= 0 ? '#059669' : '#DC2626'} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Stock Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Stock Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <DetailItem 
              icon="category" 
              label="Category" 
              value={stock.category_name || stock.category?.name} 
            />
            <DetailItem 
              icon="branding-watermark" 
              label="Brand" 
              value={stock.brand_name || stock.brand?.name} 
            />
            <DetailItem 
              icon="straighten" 
              label="Unit" 
              value={stock.unit_name || stock.unit?.name} 
            />
          </View>
        </View>

        {/* Stock Alert */}
        {stock.stock <= 10 && (
          <View style={[styles.alertCard, stock.stock === 0 ? styles.dangerAlert : styles.warningAlert]}>
            <Ionicons 
              name={stock.stock === 0 ? "close-circle-outline" : "warning-outline"} 
              size={24} 
              color={stock.stock === 0 ? "#DC2626" : "#D97706"} 
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {stock.stock === 0 ? 'Out of Stock' : 'Low Stock Alert'}
              </Text>
              <Text style={styles.alertText}>
                {stock.stock === 0 
                  ? 'This stock is currently out of stock. Consider restocking.'
                  : `Only ${stock.stock} units left. Consider restocking soon.`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {stock.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#374151" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{stock.description}</Text>
            </View>
          </View>
        )}
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
        {value || '-'}
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editText: {
    color: '#6366F1',
    marginLeft: 4,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 16,
  },
  stockImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
  },
  heroInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stockSKU: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockText: {
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
  pricingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priceItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  profitItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  costPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitMargin: {
    fontSize: 16,
    fontWeight: '700',
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
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dangerAlert: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  warningAlert: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  descriptionCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});