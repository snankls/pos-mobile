import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';
import axios from 'axios';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function CustomersViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && id) {
      fetchCustomer(id as string);
    }
  }, [token, id]);

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

  const imageUrl = customer.image_url
    ? `${IMAGE_URL}/uploads/customers/${customer.image_url}`
    : null;

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
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
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
            <FontAwesome5 name="money-bill-wave" size={16} color="#374151" />
            <Text style={styles.sectionTitle}>Financial Information</Text>
          </View>
          
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Credit Balance</Text>
              <Text style={styles.financialValue}>
                ₹{customer.credit_balance || '0.00'}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Credit Limit</Text>
              <Text style={styles.financialValue}>
                ₹{customer.credit_limit || '0.00'}
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
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                if (customer.mobile_number) {
                  // For messaging - would typically open messaging app
                  Linking.openURL(`sms:${customer.mobile_number}`);
                } else {
                  Alert.alert('No mobile number', 'Mobile number is not available for this customer.');
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#6366F1" />
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => {
                if (customer.mobile_number) {
                  // Open WhatsApp with phone number
                  Linking.openURL(`whatsapp://send?phone=${customer.mobile_number}`);
                } else {
                  Alert.alert('No mobile number', 'Mobile number is not available for WhatsApp.');
                }
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => {
                if (customer.mobile_number || customer.phone_number) {
                  // Prefer mobile number, fallback to phone number
                  const phoneNumber = customer.mobile_number || customer.phone_number;
                  Linking.openURL(`tel:${phoneNumber}`);
                } else {
                  Alert.alert('No phone number', 'No phone number is available for this customer.');
                }
              }}
            >
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Call</Text>
            </TouchableOpacity>
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
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
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
});