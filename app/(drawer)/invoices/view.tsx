import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function InvoiceViewScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && id) {
      fetchInvoice(id as string);
      fetchSettings();
    }
  }, [token, id]);

  const fetchInvoice = async (invoiceId: string) => {
    try {
      const invoiceRes = await axios.get(`${API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInvoice(invoiceRes.data);
      setInvoiceItems(invoiceRes.data.details || []);
    } catch (err) {
      setError('Failed to load invoice data.');
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { color: '#059669', bgColor: '#D1FAE5' };
      case 'Inactive': return { color: '#DC2626', bgColor: '#FEE2E2' };
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

  const downloadPDF = async () => {
    try {
      Alert.alert(
        'Download PDF',
        'Do you want to download this invoice as PDF?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                const response = await axios.get(`${API_URL}/invoices/${id}/pdf`, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  responseType: 'blob' // Important for file download
                });

                // For web - open in new tab
                if (Platform.OS === 'web') {
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `invoice-${invoice.invoice_number}.pdf`;
                  link.click();
                  window.URL.revokeObjectURL(url);
                } else {
                  // For mobile - you might need additional libraries like expo-file-system
                  Alert.alert('Success', 'PDF download started');
                  // For React Native, you might need to use Linking or share the file
                  // This is a basic implementation - you may need to adjust for mobile
                }
              } catch (error: any) {
                console.error('Error downloading PDF:', error);
                Alert.alert('Error', 'Failed to download PDF. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in download PDF:', error);
    }
  };

  const emailInvoice = async () => {
    try {
      Alert.alert(
        'Email Invoice',
        'Do you want to send this invoice via email?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Email',
            onPress: async () => {
              try {
                const response = await axios.post(`${API_URL}/invoices/${id}/email`, {}, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (response.data.success) {
                  Alert.alert('Success', 'Invoice has been sent via email successfully.');
                } else {
                  Alert.alert('Error', response.data.message || 'Failed to send email.');
                }
              } catch (error: any) {
                console.error('Error sending email:', error);
                const errorMsg = error.response?.data?.message || 'Failed to send email. Please try again.';
                Alert.alert('Error', errorMsg);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in email invoice:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Invoice Not Found</Text>
          <Text style={styles.errorText}>{error || 'The invoice you are looking for does not exist.'}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(drawer)/invoices/lists')}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Invoices</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusColor(invoice.status);

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/invoices/lists')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Invoice Details</Text>
          
          <TouchableOpacity onPress={() => router.push(`/(drawer)/invoices/setup?id=${id}`)} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color="#6366F1" />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
        </View>

        {/* Invoice Header Card */}
        <View style={styles.invoiceHeaderCard}>
          <View style={styles.invoiceHeaderRow}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
              <Text style={styles.invoiceDate}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
          
          {invoice.description && (
            <Text style={styles.description}>{invoice.description}</Text>
          )}
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <DetailItem 
              icon="business-outline" 
              label="Customer" 
              value={invoice.customer_name || 'N/A'} 
            />
            <DetailItem 
              icon="mail-outline" 
              label="Email" 
              value={invoice.customer_email || 'N/A'} 
            />
            <DetailItem 
              icon="logo-whatsapp" 
              label="WhatsApp" 
              value={invoice.customer_whatsapp || 'N/A'} 
            />
            <DetailItem 
              icon="location-outline" 
              label="Address" 
              value={invoice.customer_address || 'N/A'} 
            />
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Items ({invoiceItems.length})</Text>
          </View>
          
          <View style={styles.itemsContainer}>
            {invoiceItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>
                    {item.product_name || `Item ${index + 1}`}
                  </Text>
                  <Text style={styles.itemSku}>
                    SKU: {item.product_sku || 'N/A'} • {item.unit_name}
                  </Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} × {item.sale_price}
                    {item.discount_value > 0 && (
                      <Text style={styles.discountText}>
                        {' '}({item.discount_value} {item.discount_type === 'Percentage' ? '%' : ''})
                      </Text>
                    )}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {settings.currency_sign}{item.total}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantity</Text>
            <Text style={styles.summaryValue}>
              {invoice.total_quantity}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {settings.currency_sign}{invoice.total_price}
            </Text>
          </View>
          
          {invoice.total_discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                {settings.currency_sign}{invoice.total_discount}
              </Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {settings.currency_sign}{invoice.grand_total}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={downloadPDF}
          >
            <Ionicons name="download-outline" size={18} color="#6366F1" />
            <Text style={styles.secondaryButtonText}>Download PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={emailInvoice}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Email Invoice</Text>
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
      <Text style={styles.detailValue} numberOfLines={2}>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  invoiceHeaderCard: {
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
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  invoiceDate: {
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
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
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
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
    marginTop: 2,
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
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  discountText: {
    color: '#DC2626',
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
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
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
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
  discountValue: {
    color: '#DC2626',
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
    color: '#6366F1',
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