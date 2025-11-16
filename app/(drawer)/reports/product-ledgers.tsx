import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import LoadingScreen from "../../components/LoadingScreen";

interface Product {
  id: string;
  name: string;
  sku: string;
  product_label?: string;
}

interface ProductStock {
  product_id: number;
  sku: string;
  product_name: string;
  create: string;
  stocks: number;
  cost_price: string;
  sale_price: string;
}

// Define column configuration for stock report
const COLUMN_WIDTHS = {
  number: 40,
  sku: 120,
  product: 150,
  stocks: 80,
  cost_price: 100,
  sale_price: 100,
  create_date: 100,
};

const COLUMN_LABELS = {
  number: '#',
  sku: 'SKU',
  product: 'Product Name',
  stocks: 'Stocks',
  cost_price: 'Cost Price',
  sale_price: 'Sale Price',
  create_date: 'Create Date',
};

// Calculate total table width
const TABLE_TOTAL_WIDTH = Object.values(COLUMN_WIDTHS).reduce((sum, width) => sum + width, 0);

export default function ProductStockReportScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  // ===========================================================
  // MEMOIZED VALUES
  // ===========================================================

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // ===========================================================
  // LOAD PRODUCTS
  // ===========================================================

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await axios.get(`${API_URL}/active/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.map((c: Product) => ({
        ...c,
        id: String(c.id),
        product_label: `${c.name} (${c.sku})`,
      }));

      setProducts(list);
    } catch (e) {
      console.log("Product fetch error", e);
      setFormErrors({ api: ["Failed to load products"] });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = useCallback((id: string) => {
    setSelectedProduct(id);
    setShowProductPicker(false);
    setProductSearch("");
    setFormErrors({});
  }, []);

  const getSelectedProductName = () => {
    const c = products.find((x) => x.id === selectedProduct);
    return c ? c.product_label : "Select One";
  };

  // ===========================================================
  // FORM VALIDATION
  // ===========================================================

  const validateForm = () => {
    const errors: Record<string, string[]> = {};
    // Remove product validation to allow empty selection
    if (fromDate && toDate && fromDate > toDate) {
      errors.dates = ["From date cannot be after to date"];
    }
    return errors;
  };

  // ===========================================================
  // STOCK REPORT FETCH
  // ===========================================================

  const fetchStockReport = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const fromDateFormatted = fromDate ? formatDate(fromDate) : '';
      const toDateFormatted = toDate ? formatDate(toDate) : '';

      const res = await axios.get(`${API_URL}/product/ledgers`, {
        params: {
          product_id: selectedProduct || '', // Send empty if no product selected
          from_date: fromDateFormatted,
          to_date: toDateFormatted,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setProductStocks(res.data.ledgers || []);
      
    } catch (e: any) {
      console.log("Stock report fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStockReport();
    setRefreshing(false);
  };

  // ===========================================================
  // DATE HANDLING
  // ===========================================================

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onChangeFrom = (event: any, date?: Date) => {
    setShowFromPicker(false);
    if (date) setFromDate(date);
  };

  const onChangeTo = (event: any, date?: Date) => {
    setShowToPicker(false);
    if (date) setToDate(date);
  };

  // ===========================================================
  // SEARCH HANDLING
  // ===========================================================

  const handleSearchChange = (text: string) => {
    setProductSearch(text);
  };

  const clearSearch = () => {
    setProductSearch("");
  };

  // ===========================================================
  // RENDER FUNCTIONS
  // ===========================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const renderStockItem = ({ item, index }: { item: ProductStock; index: number }) => (
    <View key={index} style={styles.itemRow}>
      {/* Row Number */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.number }]}>
        <Text style={styles.rowNumberText}>{index + 1}</Text>
      </View>

      {/* SKU */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.sku }]}>
        <Text style={styles.stockText} numberOfLines={1}>
          {item.sku}
        </Text>
      </View>

      {/* Product Name */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.product }]}>
        <Text style={styles.stockText} numberOfLines={1}>
          {item.product_name}
        </Text>
      </View>

      {/* Stocks */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.stocks }]}>
        <Text style={styles.amountText}>
          {item.stocks}
        </Text>
      </View>

      {/* Cost Price */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.cost_price }]}>
        <Text style={styles.amountText}>
          {formatCurrency(Number(item.cost_price))}
        </Text>
      </View>

      {/* Sale Price */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.sale_price }]}>
        <Text style={styles.amountText}>
          {formatCurrency(Number(item.sale_price))}
        </Text>
      </View>

      {/* Create Date */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.create_date }]}>
        <Text style={styles.stockDate}>
          {item.create}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyItems}>
      <Ionicons name="cube-outline" size={40} color="#ccc" />
      <Text style={styles.emptyItemsText}>
        {selectedProduct ? "No stock entries found for selected product" : "No stock entries found"}
      </Text>
    </View>
  );

  // ===========================================================
  // UI
  // ===========================================================

  if (loadingProducts) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Product Stock Report</Text>
        </View>

        {/* PRODUCT SELECT */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select Product</Text>

          <TouchableOpacity
            style={styles.modalTrigger}
            onPress={() => setShowProductPicker(true)}
          >
            <Text style={!selectedProduct ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {selectedProduct ? getSelectedProductName() : "All Products"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* PRODUCT PICKER MODAL */}
        <Modal
          visible={showProductPicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowProductPicker(false);
            setProductSearch("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
  <Text style={styles.modalTitle}>Select Product</Text>
  <TouchableOpacity 
    onPress={() => {
      setShowProductPicker(false);
      setProductSearch("");
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
                  onChangeText={handleSearchChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {productSearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={clearSearch}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {loadingProducts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading products...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(product) => product.id}
                  renderItem={({ item: product }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selectedProduct === product.id && styles.selectedModalItem
                      ]}
                      onPress={() => handleProductSelect(product.id)}
                    >
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productSKU}>
                          SKU: {product.sku}
                        </Text>
                      </View>
                      {selectedProduct === product.id && (
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
                          : 'No products found in the system'
                        }
                      </Text>
                    </View>
                  }
                  contentContainerStyle={filteredProducts.length === 0 ? styles.modalListContentEmpty : styles.modalListContent}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* DATE PICKERS */}
        <View style={styles.row}>
          <View style={styles.dateContainer}>
            <Text style={styles.label}>From Date</Text>
            <TouchableOpacity
              style={styles.modalTrigger}
              onPress={() => setShowFromPicker(true)}
            >
              <Text style={fromDate ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
                {fromDate ? formatDate(fromDate) : "Select Date"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.label}>To Date</Text>
            <TouchableOpacity
              style={styles.modalTrigger}
              onPress={() => setShowToPicker(true)}
            >
              <Text style={toDate ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
                {toDate ? formatDate(toDate) : "Select Date"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {formErrors.dates && (
          <Text style={styles.errorText}>{formErrors.dates[0]}</Text>
        )}

        {showFromPicker && (
          <DateTimePicker 
            mode="date" 
            value={fromDate || new Date()} 
            onChange={onChangeFrom} 
          />
        )}
        {showToPicker && (
          <DateTimePicker 
            mode="date" 
            value={toDate || new Date()} 
            onChange={onChangeTo} 
          />
        )}

        {/* SUBMIT BUTTON */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.button,
              styles.primaryButton,
              loading && styles.buttonDisabled
            ]} 
            onPress={fetchStockReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button,
              styles.secondaryButton,
              loading && styles.buttonDisabled
            ]} 
            onPress={() => {
              setSelectedProduct(null);
              setFromDate(null);
              setToDate(null);
              setProductStocks([]);
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* API ERRORS */}
        {formErrors.api && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#d32f2f" />
            <Text style={styles.globalError}>{formErrors.api[0]}</Text>
          </View>
        )}

        {/* STOCK LIST */}
        {productStocks.length > 0 ? (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Stock Report</Text>

            {/* Horizontal Scroll Container */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.tableScrollContainer}
            >
              <View style={[styles.tableContainer, { minWidth: TABLE_TOTAL_WIDTH }]}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  {Object.keys(COLUMN_WIDTHS).map((key) => (
                    <View 
                      key={key}
                      style={[
                        styles.headerCell,
                        { width: COLUMN_WIDTHS[key as keyof typeof COLUMN_WIDTHS] },
                        (key === 'stocks' || key === 'cost_price' || key === 'sale_price') && styles.headerCellCenter
                      ]}
                    >
                      <Text style={[
                        styles.headerText,
                        (key === 'stocks' || key === 'cost_price' || key === 'sale_price') && styles.headerTextCenter
                      ]}>
                        {COLUMN_LABELS[key as keyof typeof COLUMN_LABELS]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Stock Items */}
                <FlatList
                  data={productStocks}
                  renderItem={renderStockItem}
                  keyExtractor={(item, index) => `stock-${index}-${item.product_id}`}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>
          </View>
        ) : (
          !loading && renderEmptyState()
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ===========================================================
// STYLES
// ===========================================================
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
    justifyContent: 'center',
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  dateContainer: {
    flex: 1
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

  // ===== ACTION BUTTONS CONTAINER =====
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#6B7280',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
  },

  // ===== LOADING STATES =====
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280'
  },

  // ===== ERROR STATES =====
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  globalError: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1
  },
  inputError: {
    borderColor: '#d32f2f',
  },

  // ===== ITEMS TABLE SECTION =====
  itemsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
  tableScrollContainer: {
    maxHeight: 400,
  },
  tableContainer: {
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
  headerCellCenter: {
    alignItems: 'center',
  },
  headerTextCenter: {
    textAlign: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  cell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    justifyContent: 'center',
  },

  // ===== CELL CONTENT STYLES =====
  rowNumberText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  stockText: {
    fontSize: 12,
    color: '#333',
  },
  stockDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ===== TABLE ROW STYLES =====
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },

  // ===== EMPTY STATES =====
  emptyItems: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  emptyItemsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
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
  productSKU: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
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

  // ===== SECTION TITLE =====
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
});