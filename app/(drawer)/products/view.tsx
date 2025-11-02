import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal
} from 'react-native';
import axios from 'axios';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
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
    } finally {
      setLoading(false);
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

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'Out of Stock', color: '#DC2626', bgColor: '#FEE2E2' };
    if (stock <= 10) return { status: 'Low Stock', color: '#D97706', bgColor: '#FEF3C7' };
    return { status: 'In Stock', color: '#059669', bgColor: '#D1FAE5' };
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

  if (error || !product) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>{error || 'The product you are looking for does not exist.'}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(drawer)/products/lists')}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          
          <TouchableOpacity onPress={() => router.push(`/(drawer)/products/setup?id=${id}`)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Product Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.imageContainer}>
            {product.images && product.images.image_name ? (
              <TouchableOpacity
                onPress={() => {
                  if (product.images.image_name) {
                    setSelectedImage(`${IMAGE_URL}/products/${product.images.image_name}`);
                  } else {
                    setSelectedImage(null);
                  }
                  setModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: `${IMAGE_URL}/products/${product.images.image_name}` }}
                  style={styles.productImage}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={50} color="#9CA3AF" />
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}

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
          </View>
          
          <View style={styles.heroInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSKU}>SKU: {product.sku || 'N/A'}</Text>
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, 
                product.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={styles.statusText}>{product.status}</Text>
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
            <Text style={styles.statValue}>{product.stock}</Text>
            <Text style={styles.statLabel}>Current Stock</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="currency-usd" size={24} color="#10B981" />
            <Text style={styles.statValue}>{settings.currency}{formatCurrency(product.sale_price || '0.00')}</Text>
            <Text style={styles.statLabel}>Sale Price {settings.currency}</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="chart-line" size={20} color={profit >= 0 ? '#059669' : '#DC2626'} />
            <Text style={[styles.statValue, { color: profit >= 0 ? '#059669' : '#DC2626' }]}>
              {settings.currency}{formatCurrency(profit)}
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
              <Text style={styles.costPrice}>{settings.currency}{formatCurrency(product.cost_price)}</Text>
            </View>
            
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Sale Price</Text>
              <Text style={styles.salePrice}>{settings.currency}{formatCurrency(product.sale_price)}</Text>
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

        {/* Product Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Product Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <DetailItem 
              icon="category" 
              label="Category" 
              value={product.category_name || product.category?.name} 
            />
            <DetailItem 
              icon="branding-watermark" 
              label="Brand" 
              value={product.brand_name || product.brand?.name} 
            />
            <DetailItem 
              icon="straighten" 
              label="Unit" 
              value={product.unit_name || product.unit?.name} 
            />
          </View>
        </View>

        {/* Stock Alert */}
        {product.stock <= 10 && (
          <View style={[styles.alertCard, product.stock === 0 ? styles.dangerAlert : styles.warningAlert]}>
            <Ionicons 
              name={product.stock === 0 ? "close-circle-outline" : "warning-outline"} 
              size={24} 
              color={product.stock === 0 ? "#DC2626" : "#D97706"} 
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {product.stock === 0 ? 'Out of Stock' : 'Low Stock Alert'}
              </Text>
              <Text style={styles.alertText}>
                {product.stock === 0 
                  ? 'This product is currently out of stock. Consider restocking.'
                  : `Only ${product.stock} units left. Consider restocking soon.`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {product.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#374151" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{product.description}</Text>
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
  productImage: {
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
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productSKU: {
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
    backgroundColor: '#6B7280',
  },
  inactiveBadge: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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