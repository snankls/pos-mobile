import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../../components/LoadingScreen';
import { useAuth } from '../../../contexts/AuthContext';

interface Customer {
  id: string;
  name: string;
  code: string;
  customer_label?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: string;
  unit_id: string;
  unit_name: string;
  product_label?: string;
  price?: number;
}

interface Invoice {
  id?: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  status: string;
  description: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: string;
  unit_id: string;
  unit_name: string;
  discountType: string;
  discountValue: string;
  price: string | number;
  total_amount: string | number;
}

export default function InvoicesSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Invoice>({
    customer_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    description: '',
    items: []
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsList, setItemsList] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showProductPickers, setShowProductPickers] = useState<boolean[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDiscountTypePickers, setShowDiscountTypePickers] = useState<boolean[]>([]);
  const [settings, setSettings] = useState<any>({});

  // Status options from API
  const [statusOptions, setStatusOptions] = useState<any[]>([]);

  // Calculate totals
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const resetForm = () => {
    setCurrentRecord({
      customer_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      description: '',
      items: []
    });
    setItemsList([]);
    setShowProductPickers([]);
    setShowDiscountTypePickers([]);
    setFormErrors({});
    setGlobalErrorMessage('');
    setIsEditMode(false);
  };

  // Update row total when quantity or discount changes
  const updateRowTotal = (index: number) => {
    setItemsList(prevItems => {
      const updated = [...prevItems];
      const item = updated[index];
      if (!item) return prevItems;

      const qty = parseFloat(item.quantity) || 0;
      const price = Number(item.price) || 0; // ✅ Ensure number
      const discountValue = parseFloat(item.discountValue) || 0;

      let discountAmount = 0;
      if (item.discountType === 'Percentage') {
        discountAmount = (qty * price * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }

      const total = qty * price - discountAmount;
      updated[index].total_amount = Math.max(0, parseFloat(total.toFixed(2)));

      return updated;
    });
  };

  // Update all totals
  const updateTotals = () => {
    let quantityTotal = 0;
    let priceTotal = 0;
    let discountTotal = 0;
    let grandTotalCalc = 0;

    itemsList.forEach(item => {
      // Include all items with product_id
      if (!item.product_id) return;

      const qty = parseFloat(item.quantity) || 0;
      const price = Number(item.price) || 0; // ✅ Ensure number
      const discountValue = parseFloat(item.discountValue) || 0;
      const discountType = item.discountType || 'Fixed';

      const subtotal = qty * price;

      const discount = discountType === 'Percentage'
        ? (subtotal * discountValue) / 100
        : discountValue;

      const total = subtotal - discount;

      quantityTotal += qty;
      priceTotal += subtotal;
      discountTotal += discount;
      grandTotalCalc += total;
    });

    setTotalQuantity(quantityTotal);
    setTotalPrice(priceTotal);
    setTotalDiscount(discountTotal);
    setGrandTotal(grandTotalCalc);
  };

  useEffect(() => {
    if (itemsList.length > 0) {
      updateTotals();
    } else {
      setTotalQuantity(0);
      setTotalPrice(0);
      setTotalDiscount(0);
      setGrandTotal(0);
    }
  }, [itemsList]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchProducts()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if we're in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
    } else {
      resetForm();
    }
  }, [id]);

  // Combined data fetching effect
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch all initial data
        await Promise.all([
          fetchInitialData(),
          fetchSettings(),
          fetchStatus()
        ]);

        // If in edit mode and we have ID, fetch invoice data
        if (id && isEditMode) {
          await fetchInvoiceData(id as string);
        }
      } catch (error) {
        console.error('Error in data initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [id, isEditMode, token]);

  // Update filtered products when products or search changes
  useEffect(() => {
    if (products.length > 0) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.sku.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [products, productSearch]);

  // Update filtered customers when customers or search changes
  useEffect(() => {
    if (customers.length > 0) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.code.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customers, customerSearch]);

  const fetchStatus = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.data && typeof res.data.data === 'object') {
        const statusData = res.data.data;
        const statusArray = Object.entries(statusData).map(([key, value]) => ({
          id: key,
          key: key,
          value: value
        }));
        setStatusOptions(statusArray);
      }
    } catch (err: any) {
      console.error('Fetch status error:', err);
    }
  };

  // Fetch invoice data for edit mode
  const fetchInvoiceData = async (invoiceId: string) => {
    try {
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing');
        return;
      }

      const response = await axios.get(`${API_URL}/invoices/${invoiceId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const invoiceData = response.data;
      
      const itemsData = invoiceData.details && Array.isArray(invoiceData.details) ? invoiceData.details : [];
      
      // ✅ Transform items with numeric price and proper calculations
      const transformedItems = itemsData.map((item: any) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || item.sale_price || 0);
        const discountValue = Number(item.discount_value || 0);
        const discountType = item.discount_type || 'Fixed';
        
        // Calculate total
        const subtotal = qty * price;
        const discountAmount = discountType === 'Percentage' 
          ? (subtotal * discountValue) / 100 
          : discountValue;
        const totalAmount = subtotal - discountAmount;

        return {
          id: item.id?.toString() || '',
          product_id: item.product_id?.toString() || '',
          product_name: item.product_name || '',
          quantity: String(qty),
          unit_id: item.unit_id?.toString() || '',
          unit_name: item.unit_name || '',
          discountType: discountType,
          discountValue: String(discountValue),
          price: price, // ✅ Store as number
          total_amount: Math.max(0, totalAmount) // ✅ Store as number
        };
      });

      const updatedRecord = {
        id: invoiceData.id?.toString() || '',
        invoice_number: invoiceData.invoice_number,
        customer_id: invoiceData.customer_id?.toString() || '',
        invoice_date: invoiceData.invoice_date.split('T')[0],
        status: invoiceData.status,
        description: invoiceData.description || '',
        items: transformedItems
      };
      
      setCurrentRecord(updatedRecord);
      setItemsList(transformedItems);
      
      const pickersArray = new Array(transformedItems.length).fill(false);
      setShowProductPickers(pickersArray);
      setShowDiscountTypePickers(pickersArray);

    } catch (error: any) {
      console.error('Error fetching invoice data:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Invoice not found');
      } else {
        Alert.alert('Error', 'Failed to load invoice data');
      }
    }
  };

  const fetchCustomers = async () => {
    try {
      if (!token) {
        console.error('Token missing for customers API');
        return;
      }

      const res = await axios.get(`${API_URL}/active/customers`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Ensure all IDs are strings
      const transformedCustomers = res.data.map((customer: Customer) => ({
        ...customer,
        id: customer.id.toString(), // Convert to string
        customer_label: `${customer.name} (${customer.code})`
      }));
      
      setCustomers(transformedCustomers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else {
        Alert.alert('Error', 'Failed to load customers');
      }
    }
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
        Alert.alert('Authentication Error', 'Please login again');
      }
    }
  };

  const fetchProducts = async () => {
    try {
      if (!token) {
        console.error('Token missing for products API');
        return;
      }

      const res = await axios.get(`${API_URL}/active/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Ensure all IDs are strings
      const transformedProducts = res.data.map((product: Product) => ({
        ...product,
        id: product.id.toString(), // Convert to string
        product_label: `${product.name} (${product.sku}) - ${settings.currency}${product.sale_price}`,
        price: product.sale_price
      }));
      
      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else {
        Alert.alert('Error', 'Failed to load products');
      }
    }
  };

  // Date handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setCurrentRecord(prev => ({ ...prev, invoice_date: formattedDate }));
      clearError('invoice_date');
    }
  };

  // Customer selection
  const handleCustomerSelect = (customerId: string) => {
    setCurrentRecord(prev => ({ ...prev, customer_id: customerId }));
    setShowCustomerPicker(false);
    setCustomerSearch('');
    clearError('customer_id');
  };

  // Status selection
  const handleStatusSelect = (statusKey: string) => {
    setCurrentRecord(prev => ({ ...prev, status: statusKey }));
    setShowStatusPicker(false);
    clearError('status');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Product selection for specific row
  const handleProductSelect = (productId: string, index: number) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      const updatedItems = [...itemsList];
      const qty = Number(updatedItems[index]?.quantity || 1);
      const price = Number(selectedProduct.sale_price || 0);
      const discountValue = Number(updatedItems[index]?.discountValue || 0);
      const discountType = updatedItems[index]?.discountType || 'Fixed';
      
      // Calculate total
      const subtotal = qty * price;
      const discountAmount = discountType === 'Percentage' 
        ? (subtotal * discountValue) / 100 
        : discountValue;
      const totalAmount = subtotal - discountAmount;
      
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: productId,
        product_name: selectedProduct.name,
        price: price, // ✅ Store as number
        unit_id: selectedProduct.unit_id,
        unit_name: selectedProduct.unit_name,
        quantity: String(qty),
        discountType: discountType,
        discountValue: String(discountValue),
        total_amount: Math.max(0, totalAmount) // ✅ Calculate and store as number
      };
      setItemsList(updatedItems);
      
      const newPickers = [...showProductPickers];
      newPickers[index] = false;
      setShowProductPickers(newPickers);
      setProductSearch('');
    }
  };

  // Get available products for selection
  const getAvailableProducts = (currentIndex: number) => {
    const currentProductId = itemsList[currentIndex]?.product_id;
    const usedProductIds = itemsList
      .filter((item, index) => index !== currentIndex && item.product_id)
      .map(item => item.product_id)
      .filter(id => id !== '' && id !== undefined && id !== null);
    
    return products.filter(product => 
      !usedProductIds.includes(product.id) || product.id === currentProductId
    );
  };

  // Add new item row
  const addItemRow = () => {
    const newItem: InvoiceItem = {
      product_id: '',
      quantity: '1',
      unit_id: '',
      unit_name: '',
      discountType: 'Percentage',
      discountValue: '0',
      price: '0',
      total_amount: '0'
    };
    setItemsList(prev => [...prev, newItem]);
    setShowProductPickers(prev => [...prev, false]);
    setShowDiscountTypePickers(prev => [...prev, false]);
  };

  // Delete item row
  const deleteItemRow = (index: number) => {
    const itemToDelete = itemsList[index];
    
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete this item permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // If the item has an ID (existing item from API), delete from server
              if (itemToDelete.id) {
                const response = await axios.delete(`${API_URL}/invoices/items/${itemToDelete.id}`, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.status === 200) {
                  // Remove from local state after successful API call
                  const updatedItems = itemsList.filter((_, i) => i !== index);
                  setItemsList(updatedItems);
                  const updatedPickers = showProductPickers.filter((_, i) => i !== index);
                  setShowProductPickers(updatedPickers);
                  const updatedDiscountPickers = showDiscountTypePickers.filter((_, i) => i !== index);
                  setShowDiscountTypePickers(updatedDiscountPickers);
                  
                  Alert.alert('Success', 'Item deleted successfully');
                }
              } else {
                const updatedItems = itemsList.filter((_, i) => i !== index);
                setItemsList(updatedItems);
                const updatedPickers = showProductPickers.filter((_, i) => i !== index);
                setShowProductPickers(updatedPickers);
                const updatedDiscountPickers = showDiscountTypePickers.filter((_, i) => i !== index);
                setShowDiscountTypePickers(updatedDiscountPickers);
              }
            } catch (error: any) {
              console.error('Error deleting item:', error);
              
              if (error.response?.status === 401) {
                Alert.alert('Authentication Error', 'Please login again');
              } else if (error.response?.status === 404) {
                Alert.alert('Error', 'Item not found');
              } else {
                Alert.alert('Error', 'Failed to delete item. Please try again.');
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const clearError = (field: string) => {
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  
  // Form submission
  const handleSubmit = async (isPost: boolean) => {
    // 🔹 If posting, confirm first
    if (isPost) {
      Alert.alert(
        "Confirm Post",
        "Are you sure you want to post this invoice return? Once posted, it cannot be edited.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Post",
            onPress: async () => {
              await handleSubmitConfirmed(true);
            },
          },
        ]
      );
      return;
    }

    // 🔹 Otherwise, run directly (for Save)
    await handleSubmitConfirmed(false);
  };
  
  const handleSubmitConfirmed = async (isPost: boolean) => {
    setIsLoading(true);
    setGlobalErrorMessage('');
    setFormErrors({});

    try {
      const formData = {
        ...currentRecord,
        total_quantity: totalQuantity.toFixed(2),
        total_price: totalPrice.toFixed(2),
        total_discount: totalDiscount.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: isPost ? 'Posted' : currentRecord.status,
        items: itemsList.map(item => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_id: item.unit_id,
          discount_type: item.discountType,
          discount_value: item.discountValue,
          price: item.price,
          total_amount: item.total_amount,
        })),
      };

      let response;
      if (isEditMode && currentRecord.id) {
        // Update existing invoice
        response = await axios.put(`${API_URL}/invoices/${currentRecord.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Create new invoice
        response = await axios.post(`${API_URL}/invoices`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Success - redirect to list
      router.push('/(drawer)/invoices/invoices/lists');
      if (!isEditMode) {
        resetForm();
      }

    } catch (error: any) {
      console.error('Error saving invoice:', error);
      
      if (error.response?.status === 422) {
        // Validation errors from backend
        const backendErrors = error.response.data.errors || {};
        setFormErrors(backendErrors);
        
        // Set global error message if available
        if (error.response.data.message) {
          setGlobalErrorMessage(error.response.data.message);
        }
        
      } else if (error.response?.status === 500) {
        // Handle stock errors and other server errors
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Server error occurred';
        setGlobalErrorMessage(errorMessage);
        
      } else {
        // Other errors (network, etc.)
        const errorMsg = error.response?.data?.message || 'Something went wrong. Please try again.';
        setGlobalErrorMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedProductName = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId.toString());
    return product ? `${product.name} (${product.sku})` : 'Select Product';
  };

  const getSelectedCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id.toString() === customerId.toString());
    return customer ? `${customer.name} (${customer.code})` : 'Select One';
  };

  const getSelectedStatusName = (statusKey: string) => {
    const status = statusOptions.find(s => s.key === statusKey);
    return status ? status.value : 'Select One';
  };

  const renderItemRow = ({ item, index }: { item: InvoiceItem; index: number }) => {
    const availableProducts = getAvailableProducts(index);
    const filteredAvailableProducts = availableProducts.filter(product => 
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
      <View style={styles.itemRow}>
        {/* Row Number */}
        <View style={[styles.cell, styles.cellNumber]}>
          <Text style={styles.rowNumberText}>{index + 1}</Text>
        </View>

        {/* Product Selection */}
        <View style={[styles.cell, styles.cellProduct]}>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors[`items[${index}].product_id`] && styles.inputError]}
            onPress={() => {
              const newPickers = new Array(itemsList.length).fill(false);
              newPickers[index] = true;
              setShowProductPickers(newPickers);
              setProductSearch('');
            }}
            disabled={isLoading}
          >
            <Text style={!item.product_id ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {getSelectedProductName(item.product_id)}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Product Selection Modal */}
          <Modal
            visible={showProductPickers[index] || false}
            transparent
            animationType="slide"
            onRequestClose={() => {
              const newPickers = [...showProductPickers];
              newPickers[index] = false;
              setShowProductPickers(newPickers);
              setProductSearch('');
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Product</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      const newPickers = [...showProductPickers];
                      newPickers[index] = false;
                      setShowProductPickers(newPickers);
                      setProductSearch('');
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products by name or SKU..."
                    placeholderTextColor="#999"
                    value={productSearch}
                    onChangeText={setProductSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {productSearch.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setProductSearch('')}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredAvailableProducts}
                  keyExtractor={(product) => product.id}
                  renderItem={({ item: product }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        item.product_id === product.id && styles.selectedModalItem
                      ]}
                      onPress={() => handleProductSelect(product.id, index)}
                    >
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productDetails}>
                          SKU: {product.sku} • Price: {settings.currency}{product.sale_price}
                        </Text>
                        <Text style={styles.productUnit}>
                          Unit: {product.unit_name}
                        </Text>
                      </View>
                      {item.product_id === product.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyModal}>
                      <Ionicons name="cube-outline" size={50} color="#ccc" />
                      <Text style={styles.emptyModalText}>
                        {productSearch ? 'No products found' : 'No products available'}
                      </Text>
                      <Text style={styles.emptyModalSubtext}>
                        {productSearch 
                          ? 'Try a different search term' 
                          : 'All products are already added or no products found'
                        }
                      </Text>
                    </View>
                  }
                  contentContainerStyle={filteredAvailableProducts.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
                />
              </View>
            </View>
          </Modal>
          
          {formErrors[`items[${index}].product_id`] && (
            <Text style={styles.errorTextSmall}>{formErrors[`items[${index}].product_id`][0]}</Text>
          )}
        </View>

        {/* Quantity */}
        <View style={[styles.cell, styles.cellQty]}>
          <TextInput
            style={[styles.inputSmall, formErrors[`items[${index}].quantity`] && styles.inputError]}
            value={item.quantity}
            onChangeText={(text) => {
              const updatedItems = [...itemsList];
              updatedItems[index].quantity = text;
              setItemsList(updatedItems);
              updateRowTotal(index);
            }}
            onBlur={() => updateRowTotal(index)}
            keyboardType="numeric"
            editable={!!item.product_id && !isLoading}
          />
        </View>

        {/* Unit */}
        <View style={[styles.cell, styles.cellUnit]}>
          <Text style={styles.unitText} numberOfLines={1}>
            {item.unit_name || '-'}
          </Text>
        </View>

        {/* Discount */}
        <View style={[styles.cell, styles.cellDiscount]}>
          <View style={styles.discountContainer}>
            {/* Custom Discount Type Picker */}
            <TouchableOpacity
              style={styles.modalTrigger}
              onPress={() => {
                const newPickers = [...showDiscountTypePickers];
                newPickers[index] = true;
                setShowDiscountTypePickers(newPickers);
              }}
              disabled={!item.product_id || isLoading}
            >
              <Text style={styles.modalTriggerText}>
                {item.discountType === 'Percentage' ? '%' : settings.currency}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TextInput
              style={[styles.inputSmall, styles.discountInput]}
              value={item.discountValue}
              onChangeText={(text) => {
                const updatedItems = [...itemsList];
                updatedItems[index].discountValue = text;
                setItemsList(updatedItems);
              }}
              onBlur={() => updateRowTotal(index)}
              keyboardType="numeric"
              editable={!!item.product_id && !isLoading}
            />

            {/* Discount Type Selection Modal */}
            <Modal
              visible={showDiscountTypePickers[index] || false}
              transparent
              animationType="slide"
              onRequestClose={() => {
                const newPickers = [...showDiscountTypePickers];
                newPickers[index] = false;
                setShowDiscountTypePickers(newPickers);
              }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Discount Type</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const newPickers = [...showDiscountTypePickers];
                        newPickers[index] = false;
                        setShowDiscountTypePickers(newPickers);
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={[
                      { id: 'Percentage', name: 'Percentage (%)' },
                      { id: 'Fixed', name: `Fixed (${settings.currency})` }
                    ]}
                    keyExtractor={(type) => type.id}
                    renderItem={({ item: type }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalItem,
                          item.discountType === type.id && styles.selectedModalItem
                        ]}
                        onPress={() => {
                          const updatedItems = [...itemsList];
                          updatedItems[index].discountType = type.id;
                          setItemsList(updatedItems);
                          const newPickers = [...showDiscountTypePickers];
                          newPickers[index] = false;
                          setShowDiscountTypePickers(newPickers);
                          updateRowTotal(index);
                        }}
                      >
                        <Text style={styles.modalItemText}>{type.name}</Text>
                        {item.discountType === type.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.modalListContent}
                  />
                </View>
              </View>
            </Modal>
          </View>
        </View>

        {/* Price */}
        <View style={[styles.cell, styles.cellPrice]}>
          <Text style={styles.priceText} numberOfLines={1}>
            {settings.currency}{item.price || '0'}
          </Text>
        </View>

        {/* Total */}
        <View style={[styles.cell, styles.cellTotal]}>
          <Text style={styles.totalText} numberOfLines={1}>
            {settings.currency}{item.total_amount || '0'}
          </Text>
        </View>

        {/* Action */}
        <View style={[styles.cell, styles.cellAction]}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (isLoading || currentRecord.status === 'Posted') && styles.deleteButtonDisabled
            ]}
            onPress={() => deleteItemRow(index)}
            disabled={isLoading || currentRecord.status === 'Posted'}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(drawer)/invoices/invoices/lists')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditMode ? 'Edit Invoice' : 'Add Invoice'}</Text>
          <View style={{ width: 24 }} /> 
        </View>

        {/* Invoice Number Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Number</Text>

          {isEditMode ? (
            // 🔹 Show when editing
            <View style={styles.modalTrigger}>
              <Text style={styles.modalTriggerText}>
                {currentRecord.invoice_number || 'N/A'}
              </Text>
            </View>
          ) : (
            // 🔹 Hide when adding (will be generated on save)
            <View style={styles.modalTrigger}>
              <Text style={styles.modalTriggerPlaceholder}>
                (Will be generated on save)
              </Text>
            </View>
          )}
        </View>

        {/* Customer Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Customer <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors.customer_id && styles.inputError]}
            onPress={() => setShowCustomerPicker(true)}
            disabled={isLoading}
          >
            <Text style={!currentRecord.customer_id ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {getSelectedCustomerName(currentRecord.customer_id)}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          {formErrors.customer_id && (
            <Text style={styles.errorText}>{formErrors.customer_id[0]}</Text>
          )}
        </View>

        {/* Invoice Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Date <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors.invoice_date && styles.inputError]}
            onPress={() => setShowDatePicker(true)}
            disabled={isLoading}
          >
            <Text style={styles.modalTriggerText}>{currentRecord.invoice_date}</Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          {formErrors.invoice_date && (
            <Text style={styles.errorText}>{formErrors.invoice_date[0]}</Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Status <Text style={styles.errorText}>*</Text></Text>
          {currentRecord.status === 'Posted' ? (
            <View
              style={[
                styles.modalTrigger,
                { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
              ]}
            >
              <Text style={[styles.modalTriggerText, { color: '#6b7280' }]}>
                Posted
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.modalTrigger, formErrors.status && styles.inputError]}
              onPress={() => setShowStatusPicker(true)}
              disabled={isLoading}
            >
              <Text
                style={
                  !currentRecord.status
                    ? styles.modalTriggerPlaceholder
                    : styles.modalTriggerText
                }
              >
                {getSelectedStatusName(currentRecord.status)}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}

          {formErrors.status && (
            <Text style={styles.errorText}>{formErrors.status[0]}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textArea, formErrors.description && styles.inputError]}
            value={currentRecord.description}
            onChangeText={(text) => {
              setCurrentRecord(prev => ({ ...prev, description: text }));
              clearError('description');
            }}
            multiline
            numberOfLines={3}
            editable={!isLoading}
            placeholderTextColor="#999"
          />
          {formErrors.description && (
            <Text style={styles.errorText}>{formErrors.description[0]}</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          
          {formErrors.items && (
            <Text style={styles.errorText}>{formErrors.items[0]}</Text>
          )}
          
          {/* Horizontal Scroll Container */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            style={styles.tableScrollContainer}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.headerCell, styles.headerCellNumber]}><Text style={styles.headerText}>#</Text></View>
                <View style={[styles.headerCell, styles.headerCellProduct]}><Text style={styles.headerText}>Product</Text></View>
                <View style={[styles.headerCell, styles.headerCellQty]}><Text style={styles.headerText}>Qty</Text></View>
                <View style={[styles.headerCell, styles.headerCellUnit]}><Text style={styles.headerText}>Unit</Text></View>
                <View style={[styles.headerCell, styles.headerCellDiscount]}><Text style={styles.headerText}>Discount</Text></View>
                <View style={[styles.headerCell, styles.headerCellPrice]}><Text style={styles.headerText}>Price</Text></View>
                <View style={[styles.headerCell, styles.headerCellTotal]}><Text style={styles.headerText}>Total</Text></View>
                <View style={[styles.headerCell, styles.headerCellAction]}><Text style={styles.headerText}>Action</Text></View>
              </View>

              {/* Items List */}
              {itemsList.length > 0 ? (
                <FlatList
                  data={itemsList}
                  renderItem={renderItemRow}
                  keyExtractor={(item, index) => `item-${index}-${item.product_id}`}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyItems}>
                  <Ionicons name="document-text-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyItemsText}>No items added</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Add Item Button */}
          <TouchableOpacity 
            style={styles.addItemButton} 
            onPress={addItemRow}
            disabled={isLoading}
          >
            <Ionicons name="add-circle-outline" size={20} color="#34C759" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Totals Section */}
        {itemsList.length > 0 && (
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Quantity</Text>
              <Text style={styles.totalValue}>{totalQuantity.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalValue}>{settings.currency}{formatCurrency(totalPrice)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Discount</Text>
              <Text style={styles.totalValue}>{settings.currency}{formatCurrency(totalDiscount)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{settings.currency}{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (isLoading || currentRecord.status === 'Posted') && styles.buttonDisabled
            ]}
            onPress={() => handleSubmit(false)}
            disabled={isLoading || currentRecord.status === 'Posted'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              (isLoading || currentRecord.status === 'Posted') && styles.buttonDisabled
            ]}
            onPress={() => handleSubmit(true)}
            disabled={isLoading || currentRecord.status === 'Posted'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Invoice Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {globalErrorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.globalError}>{globalErrorMessage}</Text>
          </View>
        ) : null}
        
        {/* Status Message */}
        {currentRecord.status === 'Posted' && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusMessageText}>
              Invoice has been posted and cannot be changed.
            </Text>
          </View>
        )}

        {/* Modals */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(currentRecord.invoice_date)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <Modal
          visible={showCustomerPicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowCustomerPicker(false);
            setCustomerSearch('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Customer</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCustomerPicker(false);
                    setCustomerSearch('');
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customers by name or code..."
                  placeholderTextColor="#999"
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {customerSearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setCustomerSearch('')}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredCustomers}
                keyExtractor={(customer) => customer.id}
                renderItem={({ item: customer }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      currentRecord.customer_id === customer.id && styles.selectedModalItem
                    ]}
                    onPress={() => handleCustomerSelect(customer.id)}
                  >
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {customer.name}
                      </Text>
                      <Text style={styles.customerCode}>
                        Code: {customer.code}
                      </Text>
                    </View>
                    {currentRecord.customer_id === customer.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModal}>
                    <Ionicons name="people-outline" size={50} color="#ccc" />
                    <Text style={styles.emptyModalText}>
                      {customerSearch ? 'No customers found' : 'No customers available'}
                    </Text>
                    <Text style={styles.emptyModalSubtext}>
                      {customerSearch 
                        ? 'Try a different search term' 
                        : 'No customers found in the system'
                      }
                    </Text>
                  </View>
                }
                contentContainerStyle={filteredCustomers.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showStatusPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatusPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Status</Text>
                <TouchableOpacity 
                  onPress={() => setShowStatusPicker(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={statusOptions}
                keyExtractor={(status) => status.id}
                renderItem={({ item: status }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      currentRecord.status === status.key && styles.selectedModalItem
                    ]}
                    onPress={() => handleStatusSelect(status.key)}
                  >
                    <Text style={styles.modalItemText}>{status.value}</Text>
                    {currentRecord.status === status.key && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalListContent}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ===== MAIN CONTAINER & LAYOUT =====
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },

  // ===== HEADER SECTION =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },

  // ===== FORM FIELD GROUPS =====
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },

  // ===== MODAL TRIGGER STYLES (Dropdowns) =====
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  modalTriggerText: {
    color: '#1C1C1E',
    fontSize: 16,
  },
  modalTriggerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },

  // ===== TEXT INPUT STYLES =====
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    minHeight: 80,
    fontSize: 16,
  },
  inputSmall: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    minHeight: 32,
    textAlign: 'center',
  },

  // ===== ITEMS TABLE SECTION =====
  itemsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tableScrollContainer: {
    maxHeight: 400,
  },
  tableContainer: {
    minWidth: 800, // Fixed width for horizontal scrolling
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },

  // ===== TABLE HEADER STYLES =====
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // ===== TABLE COLUMN WIDTHS =====
  headerCellNumber: { width: 40 },
  headerCellProduct: { width: 200 },
  headerCellQty: { width: 80 },
  headerCellUnit: { width: 80 },
  headerCellDiscount: { width: 120 },
  headerCellPrice: { width: 150 },
  headerCellTotal: { width: 150 },
  headerCellAction: { width: 80 },

  // ===== TABLE ROW STYLES =====
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  cell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  
  // ===== CELL WIDTHS (Match header widths) =====
  cellNumber: { width: 40 },
  cellProduct: { width: 200 },
  cellQty: { width: 80 },
  cellUnit: { width: 80 },
  cellDiscount: { width: 120 },
  cellPrice: { width: 150 },
  cellTotal: { width: 150 },
  cellAction: { width: 80 },

  // ===== CELL CONTENT STYLES =====
  rowNumberText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  unitText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  priceText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  totalText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
  },

  // ===== DISCOUNT CONTAINER =====
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    marginLeft: 4,
  },

  // ===== ACTION BUTTONS =====
  deleteButton: {
    padding: 6,
    alignSelf: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addItemText: {
    marginLeft: 8,
    color: '#34C759',
    fontWeight: '600',
  },

  // ===== EMPTY STATES =====
  emptyItems: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  emptyItemsText: {
    color: '#666',
    fontSize: 14,
  },

  // ===== TOTALS SECTION =====
  totalsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    marginTop: 4,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },

  // ===== SUBMIT BUTTON =====
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },

  // ===== ERROR STATES =====
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusMessage: {
    backgroundColor: '#ffecb3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusMessageText: {
    color: '#333',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },

  globalError: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  errorTextSmall: {
    color: '#d32f2f',
    fontSize: 10,
    marginTop: 2,
  },
  inputError: {
    borderColor: '#d32f2f',
  },

  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },

  // ===== MODAL SEARCH =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },

  // ===== MODAL LIST STYLES =====
  modalListContent: {
    paddingBottom: 16,
  },
  modalListContentEmpty: {
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedModalItem: {
    backgroundColor: '#F0F8FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },

  // ===== PRODUCT INFO IN MODAL =====
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 12,
    color: '#999',
  },

  // ===== CUSTOMER INFO IN MODAL =====
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  customerCode: {
    fontSize: 12,
    color: '#666',
  },

  // ===== EMPTY MODAL STATES =====
  emptyModal: {
    alignItems: 'center',
    padding: 40,
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyModalSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});