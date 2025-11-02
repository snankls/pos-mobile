import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Modal
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomersViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (token && id) {
      fetchCustomer(id as string);
      fetchSettings();
    }
  }, [token, id]);

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

  const fetchCustomer = async (customerId: string) => {
    try {
      const res = await axios.get(`${API_URL}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomer(res.data);
    } catch (err) {
      setError('Failed to load customer data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (error || !customer) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'Customer not found.'}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(drawer)/customers/lists')}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Customers</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/customers/lists')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Customer Details</Text>
          
          <TouchableOpacity onPress={() => router.push(`/(drawer)/customers/setup?id=${id}`)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {customer?.images?.image_name ? (
              <TouchableOpacity
                onPress={() => {
                  if (customer.images.image_name) {
                    setSelectedImage(`${IMAGE_URL}/customers/${customer.images.image_name}`);
                  } else {
                    setSelectedImage(null);
                  }
                  setModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: `${IMAGE_URL}/customers/${customer.images.image_name}` }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
            <View style={[styles.statusBadge, 
              customer.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={styles.statusText}>{customer.status}</Text>
            </View>

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
          
          <View style={styles.profileInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerCode}>ID/Code: {customer.code}</Text>
            <Text style={styles.customerCNIC}>CNIC: {customer.cnic}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <DetailItem 
              icon="mail-outline" 
              label="Email" 
              value={customer.email_address} 
            />
            <DetailItem 
              icon="phone-portrait-outline" 
              label="Mobile" 
              value={customer.mobile_number} 
            />
            <DetailItem 
              icon="call-outline" 
              label="Phone" 
              value={customer.phone_number} 
            />
            <DetailItem 
              icon="logo-whatsapp" 
              label="WhatsApp" 
              value={customer.whatsapp} 
            />
            <DetailItem 
              icon="location-outline" 
              label="City" 
              value={customer.city?.name} 
            />
          </View>
        </View>

        {/* Financial Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={16} color="#374151" />
            <Text style={styles.sectionTitle}>Financial Information</Text>
          </View>
          
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Credit Balance</Text>
              <Text style={styles.financialValue}>
                {settings.currency}{formatCurrency(customer.credit_balance || '0.00')}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Credit Limit</Text>
              <Text style={styles.financialValue}>
                {settings.currency}{formatCurrency(customer.credit_limit || '0.00')}
              </Text>
            </View>
          </View>
        </View>

        {/* Address */}
        {customer.address && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home-outline" size={20} color="#374151" />
              <Text style={styles.sectionTitle}>Address</Text>
            </View>
            
            <View style={styles.addressCard}>
              <Text style={styles.addressText}>{customer.address}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Message Button */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !customer.mobile_number && styles.disabledButton
            ]}
            disabled={!customer.mobile_number}
            onPress={() => Linking.openURL(`sms:${customer.mobile_number}`)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={customer.mobile_number ? "#6366F1" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                !customer.mobile_number && { color: "#9CA3AF" }
              ]}
            >
              Message
            </Text>
          </TouchableOpacity>

          {/* Call Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !(customer.mobile_number || customer.phone_number) && styles.disabledButton
            ]}
            disabled={!(customer.mobile_number || customer.phone_number)}
            onPress={() => {
              const phoneNumber = customer.mobile_number || customer.phone_number;
              Linking.openURL(`tel:${phoneNumber}`);
            }}
          >
            <Ionicons
              name="call-outline"
              size={18}
              color={customer.mobile_number || customer.phone_number ? "#fff" : "#ccc"}
            />
            <Text
              style={[
                styles.buttonText,
                !(customer.mobile_number || customer.phone_number) && { color: "#ccc" }
              ]}
            >
              Call
            </Text>
          </TouchableOpacity>

          {/* WhatsApp Button — only visible if mobile number exists */}
          {customer.mobile_number ? (
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => Linking.openURL(`whatsapp://send?phone=${customer.mobile_number}`)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.whatsappButton, styles.disabledButton]}
              disabled
            >
              <Ionicons name="logo-whatsapp" size={18} color="#ccc" />
              <Text style={[styles.buttonText, { color: "#ccc" }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Professional Detail Item Component
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
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#34C759',
  },
  inactiveBadge: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customerCode: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 2,
  },
  customerCNIC: {
    fontSize: 14,
    color: '#6B7280',
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
  financialGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  financialItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  financialLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addressCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontWeight: '500',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
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