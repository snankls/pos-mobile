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
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: string;
  unit_id: string;
  unit_name: string;
  price?: string;
  quantity?: string;
  original_quantity?: string;
  returned_quantity?: string;
  product_label?: string;
}

interface Invoice {
  id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  return_date: string;
  status: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: string;
  unit_id: string;
  unit_name: string;
  discountType: string;
  discountValue: string;
  price: number;
  total_amount: number;
  max_return_quantity?: string;
  available_quantity?: string;
  original_quantity?: string;
  returned_quantity?: string;
}

interface InvoiceNumber {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
}

interface ReturnData {
  id?: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  return_date?: string;
  status?: string;
  details?: ReturnDetail[];
}

interface ReturnDetail {
  id?: string;
  product_id?: string;
  product_name?: string;
  quantity?: string | number;
  unit_id?: string;
  unit_name?: string;
  discount_type?: string;
  discount_value?: string | number;
  price?: string | number;
  total_amount?: string | number;
}

export default function ReturnsSetupScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Invoice>({
    invoice_number: '',
    customer_id: '',
    customer_name: '',
    return_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    items: []
  });

  const [invoiceNumbers, setInvoiceNumbers] = useState<InvoiceNumber[]>([]);
  // const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalInvoiceItems, setOriginalInvoiceItems] = useState<InvoiceItem[]>([]);
  const [itemsList, setItemsList] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<any>({});
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);
  const [showProductPickers, setShowProductPickers] = useState<boolean[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceNumber[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isAmountValid, setIsAmountValid] = useState(false);

  // Status options from API
  const [statusOptions, setStatusOptions] = useState<any[]>([]);

  // Calculate totals
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const resetForm = () => {
    setCurrentRecord({
      invoice_number: '',
      customer_id: '',
      customer_name: '',
      return_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      items: []
    });
    setItemsList([]);
    setOriginalInvoiceItems([]);
    setShowProductPickers([]);
    setFormErrors({});
    setGlobalErrorMessage('');
    setIsEditMode(false);
  };

  // Update all totals
  const updateTotals = () => {
    let quantityTotal = 0;
    let priceTotal = 0;
    let discountTotal = 0;
    let grandTotalCalc = 0;

    itemsList.forEach((item, index) => {
      if (item.product_id && item.quantity) {
        const quantity = parseFloat(item.quantity) || 0;
        const price = Number(item.price) || 0;
        
        quantityTotal += quantity;
        
        // Calculate item subtotal (price * quantity)
        const itemSubtotal = price * quantity;
        priceTotal += itemSubtotal;
        
        // Calculate discount for this item
        let itemDiscount = 0;
        if (item.discountType === 'Percentage') {
          itemDiscount = (itemSubtotal * parseFloat(item.discountValue || '0')) / 100;
        } else {
          itemDiscount = parseFloat(item.discountValue || '0');
        }
        
        discountTotal += itemDiscount;
        
        // Calculate item total after discount
        const itemTotal = itemSubtotal - itemDiscount;
        grandTotalCalc += itemTotal;
      }
    });

    setTotalQuantity(quantityTotal);
    setTotalPrice(priceTotal);
    setTotalDiscount(discountTotal);
    setGrandTotal(grandTotalCalc);
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
    }
  };

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

  // Fetch invoice numbers for dropdown
  const fetchInvoiceNumbers = async () => {
    try {
      if (!token) {
        console.error('Token missing for invoices API');
        return;
      }

      const res = await axios.get(`${API_URL}/invoices`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const transformedInvoices = res.data.map((invoice: InvoiceNumber) => ({
        ...invoice,
        id: invoice.id.toString(),
      }));
      
      setInvoiceNumbers(transformedInvoices);
      setFilteredInvoices(transformedInvoices);
    } catch (error: any) {
      console.error('Error fetching invoice numbers:', error);
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else {
        Alert.alert('Error', 'Failed to load invoice numbers');
      }
    }
  };

  // Fetch invoice details when an invoice is selected
  const fetchInvoiceDetails = async (invoiceId: string) => {
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
      
      // Set customer information
      setCurrentRecord(prev => ({
        ...prev,
        customer_id: invoiceData.customer_id?.toString() || '',
        customer_name: invoiceData.customer_name || '',
      }));

      // Use details array to get original items
      const itemsData = invoiceData.details && Array.isArray(invoiceData.details) ? invoiceData.details : [];
      
      // Transform items data to match our interface - USE THE NEW AVAILABLE QUANTITY
      const transformedItems = itemsData.map((item: any) => ({
        id: item.id?.toString() || '',
        product_id: item.product_id?.toString() || '',
        product_name: item.product_name || '',
        product_sku: item.product_sku || '',
        quantity: '0', // Start with 0 for return quantity
        unit_id: item.unit_id?.toString() || '',
        unit_name: item.unit_name || '',
        discountType: item.discount_type || 'Percentage',
        discountValue: item.discount_value ? item.discount_value.toString() : '0',
        price: item.sale_price ? item.sale_price.toString() : '0',
        total_amount: '0', // Start with 0
        max_return_quantity: item.available_quantity ? item.available_quantity.toString() : '0', // Use available_quantity instead of quantity
        available_quantity: item.available_quantity ? item.available_quantity.toString() : '0',
        original_quantity: item.original_quantity ? item.original_quantity.toString() : '0',
        returned_quantity: item.returned_quantity ? item.returned_quantity.toString() : '0'
      }));

      setOriginalInvoiceItems(transformedItems);
      
      // Automatically add all products to itemsList for return
      setItemsList(transformedItems);
      
      // Initialize pickers arrays
      const pickersArray = new Array(transformedItems.length).fill(false);
      setShowProductPickers(pickersArray);
      
      // Fetch available products for this invoice
      await fetchAvailableProducts(invoiceId);

    } catch (error: any) {
      console.error('Error fetching invoice details:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Invoice not found');
      } else {
        Alert.alert('Error', 'Failed to load invoice details');
      }
    }
  };
  
  // Fetch available products for returns
  const fetchAvailableProducts = async (invoiceId: string) => {
    try {
      if (!token) return;

      const response = await axios.get(`${API_URL}/invoices/${invoiceId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const invoiceData = response.data;
      
      // Extract products from the details array
      const itemsData = invoiceData.details && Array.isArray(invoiceData.details) ? invoiceData.details : [];
      
      const transformedProducts = itemsData.map((item: any) => ({
        id: item.product_id?.toString() || '',
        name: item.product_name || 'Unknown Product',
        sku: item.product_sku || 'N/A',
        sale_price: item.sale_price || '0',
        unit_id: item.unit_id?.toString() || '',
        unit_name: item.unit_name || '',
        quantity: item.available_quantity !== undefined ? item.available_quantity.toString() : '0',
        original_quantity: item.original_quantity ? item.original_quantity.toString() : '0',
        returned_quantity: item.returned_quantity ? item.returned_quantity.toString() : '0',
        price: item.sale_price || '0',
        product_label: `${item.product_name || 'Unknown Product'} (${item.product_sku || 'N/A'}) - ${settings.currency} ${item.sale_price || '0'} - Available: ${item.available_quantity !== undefined ? item.available_quantity.toString() : '0'}`
      }));
      
      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);

    } catch (error: any) {
      console.error('Error fetching available products:', error);
      // Fallback logic...
    }
  };
  
  // Fetch return data for edit mode - Fixed transformation
  const fetchReturnData = async (returnId: string) => {
    try {
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing');
        return;
      }

      // 1. Fetch the return data (this works fine)
      const returnResponse = await axios.get(`${API_URL}/invoice/returns/${returnId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const returnData = returnResponse.data;

      // Set basic return data
      const updatedRecord = {
        id: returnData.id?.toString() || '',
        invoice_number: returnData.invoice_number || '',
        customer_id: returnData.customer_id?.toString() || '',
        customer_name: returnData.customer_name || '',
        return_date: returnData.return_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: returnData.status || 'Active',
        items: []
      };
      
      setCurrentRecord(updatedRecord);
      
      const invoiceDetailsResponse = await axios.get(
        `${API_URL}/invoices/for-return/${returnData.invoice_number}?current_return_id=${returnId}`, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (invoiceDetailsResponse.data.error) {
        console.error('Invoice API Error:', invoiceDetailsResponse.data.error);
        Alert.alert('Error', invoiceDetailsResponse.data.error);
        return;
      }

      const invoiceData = invoiceDetailsResponse.data;

      // Transform items with proper max quantity calculation for edit mode
      const itemsData = invoiceData.details && Array.isArray(invoiceData.details) ? invoiceData.details : [];
      
      const transformedItems = itemsData.map((item: any) => {
        const originalAvailableQty = item.original_quantity ? parseInt(item.original_quantity) : 0;
        const returnedQty = item.returned_quantity ? parseInt(item.returned_quantity) : 0;
        
        const currentReturnItem = returnData.details?.find((ri: any) => 
          ri.product_id?.toString() === item.product_id?.toString()
        );
        const currentReturnQty = currentReturnItem?.quantity ? parseInt(currentReturnItem.quantity) : 0;
        
        // For edit mode: max = original available + current return quantity
        const maxReturnQuantity = originalAvailableQty + currentReturnQty;
        
        return {
          id: item.id?.toString() || '',
          product_id: item.product_id ? item.product_id.toString() : '',
          product_name: item.product_name || '',
          product_sku: item.product_sku || '',
          quantity: '0',
          unit_id: item.unit_id?.toString() || '',
          unit_name: item.unit_name || '',
          discountType: item.discount_type || 'Percentage',
          discountValue: item.discount_value ? item.discount_value.toString() : '0',
          price: item.sale_price ? Number(item.sale_price) : 0,
          total_amount: 0,
          available_quantity: item.available_quantity?.toString() || '0',
          original_quantity: item.original_quantity?.toString() || '0',
          returned_quantity: item.returned_quantity?.toString() || '0',
          max_return_quantity: maxReturnQuantity.toString()
        };
      });

      setOriginalInvoiceItems(transformedItems);
      
      // Merge with return quantities
      const returnItems = returnData.details || [];
      const mergedItems = transformedItems.map((invoiceItem: any) => {
        const returnItem = returnItems.find((ri: any) => 
          ri.product_id?.toString() === invoiceItem.product_id
        );
        
        if (returnItem) {
          return {
            ...invoiceItem,
            id: returnItem.id?.toString() || '',
            quantity: returnItem.quantity?.toString() || '0',
            discountType: returnItem.discount_type || invoiceItem.discountType,
            discountValue: returnItem.discount_value?.toString() || invoiceItem.discountValue,
            price: returnItem.price ? Number(returnItem.price) : invoiceItem.price,
            total_amount: returnItem.total_amount ? Number(returnItem.total_amount) : 0,
          };
        }

        return invoiceItem;
      })
      .filter((item: InvoiceItem) => item.quantity !== '0');

      setItemsList(mergedItems);
      setShowProductPickers(new Array(mergedItems.length).fill(false));
      
      // Fetch available products if needed
      await fetchAvailableProducts(invoiceData.id);

    } catch (error: any) {
      console.error('Error in fetchReturnData:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Invoice or return record not found');
      } else if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else {
        Alert.alert('Error', 'Failed to load return data');
      }
    }
  };

  // const handleQuantityChange = (index: number, value: string) => {
  //   const updatedItems = [...itemsList];
  //   const item = updatedItems[index];
    
  //   // Parse quantities
  //   const newQuantity = parseFloat(value) || 0;
  //   const maxReturnQuantity = parseFloat(item.max_return_quantity) || 0;
    
  //   // 🔥 FIX: For edit mode, allow up to max_return_quantity
  //   if (newQuantity > maxReturnQuantity) {
  //     Alert.alert(
  //       'Quantity Limit',
  //       `Cannot return more than ${maxReturnQuantity} units for ${item.product_name}. ` +
  //       `Note: In edit mode, you can modify quantities up to the original available limit.`
  //     );
  //     return;
  //   }
    
  //   // Update quantity and recalculate total
  //   item.quantity = value;
  //   item.total_amount = calculateItemTotal(item);
  //   updatedItems[index] = item;
    
  //   setItemsList(updatedItems);
  // };

  // const calculateItemTotal = (item: any): number => {
  //   const quantity = parseFloat(item.quantity) || 0;
  //   const price = parseFloat(item.price.toString()) || 0;
  //   const discountValue = parseFloat(item.discountValue) || 0;
    
  //   let subtotal = quantity * price;
    
  //   if (item.discountType === 'Percentage') {
  //     // Percentage discount
  //     const discountAmount = subtotal * (discountValue / 100);
  //     subtotal -= discountAmount;
  //   } else if (item.discountType === 'Fixed') {
  //     // Fixed amount discount
  //     subtotal -= discountValue;
  //   }
    
  //   return Math.max(0, subtotal);
  // };

  // Check if we're in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
    } else {
      resetForm();
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

  // Update filtered invoices when invoices or search changes
  useEffect(() => {
    if (invoiceNumbers.length > 0) {
      const filtered = invoiceNumbers.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        invoice.customer_name.toLowerCase().includes(invoiceSearch.toLowerCase())
      );
      setFilteredInvoices(filtered);
    } else {
      setFilteredInvoices([]);
    }
  }, [invoiceNumbers, invoiceSearch]);

  // Update totals when itemsList changes
  useEffect(() => {
    updateTotals();
  }, [itemsList]);

  // Combined data fetching effect
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch all initial data
        await Promise.all([
          fetchInvoiceNumbers(),
          fetchStatus(), 
          fetchSettings()
        ]);

        // If in edit mode and we have ID, fetch return data
        if (id && isEditMode) {
          await fetchReturnData(id as string);
        }
      } catch (error) {
        console.error('Error in data initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [id, isEditMode, token]);

  // Date handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setCurrentRecord(prev => ({ ...prev, return_date: formattedDate }));
      clearError('return_date');
    }
  };

  // Invoice selection
  const handleInvoiceSelect = (invoiceId: string) => {
    const selectedInvoice = invoiceNumbers.find(inv => inv.id === invoiceId);
    if (selectedInvoice) {
      setCurrentRecord(prev => ({ 
        ...prev, 
        invoice_number: selectedInvoice.invoice_number 
      }));
      setShowInvoicePicker(false);
      setInvoiceSearch('');
      clearError('invoice_number');
      
      // Fetch invoice details and available products
      fetchInvoiceDetails(invoiceId);
    }
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
      const originalItem = originalInvoiceItems.find(item => item.product_id === productId);
      
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: productId,
        product_name: selectedProduct.name,
        price: Number(selectedProduct.sale_price) || 0,
        unit_id: selectedProduct.unit_id,
        unit_name: selectedProduct.unit_name,
        quantity: updatedItems[index].quantity || '0',
        discountType: originalItem?.discountType || 'Percentage',
        discountValue: originalItem?.discountValue || '0',
        total_amount: 0,
        // Use available_quantity from the product data
        max_return_quantity: selectedProduct.quantity || '0',
        available_quantity: selectedProduct.quantity || '0',
        original_quantity: selectedProduct.original_quantity || '0',
        returned_quantity: selectedProduct.returned_quantity || '0'
      };
      setItemsList(updatedItems);
      
      const newPickers = [...showProductPickers];
      newPickers[index] = false;
      setShowProductPickers(newPickers);
      setProductSearch('');
      
      updateRowTotal(index);
    }
  };

  // Get available products for selection (only products from the selected invoice)
  const getAvailableProducts = (currentIndex: number) => {
    const currentProductId = itemsList[currentIndex]?.product_id;
    const usedProductIds = itemsList
      .filter((item, index) => index !== currentIndex && item.product_id)
      .map(item => item.product_id)
      .filter(id => id !== '' && id !== undefined && id !== null);
    
    return products.filter(product => 
      (!usedProductIds.includes(product.id) || product.id === currentProductId)
    );
  };

  // Add new item row
  const addItemRow = () => {
    if (!currentRecord.invoice_number) {
      Alert.alert('Error', 'Please select an invoice first');
      return;
    }

    // Check if there are any available products not already in itemsList
    const availableProducts = getAvailableProducts(itemsList.length);
    if (availableProducts.length === 0) {
      Alert.alert('Info', 'All products from this invoice are already added for return');
      return;
    }

    const newItem: InvoiceItem = {
      product_id: '',
      quantity: '0',
      unit_id: '',
      unit_name: '',
      discountType: '',
      discountValue: '0',
      price: 0,
      total_amount: 0,
    };
    setItemsList(prev => [...prev, newItem]);
    setShowProductPickers(prev => [...prev, false]);
  };

  // Update the deleteItemRow function
  const deleteItemRow = (index: number) => {
    const itemToDelete = itemsList[index];
    
    Alert.alert(
      'Delete Item',
      `Are you sure you want to remove this return item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // If the item has an ID (existing item from API), delete from server
              if (itemToDelete.id && isEditMode) {
                const response = await axios.delete(`${API_URL}/invoice/returns/items/${itemToDelete.id}`, {
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
                }
              } else {
                // If it's a new item (no ID), just remove from local state
                const updatedItems = itemsList.filter((_, i) => i !== index);
                setItemsList(updatedItems);
                const updatedPickers = showProductPickers.filter((_, i) => i !== index);
                setShowProductPickers(updatedPickers);
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

  // Update row total when quantity or discount changes
  const updateRowTotal = (index: number) => {
    const updatedItems = [...itemsList];
    const item = updatedItems[index];
    
    if (item.product_id && item.quantity && item.price) {
      const quantity = parseFloat(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const discountValue = parseFloat(item.discountValue) || 0;
      
      let discountAmount = 0;
      
      // Calculate discount based on discount type
      if (item.discountType === 'Percentage') {
        // For percentage, calculate discount based on current return quantity
        discountAmount = (price * quantity * discountValue) / 100;
      } else {
        // For fixed discount, use the discount value as is
        discountAmount = discountValue;
      }
      
      const total = (price * quantity) - discountAmount;
      item.total_amount = parseFloat(Math.max(0, total).toFixed(2));
      setItemsList(updatedItems);
      
      // Update totals immediately
      updateTotals();
    }
  };

  // Recalculate all item totals when itemsList changes
  useEffect(() => {
    if (itemsList.length > 0) {
      const updatedItems = itemsList.map(item => {
        if (item.product_id && item.quantity && item.price && (!item.total_amount || item.total_amount === 0)) {
          const quantity = parseFloat(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const discountValue = parseFloat(item.discountValue) || 0;
          
          let discountAmount = 0;
          if (item.discountType === 'Percentage') {
            discountAmount = (price * quantity * discountValue) / 100;
          } else {
            discountAmount = discountValue;
          }
          
          const total = (price * quantity) - discountAmount;
          return {
            ...item,
            total_amount: parseFloat(Math.max(0, total).toFixed(2))
          };
        }
        return item;
      });
      
      // Only update if something changed
      const hasChanges = JSON.stringify(updatedItems) !== JSON.stringify(itemsList);
      if (hasChanges) {
        setItemsList(updatedItems);
      }
      
      // Always update totals
      updateTotals();
    }
  }, [itemsList.length]); // Only run when items count changes

  // Validate quantity doesn't exceed maximum returnable quantity
  const validateQuantity = (quantity: string, maxQuantity: string) => {
    const qty = parseFloat(quantity) || 0;
    const maxQty = parseFloat(maxQuantity) || 0;
    return qty <= maxQty;
  };

  const clearError = (field: string) => {
    setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
  };
  
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
      return; // stop here until confirmation
    }

    // 🔹 Otherwise, run directly (for Save)
    await handleSubmitConfirmed(false);
  };

  // Form submission
  const handleSubmitConfirmed = async (isPost: boolean) => {
    setIsLoading(true);
    setGlobalErrorMessage('');
    setFormErrors({});

    try {
      // 🔥 FIX: Determine the correct status
      const finalStatus = isPost ? 'Posted' : currentRecord.status;

      const formData = {
        ...currentRecord,
        id: currentRecord.id, // ✅ add this
        invoice_number: currentRecord.invoice_number,
        status: finalStatus,
        total_quantity: totalQuantity.toFixed(2),
        total_price: totalPrice.toFixed(2),
        total_discount: totalDiscount.toFixed(2),
        grand_total: grandTotal.toFixed(2),
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
        // Update existing return
        response = await axios.put(`${API_URL}/invoice/returns/${currentRecord.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Create new return
        response = await axios.post(`${API_URL}/invoice/returns`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Success - redirect to list
      router.push('/(drawer)/invoices/returns/lists');
      if (!isEditMode) {
        resetForm();
      }

    } catch (error: any) {
      console.error('Error saving invoice return:', error);
      
      if (error.response?.status === 422) {
        // Validation errors from backend
        const backendErrors = error.response.data.errors || {};
        setFormErrors(backendErrors);
        
        if (error.response.data.message) {
          setGlobalErrorMessage(error.response.data.message);
        }
        
      } else if (error.response?.status === 500) {
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Server error occurred';
        setGlobalErrorMessage(errorMessage);
        
      } else {
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

  const getSelectedInvoiceName = (invoiceNumber: string) => {
    const invoice = invoiceNumbers.find(inv => inv.invoice_number === invoiceNumber);
    return invoice ? `${invoice.invoice_number}` : 'Select Invoice';
  };

  const getSelectedStatusName = (statusKey: string) => {
    const status = statusOptions.find(s => s.key === statusKey);
    return status ? status.value : 'Select Status';
  };

  const renderItemRow = ({ item, index }: { item: InvoiceItem; index: number }) => {
    const availableProducts = getAvailableProducts(index);
    const filteredAvailableProducts = availableProducts.filter(product => 
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase())
    );

    // Use available_quantity for validation instead of max_return_quantity
    const maxQuantity = parseFloat(item.available_quantity || item.max_return_quantity || '0');
    const currentQuantity = parseFloat(item.quantity || '0');
    
    // 🔥 FIX: Only show error if user INCREASES quantity beyond available
    const quantityError = currentQuantity > maxQuantity;

    // 🔥 FIX: Get the current picker state for this specific row
    const isPickerOpen = showProductPickers[index] || false;

    return (
      <View style={styles.itemRow}>
        {/* Row Number */}
        <View style={[styles.cell, styles.cellNumber]}>
          <Text style={styles.rowNumberText}>{index + 1}</Text>
        </View>

        {/* Product Selection */}
        <View style={[styles.cell, styles.cellProduct]}>
          <TouchableOpacity
            style={[styles.modalTrigger, (formErrors[`items[${index}].product_id`] || !currentRecord.invoice_number) && styles.inputError]}
            onPress={() => {
              if (!currentRecord.invoice_number) {
                Alert.alert('Error', 'Please select an invoice first');
                return;
              }
              // 🔥 FIX: Properly set the picker state for this specific row
              const newPickers = [...showProductPickers];
              newPickers[index] = true;
              setShowProductPickers(newPickers);
              setProductSearch('');
            }}
            disabled={isLoading || !currentRecord.invoice_number}
          >
            <Text style={!item.product_id ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {getSelectedProductName(item.product_id)}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          {/* Show available quantity information */}
          <Text style={styles.maxQuantityText}>
            Available Stock: {item.available_quantity || '0'}
            {item.original_quantity && ` of ${item.original_quantity}`}
            {item.returned_quantity && parseFloat(item.returned_quantity) > 0 && ` (Returned: ${item.returned_quantity})`}
          </Text>

          {/* Product Selection Modal */}
          <Modal
            visible={isPickerOpen}
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
                  <Text style={styles.modalTitle}>Select Product to Return</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      // 🔥 FIX: Properly close only this row's picker
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
                    placeholder="Search products..."
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
                      onPress={() => {
                        handleProductSelect(product.id, index);
                        // 🔥 FIX: Close modal after selection
                        const newPickers = [...showProductPickers];
                        newPickers[index] = false;
                        setShowProductPickers(newPickers);
                      }}
                    >
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productDetails}>
                          SKU: {product.sku} • Price: {settings.currency} {product.sale_price}
                        </Text>
                        <Text style={styles.productUnit}>
                          Unit: {product.unit_name} • Available: {product.quantity || '0'} of {product.original_quantity || '0'}
                        </Text>
                        {parseFloat(product.returned_quantity || '0') > 0 && (
                          <Text style={styles.returnedInfo}>
                            Already returned: {product.returned_quantity}
                          </Text>
                        )}
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
                        {productSearch ? 'No products found' : 'No products available for return'}
                      </Text>
                      <Text style={styles.emptyModalSubtext}>
                        {productSearch 
                          ? 'Try a different search term' 
                          : 'All products are already added or no products found in this invoice'
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
            style={[
              styles.inputSmall, 
              (formErrors[`items[${index}].quantity`] || quantityError) && styles.inputError
            ]}
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
            placeholder="0"
          />
          {/* {item.max_return_quantity && (
            <Text style={styles.maxQuantityText}>
              Max: {item.max_return_quantity} (Original: {item.original_quantity}, Returned: {item.returned_quantity})
            </Text>
          )} */}


          {quantityError && (
            <Text style={styles.errorTextSmall}>
              Cannot return more than {item.available_quantity} units
            </Text>
          )}
          {/* 🔥 ADD: Show info message in edit mode */}
          {isEditMode && !quantityError && (
            <Text style={styles.infoText}>
              Editing existing return of {currentQuantity} units
            </Text>
          )}
        </View>

        {/* Unit */}
        <View style={[styles.cell, styles.cellUnit]}>
          <Text style={styles.unitText} numberOfLines={1}>
            {item.unit_name || '-'}
          </Text>
        </View>

        {/* Discount - Show discount info */}
        <View style={[styles.cell, styles.cellDiscount]}>
          <View style={styles.discountContainer}>
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
              placeholder="0"
            />
          </View>
          <Text style={styles.discountTypeText}>
            {item.discountType === 'Percentage' ? '%' : settings.currency}
          </Text>
        </View>

        {/* Price */}
        <View style={[styles.cell, styles.cellPrice]}>
          <Text style={styles.priceText} numberOfLines={1}>
            {settings.currency}{formatCurrency(item.price)}
          </Text>
        </View>

        {/* Total */}
        <View style={[styles.cell, styles.cellTotal]}>
          <Text style={styles.totalText} numberOfLines={1}>
            {settings.currency}{formatCurrency(item.total_amount)}
          </Text>
        </View>

        {/* Action */}
        <View style={[styles.cell, styles.cellAction]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItemRow(index)}
            disabled={isLoading}
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
          <TouchableOpacity onPress={() => router.push('/(drawer)/invoices/returns/lists')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditMode ? 'Edit Invoice Return' : 'Add Invoice Return'}</Text>
          <View style={{ width: 24 }} /> 
        </View>

        {/* Invoice Number Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Number <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors.invoice_number && styles.inputError]}
            onPress={() => setShowInvoicePicker(true)}
            disabled={isLoading || isEditMode}
          >
            <Text style={!currentRecord.invoice_number ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {getSelectedInvoiceName(currentRecord.invoice_number)}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          {formErrors.invoice_number && (
            <Text style={styles.errorText}>{formErrors.invoice_number[0]}</Text>
          )}
        </View>

        {/* Customer Display (Read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Customer</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {currentRecord.customer_name || 'Select an invoice to load customer'}
            </Text>
          </View>
        </View>

        {/* Return Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Return Date <Text style={styles.errorText}>*</Text></Text>
          <TouchableOpacity
            style={[styles.modalTrigger, formErrors.return_date && styles.inputError]}
            onPress={() => setShowDatePicker(true)}
            disabled={isLoading}
          >
            <Text style={styles.modalTriggerText}>{currentRecord.return_date}</Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          {formErrors.return_date && (
            <Text style={styles.errorText}>{formErrors.return_date[0]}</Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Status <Text style={styles.errorText}>*</Text></Text>
          
          {currentRecord.status === 'Posted' ? (
            // Read-only field for Posted status
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>Posted</Text>
            </View>
          ) : (
            // Editable field for other statuses
            <TouchableOpacity
              style={[styles.modalTrigger, formErrors.status && styles.inputError]}
              onPress={() => setShowStatusPicker(true)}
              disabled={isLoading}
            >
              <Text style={!currentRecord.status ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
                {getSelectedStatusName(currentRecord.status)}
              </Text>
            </TouchableOpacity>
          )}
          
          {formErrors.status && (
            <Text style={styles.errorText}>{formErrors.status[0]}</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Return Items</Text>
          
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
          {currentRecord.status !== 'Posted' && (
          <TouchableOpacity 
            style={[styles.addItemButton, (!currentRecord.invoice_number || isLoading) && styles.addItemButtonDisabled]} 
            onPress={addItemRow}
            disabled={!currentRecord.invoice_number || isLoading}
          >
            <Ionicons name="add-circle-outline" size={20} color="#34C759" />
            <Text style={styles.addItemText}>Add Return Item</Text>
          </TouchableOpacity>
          )}
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

        {/* Action Buttons */}
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
              <Text style={styles.buttonText}>Post Return</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Message */}
        {currentRecord.status === 'Posted' && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusMessageText}>
              Invoice Return has been posted and cannot be changed.
            </Text>
          </View>
        )}

        {globalErrorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.globalError}>{globalErrorMessage}</Text>
          </View>
        ) : null}

        {/* Modals */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(currentRecord.return_date)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <Modal
          visible={showInvoicePicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowInvoicePicker(false);
            setInvoiceSearch('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Invoice</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowInvoicePicker(false);
                    setInvoiceSearch('');
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
                  placeholder="Search invoices by number or customer..."
                  placeholderTextColor="#999"
                  value={invoiceSearch}
                  onChangeText={setInvoiceSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {invoiceSearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setInvoiceSearch('')}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredInvoices}
                keyExtractor={(invoice) => invoice.id}
                renderItem={({ item: invoice }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      currentRecord.invoice_number === invoice.invoice_number && styles.selectedModalItem
                    ]}
                    onPress={() => handleInvoiceSelect(invoice.id)}
                  >
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceNumber} numberOfLines={1}>
                        {invoice.invoice_number}
                      </Text>
                      <Text style={styles.invoiceCustomer}>
                        Customer: {invoice.customer_name}
                      </Text>
                    </View>
                    {currentRecord.invoice_number === invoice.invoice_number && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModal}>
                    <Ionicons name="document-outline" size={50} color="#ccc" />
                    <Text style={styles.emptyModalText}>
                      {invoiceSearch ? 'No invoices found' : 'No invoices available'}
                    </Text>
                    <Text style={styles.emptyModalSubtext}>
                      {invoiceSearch 
                        ? 'Try a different search term' 
                        : 'No invoices found in the system'
                      }
                    </Text>
                  </View>
                }
                contentContainerStyle={filteredInvoices.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
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
    backgroundColor: '#f8f9fa',
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
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },

  // ===== FORM FIELD GROUPS =====
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },

  // ===== MODAL TRIGGER STYLES (Dropdowns) =====
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalTriggerText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  modalTriggerPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },

  // ===== READ-ONLY FIELD STYLES =====
  readOnlyField: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#6b7280',
  },

  // ===== ERROR STATES =====
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  errorTextSmall: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 10,
    color: '#007AFF',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // ===== ITEMS TABLE SECTION =====
  itemsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  tableScrollContainer: {
    marginBottom: 16,
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
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // ===== TABLE COLUMN WIDTHS =====
  headerCellNumber: { width: 40 },
  headerCellProduct: { width: 250 },
  headerCellQty: { width: 80 },
  headerCellUnit: { width: 80 },
  headerCellDiscount: { width: 120 },
  headerCellPrice: { width: 150 },
  headerCellTotal: { width: 150 },
  headerCellAction: { width: 60 },

  // ===== TABLE ROW STYLES =====
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: 'white',
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: '#f3f4f6',
    justifyContent: 'center',
  },

  // ===== CELL WIDTHS (Match header widths) =====
  cellNumber: { width: 40 },
  cellProduct: { width: 250 },
  cellQty: { width: 80 },
  cellUnit: { width: 80 },
  cellDiscount: { width: 120 },
  cellPrice: { width: 150 },
  cellTotal: { width: 150 },
  cellAction: { width: 60 },

  // ===== CELL CONTENT STYLES =====
  rowNumberText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  inputSmall: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    minHeight: 36,
  },
  unitText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 6,
  },
  priceText: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '500',
    paddingVertical: 6,
  },
  totalText: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 6,
  },

  // ===== DISCOUNT CONTAINER =====
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountInput: {
    flex: 1,
  },
  discountTypeText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  maxQuantityText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
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
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addItemButtonDisabled: {
    opacity: 0.5,
  },
  addItemText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  grandTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 18,
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

  // ===== GLOBAL ERROR CONTAINER =====
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
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  globalError: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
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
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderBottomColor: '#f3f4f6',
  },
  selectedModalItem: {
    backgroundColor: '#eff6ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },

  // ===== PRODUCT INFO IN MODAL =====
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 12,
    color: '#9ca3af',
  },
  returnedInfo: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 2,
  },

  // ===== INVOICE INFO IN MODAL =====
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  invoiceCustomer: {
    fontSize: 14,
    color: '#6b7280',
  },

  // ===== EMPTY MODAL STATES =====
  emptyModal: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyModalSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});