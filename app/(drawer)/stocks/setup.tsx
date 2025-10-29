// app/(tabs)/stocks/setup.tsx
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
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: string;
  unit_id: string;
  unit_name: string;
  product_label?: string;
  current_stock?: string;
}

interface Stock {
  id?: string;
  stock_number: string;
  stock_date: string;
  status: string;
  total_stock?: string;
  total_price?: string;
  items: StockItem[];
}

interface StockItem {
  id?: string;
  product_id: string;
  product_name?: string;
  stock: string;
  unit_id: string;
  unit_name: string;
  price: string;
  total_amount: string;
}

export default function StocksSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Stock>({
    stock_number: '',
    stock_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    total_stock: '0',
    total_price: '0',
    items: []
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [itemsList, setItemsList] = useState<StockItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showProductPickers, setShowProductPickers] = useState<boolean[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [statusOptions, setStatusOptions] = useState<any[]>([]);

  // Calculate totals
  const [totalStock, setTotalStock] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isAmountValid, setIsAmountValid] = useState(false);

  const resetForm = () => {
    setCurrentRecord({
      stock_number: '',
      stock_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      total_stock: '0',
      total_price: '0',
      items: []
    });
    setItemsList([]); // ⬅️ make it empty
    setShowProductPickers([]);
    setFormErrors({});
    setGlobalErrorMessage('');
    setIsEditMode(false);
  };

  // Update all totals
  const updateTotals = () => {
    let stockTotal = 0;
    let priceTotal = 0;
    let validAmount = true;

    itemsList.forEach(item => {
      if (item.product_id) {
        const stock = parseFloat(item.stock) || 0;
        const price = parseFloat(item.price) || 0;
        const total = parseFloat(item.total_amount) || 0;
        
        stockTotal += stock;
        priceTotal += total;

        if (stock <= 0 || price <= 0 || total <= 0) {
          validAmount = false;
        }
      } else {
        validAmount = false;
      }
    });

    setTotalStock(stockTotal);
    setTotalPrice(priceTotal);
    setIsAmountValid(validAmount && itemsList.length > 0);

    // Update current record totals
    setCurrentRecord(prev => ({
      ...prev,
      total_stock: stockTotal.toFixed(2),
      total_price: priceTotal.toFixed(2)
    }));
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchSettings()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Check if we're in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      fetchStockData(id as string);
    } else {
      resetForm();
      fetchInitialData();
    }
  }, [id]);

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

  // Update totals when itemsList changes
  useEffect(() => {
    updateTotals();
    fetchStatus();
  }, [itemsList]);

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
  
  // Fetch stock data for edit mode
  const fetchStockData = async (stockId: string) => {
    try {
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing');
        return;
      }

      const response = await axios.get(`${API_URL}/stocks/${stockId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const stockData = response.data.data || response.data;
      
      // Transform items data
      const itemsData = stockData.items || stockData.details || [];
      const transformedItems = itemsData.map((item: any) => ({
        id: item.id?.toString() || '',
        product_id: item.product_id?.toString() || '',
        product_name: item.product?.name || '',
        stock: item.stock ? item.stock.toString() : '0',
        unit_id: item.unit_id?.toString() || '',
        unit_name: item.unit?.name || item.unit_name || '',
        price: item.price ? item.price.toString() : '0',
        total_amount: item.total_amount ? item.total_amount.toString() : '0'
      }));

      // Set the current record with fetched data
      const updatedRecord = {
        id: stockData.id?.toString() || '',
        stock_number: stockData.stock_number || '',
        stock_date: stockData.stock_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: stockData.status || 'Active',
        total_stock: stockData.total_stock || '0',
        total_price: stockData.total_price || '0',
        items: transformedItems
      };
      
      setCurrentRecord(updatedRecord);
      setItemsList(transformedItems.length > 0 ? transformedItems : [{
        product_id: '',
        stock: '',
        unit_id: '',
        unit_name: '',
        price: '',
        total_amount: ''
      }]);
      
      // Initialize product pickers array
      const pickersArray = new Array(transformedItems.length || 1).fill(false);
      setShowProductPickers(pickersArray);

      // Fetch products data
      await fetchInitialData();

    } catch (error: any) {
      console.error('Error fetching stock data:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Stock not found');
      } else {
        Alert.alert('Error', 'Failed to load stock data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings from API
  const fetchSettings = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/settings`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const settingsData = response.data.data || response.data;
      const settingsObj: Record<string, string> = {};

      if (Array.isArray(settingsData)) {
        settingsData.forEach((setting: any) => {
          if (setting.data_name && setting.data_value !== undefined) {
            settingsObj[setting.data_name] = setting.data_value;
          }
        });
      }

      setSettings(settingsObj);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      if (!token) return;

      const res = await axios.get(`${API_URL}/active/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const productsData = res.data.data || res.data;
      
      // Transform products data
      const transformedProducts = productsData.map((product: Product) => ({
        ...product,
        id: product.id.toString(),
        product_label: `${product.name} (${product.sku})`,
        price: product.sale_price
      }));
      
      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  // ✅ Show global loader until data fetched
  if (loading) return <LoadingScreen />;

  // Date handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setCurrentRecord(prev => ({ ...prev, stock_date: formattedDate }));
      clearError('stock_date');
    }
  };

  // Status selection
  const handleStatusSelect = (statusKey: string) => {
    setCurrentRecord(prev => ({ ...prev, status: statusKey }));
    setShowStatusPicker(false);
    clearError('status');
  };

  // Product selection for specific row
  const handleProductSelect = (productId: string, index: number) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      const updatedItems = [...itemsList];
      
      // Update the item with new product details
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: productId,
        product_name: selectedProduct.name,
        price: selectedProduct.sale_price,
        unit_id: selectedProduct.unit_id,
        unit_name: selectedProduct.unit_name,
        stock: '1',
        total_amount: selectedProduct.sale_price
      };
      
      setItemsList(updatedItems);
      
      // Close the product picker
      const newPickers = [...showProductPickers];
      newPickers[index] = false;
      setShowProductPickers(newPickers);
      setProductSearch('');
      
      // Update the row total
      updateRowTotal(index);
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

  // Check if product is available
  const isProductAvailable = (productId: string, currentIndex: number) => {
    const selectedInOtherRows = itemsList
      .filter((_, index) => index !== currentIndex)
      .some(item => item.product_id === productId);
    
    return !selectedInOtherRows;
  };

  // Add new item row
  const addItemRow = () => {
    const newItem: StockItem = {
      product_id: '',
      stock: '',
      unit_id: '',
      unit_name: '',
      price: '',
      total_amount: ''
    };
    setItemsList(prev => [...prev, newItem]);
    setShowProductPickers(prev => [...prev, false]);
  };

  // Delete item row
  const deleteItemRow = (index: number) => {
    const updatedItems = itemsList.filter((_, i) => i !== index);
    setItemsList(updatedItems);
    setShowProductPickers((prev) => prev.filter((_, i) => i !== index));
  };

  // Update row total when stock changes
  const updateRowTotal = (index: number) => {
    const updatedItems = [...itemsList];
    const item = updatedItems[index];
    
    if (item.product_id && item.stock && item.price) {
      const stock = parseFloat(item.stock) || 0;
      const price = parseFloat(item.price) || 0;
      item.total_amount = (stock * price).toFixed(2);
      setItemsList(updatedItems);
    }
  };

  const clearError = (field: string) => {
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: any = {};

    if (!currentRecord.stock_number) {
      errors.stock_number = ['Stock number is required'];
    }

    if (!currentRecord.stock_date) {
      errors.stock_date = ['Stock date is required'];
    }

    if (!currentRecord.status) {
      errors.status = ['Status is required'];
    }

    // Validate items
    let hasItemErrors = false;
    itemsList.forEach((item, index) => {
      if (!item.product_id) {
        errors[`product_${index}`] = ['Product is required'];
        hasItemErrors = true;
      }
      if (!item.stock || parseFloat(item.stock) <= 0) {
        errors[`stock_${index}`] = ['Valid stock quantity is required'];
        hasItemErrors = true;
      }
    });

    if (hasItemErrors) {
      errors.items = ['Please check all item fields'];
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (isPost: boolean = false) => {
    // 🔹 If posting, confirm first
    if (isPost) {
      Alert.alert(
        "Confirm Post",
        "Are you sure you want to post this stock? Once posted, it cannot be edited.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Post", onPress: () => handleSubmitConfirmed(true) },
        ]
      );
      return; // stop here until confirmation
    }

    // Otherwise, run normally (for Save)
    await handleSubmitConfirmed(false);
  };

  const handleSubmitConfirmed = async (isPost: boolean) => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check all required fields');
      return;
    }

    setIsLoading(true);
    setGlobalErrorMessage('');
    setFormErrors({});

    try {
      const formData = {
        ...currentRecord,
        total_stock: totalStock.toFixed(2),
        total_price: totalPrice.toFixed(2),
        items: itemsList.map(item => ({
          id: item.id,
          product_id: item.product_id,
          stock: item.stock,
          unit_id: item.unit_id,
          price: item.price,
          total_amount: item.total_amount,
        })),
        is_post: isPost,
        status: isPost ? 'Posted' : currentRecord.status || 'Active',
      };

      let response;
      if (isEditMode && currentRecord.id) {
        response = await axios.put(`${API_URL}/stocks/${currentRecord.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        response = await axios.post(`${API_URL}/stocks`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

    } catch (error: any) {
      console.error('Error saving stock:', error);

      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
        setGlobalErrorMessage(error.response.data.message || 'Validation failed');
      } else {
        setGlobalErrorMessage(error.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedProductName = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId.toString());
    return product ? `${product.name} (${product.sku})` : 'Select Product';
  };

  const getSelectedStatusName = (statusId: string) => {
    const status = statusOptions.find(s => s.id === statusId);
    return status ? status.value : 'Select One';
  };

  const renderItemRow = ({ item, index }: { item: StockItem; index: number }) => {
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
          <View style={{ width: '100%' }}>
            <TouchableOpacity
              style={[
                styles.modalTrigger,
                (formErrors[`product_${index}`] || 
                 (item.product_id && !isProductAvailable(item.product_id, index))) && 
                styles.inputError
              ]}
              onPress={() => {
                const newPickers = new Array(itemsList.length).fill(false);
                newPickers[index] = true;
                setShowProductPickers(newPickers);
                setProductSearch('');
              }}
              disabled={isLoading}
            >
              <Text 
                style={[
                  !item.product_id ? styles.modalTriggerPlaceholder : styles.modalTriggerText,
                  { flex: 1, marginRight: 8 }
                ]} 
                numberOfLines={1}
              >
                {getSelectedProductName(item.product_id)}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {formErrors[`product_${index}`] && (
            <Text style={styles.errorTextSmall}>{formErrors[`product_${index}`][0]}</Text>
          )}
        </View>

        {/* Stock Quantity */}
        <View style={[styles.cell, styles.cellStock]}>
          <TextInput
            style={[styles.inputSmall, formErrors[`stock_${index}`] && styles.inputError]}
            value={item.stock}
            onChangeText={(text) => {
              const updatedItems = [...itemsList];
              updatedItems[index].stock = text;
              setItemsList(updatedItems);
            }}
            onBlur={() => updateRowTotal(index)}
            keyboardType="numeric"
            placeholder="0"
            editable={!!item.product_id && !isLoading}
          />
          {formErrors[`stock_${index}`] && (
            <Text style={styles.errorTextSmall}>{formErrors[`stock_${index}`][0]}</Text>
          )}
        </View>

        {/* Unit */}
        <View style={[styles.cell, styles.cellUnit]}>
          <TextInput
            style={[styles.inputSmall, styles.readOnlyInput]}
            value={item.unit_name}
            editable={false}
            placeholder="-"
          />
        </View>

        {/* Price */}
        <View style={[styles.cell, styles.cellPrice]}>
          <TextInput
            style={[styles.inputSmall, styles.readOnlyInput]}
            value={item.price}
            editable={false}
            placeholder="0.00"
          />
        </View>

        {/* Total */}
        <View style={[styles.cell, styles.cellTotal]}>
          <TextInput
            style={[styles.inputSmall, styles.readOnlyInput]}
            value={item.total_amount}
            editable={false}
            placeholder="0.00"
          />
        </View>

        {/* Action */}
        <View style={[styles.cell, styles.cellAction]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItemRow(index)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(drawer)/stocks/lists')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditMode ? 'Edit Stock' : 'Add Stock'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stock Number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Stock Number <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={[styles.input, formErrors.stock_number && styles.inputError]}
            value={currentRecord.stock_number}
            onChangeText={(text) =>
              setCurrentRecord((prev) => ({ ...prev, stock_number: text }))
            }
            editable={!isLoading && currentRecord.status !== 'Posted'}
          />

          {formErrors.stock_number && (
            <Text style={styles.errorText}>{formErrors.stock_number[0]}</Text>
          )}
        </View>

        {/* Stock Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Stock Date <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors.stock_date && styles.inputError]}
            onPress={() => setShowDatePicker(true)}
            disabled={isLoading}
          >
            <Text style={styles.modalTriggerText}>{currentRecord.stock_date}</Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          {formErrors.stock_date && (
            <Text style={styles.errorText}>{formErrors.stock_date[0]}</Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Status <Text style={styles.required}>*</Text>
          </Text>

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

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Stock Items</Text>
          
          {formErrors.items && (
            <Text style={styles.errorText}>{formErrors.items[0]}</Text>
          )}
          
          {/* Horizontal Scroll Container */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.headerCell, styles.headerCellNumber]}><Text style={styles.headerText}>#</Text></View>
                <View style={[styles.headerCell, styles.headerCellProduct]}><Text style={styles.headerText}>Products</Text></View>
                <View style={[styles.headerCell, styles.headerCellStock]}><Text style={styles.headerText}>Stocks</Text></View>
                <View style={[styles.headerCell, styles.headerCellUnit]}><Text style={styles.headerText}>Unit</Text></View>
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
                  <Ionicons name="cube-outline" size={40} color="#ccc" />
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
            <View style={styles.totalsTable}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Stock</Text>
                <Text style={styles.totalValue}>{totalStock.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Price</Text>
                <Text style={styles.totalValue}>{settings.currency || '$'}{totalPrice.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (isLoading || (!isAmountValid && itemsList.length > 0) || currentRecord.status === 'Posted') && 
              styles.buttonDisabled
            ]}
            onPress={() => handleSubmit(false)}
            disabled={isLoading || (!isAmountValid && itemsList.length > 0) || currentRecord.status === 'Posted'}
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
              (isLoading || currentRecord.status !== 'Active') && styles.buttonDisabled
            ]}
            onPress={() => handleSubmit(true)}
            disabled={isLoading || currentRecord.status !== 'Active'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Stock Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Global Error */}
        {globalErrorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.globalError}>{globalErrorMessage}</Text>
          </View>
        ) : null}

        {/* Status Message */}
        {currentRecord.status === 'Posted' && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusMessageText}>
              Stock has been posted and cannot be changed.
            </Text>
          </View>
        )}

        {/* Modals */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(currentRecord.stock_date)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

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
                      currentRecord.status === status.id && styles.selectedModalItem
                    ]}
                    onPress={() => handleStatusSelect(status.id)}
                  >
                    <Text style={styles.modalItemText}>{status.value}</Text>
                    {currentRecord.status === status.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalListContent}
              />
            </View>
          </View>
        </Modal>

        {/* Product Selection Modal */}
        {itemsList.map((item, index) => (
          <Modal
            key={`product-modal-${index}`}
            visible={showProductPickers[index]}
            transparent
            animationType="slide"
            onRequestClose={() => {
              const newPickers = [...showProductPickers];
              newPickers[index] = false;
              setShowProductPickers(newPickers);
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
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                  {productSearch ? (
                    <TouchableOpacity
                      onPress={() => setProductSearch('')}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={getAvailableProducts(index).filter(product =>
                    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    product.sku.toLowerCase().includes(productSearch.toLowerCase())
                  )}
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
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.customerCode}>SKU: {product.sku}</Text>
                      </View>
                      {item.product_id === product.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={
                    getAvailableProducts(index).length === 0 
                      ? styles.modalListContentEmpty 
                      : styles.modalListContent
                  }
                  ListEmptyComponent={() => (
                    <View style={styles.emptyModal}>
                      <Ionicons name="search" size={40} color="#ccc" />
                      <Text style={styles.emptyModalText}>No products found</Text>
                      <Text style={styles.emptyModalSubtext}>Try adjusting your search</Text>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: 'red',
  },
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
    width: '100%', // Make trigger full width
  },
  modalTriggerText: {
    color: '#1C1C1E',
    fontSize: 16,
  },
  modalTriggerPlaceholder: {
    color: '#8E8E93',
    fontSize: 16,
  },
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
  // FIXED: Proper table container width
  tableContainer: {
    width: 700,
  },
  // FIXED: Header row with consistent styling
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 44, // Fixed height for consistency
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerCellNumber: {
    width: 40,
  },
  headerCellProduct: {
    width: 200,
  },
  headerCellStock: {
    width: 80,
  },
  headerCellUnit: {
    width: 80,
  },
  headerCellPrice: {
    width: 100,
  },
  headerCellTotal: {
    width: 120,
  },
  headerCellAction: {
    width: 80,
    borderRightWidth: 0,
  },
  // FIXED: Item rows with consistent styling
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    minHeight: 44, // Match header height
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    padding: 8,
  },
  cellNumber: {
    width: 40,
  },
  cellProduct: {
    width: 200,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  cellStock: {
    width: 80,
  },
  cellUnit: {
    width: 80,
  },
  cellPrice: {
    width: 100,
  },
  cellTotal: {
    width: 120,
  },
  cellAction: {
    width: 80,
    borderRightWidth: 0,
  },
  rowNumberText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  inputSmall: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    minHeight: 32,
    textAlign: 'center',
    width: '100%',
  },
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    color: '#666',
    width: '100%',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  priceText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  totalText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  emptyItems: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  emptyItemsText: {
    color: '#666',
    fontSize: 14,
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
    marginTop: 16,
  },
  addItemText: {
    marginLeft: 8,
    color: '#34C759',
    fontWeight: '600',
    fontSize: 16,
  },
  totalsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  totalsTable: {
    minWidth: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
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
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  globalError: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
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
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  errorTextSmall: {
    color: '#d32f2f',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
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
  productInfo: {
    flex: 1,
    width: '100%', // Add full width
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
    width: '100%'
  },
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