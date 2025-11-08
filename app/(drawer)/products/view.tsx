import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function ProductsViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (token && id) {
      fetchSettings();
      fetchProduct(id as string);
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
    }
  };

  const fetchProduct = async (productId: string) => {
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProduct(res.data);
    } catch (err) {
      setError('Failed to load product data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'Out of Stock', color: '#DC2626', bgColor: '#FEE2E2', icon: 'close-circle' };
    if (stock <= 10) return { status: 'Low Stock', color: '#D97706', bgColor: '#FEF3C7', icon: 'warning' };
    return { status: 'In Stock', color: '#059669', bgColor: '#D1FAE5', icon: 'checkmark-circle' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateProfit = () => {
    if (!product?.sale_price || !product?.cost_price) return 0;
    return product.sale_price - product.cost_price;
  };

  const calculateProfitMargin = () => {
    if (!product?.sale_price || !product?.cost_price || product.cost_price === 0) return 0;
    return ((product.sale_price - product.cost_price) / product.cost_price) * 100;
  };

  const stockStatus = getStockStatus(product.stock);
  const profit = calculateProfit();
  const profitMargin = calculateProfitMargin();

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/products/lists')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Product Details</Text>
          
          <TouchableOpacity 
            onPress={() => router.push(`/(drawer)/products/setup?id=${id}`)} 
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={20} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Product Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={() => {
                if (product.images?.image_name) {
                  setSelectedImage(`${IMAGE_URL}/products/${product.images.image_name}`);
                  setModalVisible(true);
                }
              }}
              style={styles.imageTouchable}
            >
              {product.images?.image_name ? (
                <View style={styles.imageContainer}>
                  {imageLoading && (
                    <ActivityIndicator size="small" color="#6366F1" style={styles.imageLoader} />
                  )}
                  <Image
                    source={{ uri: `${IMAGE_URL}/products/${product.images.image_name}` }}
                    style={styles.productImage}
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                  />
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="cube-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.heroInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSKU}>SKU: {product.sku}</Text>
            <Text style={styles.productStock}>Stocks: {product.stock} units available</Text>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, product.status === 'Active' ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={styles.statusText}>{product.status}</Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: stockStatus.bgColor }]}>
                <Ionicons name={stockStatus.icon as any} size={14} color={stockStatus.color} />
                <Text style={[styles.stockStatusText, { color: stockStatus.color }]}>
                  {stockStatus.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="card-outline" size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue}>
              {settings.currencyView}{formatCurrency(product.cost_price)}
            </Text>
            <Text style={styles.statLabel}>Cost Price</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="pricetag-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.statValue}>{settings.currencyView}{formatCurrency(product.sale_price)}</Text>
            <Text style={styles.statLabel}>Sale Price</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons 
                name={profit >= 0 ? "trending-up-outline" : "trending-down-outline"} 
                size={20} 
                color={profit >= 0 ? '#2563EB' : '#DC2626'} 
              />
            </View>
            <Text style={[styles.statValue, { color: profit >= 0 ? '#059669' : '#DC2626' }]}>
              {settings.currencyView}{formatCurrency(profit)}
            </Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="analytics-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={[styles.statValue, { color: profitMargin >= 0 ? '#7C3AED' : '#DC2626' }]}>
              {profitMargin.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Margin</Text>
          </View>
        </View>

        {/* Product Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Product Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <InfoItem 
              icon="pricetags-outline"
              label="Category"
              value={product.category_name || product.category?.name || 'Not set'}
            />
            <InfoItem 
              icon="business-outline"
              label="Brand"
              value={product.brand_name || product.brand?.name || 'Not set'}
            />
            <InfoItem 
              icon="scale-outline"
              label="Unit"
              value={product.unit_name || product.unit?.name || 'Not set'}
            />
          </View>
        </View>

        {/* Pricing Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Pricing Details</Text>
          </View>
          
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Cost Price</Text>
              <Text style={styles.costPriceText}>
                {settings.currencyView}{formatCurrency(product.cost_price)}
              </Text>
            </View>
            
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Sale Price</Text>
              <Text style={styles.salePriceText}>
                {settings.currencyView}{formatCurrency(product.sale_price)}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.pricingRow}>
              <Text style={styles.profitLabel}>Profit Margin</Text>
              <View style={styles.profitSection}>
                <Text style={[styles.profitValue, { color: profitMargin >= 0 ? '#059669' : '#DC2626' }]}>
                  {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}%
                </Text>
                <Ionicons 
                  name={profitMargin >= 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={profitMargin >= 0 ? '#059669' : '#DC2626'} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Stock Alert */}
        {product.stock <= 10 && (
          <View style={[styles.alertCard, product.stock === 0 ? styles.dangerAlert : styles.warningAlert]}>
            <Ionicons 
              name={product.stock === 0 ? "close-circle" : "warning"} 
              size={24} 
              color={product.stock === 0 ? "#DC2626" : "#D97706"} 
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {product.stock === 0 ? 'Out of Stock' : 'Low Stock Alert'}
              </Text>
              <Text style={styles.alertText}>
                {product.stock === 0 
                  ? 'This product is currently out of stock. Consider restocking to meet customer demand.'
                  : `Only ${product.stock} units remaining. Consider restocking soon to avoid stockouts.`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {product.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#374151" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full Image Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// Info Item Component
const InfoItem = ({ icon, label, value }: any) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color="#6366F1" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: '#374151',
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  editText: {
    color: '#6366F1',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarSection: {
    alignItems: 'center',
    marginRight: 20,
  },
  imageTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  imageLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
    zIndex: 1,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  heroInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productSKU: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 14,
    color: '#6B7280',
  },
  salePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  costPrice: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  pricingCard: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  costPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  salePriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  profitLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profitSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
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
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  descriptionCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 12,
  },
});