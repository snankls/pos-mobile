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

interface Customer {
  id: string;
  name: string;
  code: string;
  credit_limit: string;
  customer_label?: string;
}

interface LedgerEntry {
  customer_name: string;
  ledger_date: string;
  debit: string | number;
  credit: string | number;
  balance: string | number | null;
  description: string;
}

// Define column configuration outside the component
const COLUMN_WIDTHS = {
  number: 40,
  customer: 150,
  date: 100,
  debit: 100,
  credit: 100,
  balance: 100,
  description: 180,
};

const COLUMN_LABELS = {
  number: '#',
  customer: 'Customer Name',
  date: 'Date',
  debit: 'Debit',
  credit: 'Credit',
  balance: 'Balance',
  description: 'Description',
};

// Calculate total table width
const TABLE_TOTAL_WIDTH = Object.values(COLUMN_WIDTHS).reduce((sum, width) => sum + width, 0);

export default function CustomerLedgersScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { token } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const [totals, setTotals] = useState({
    debit: 0,
    credit: 0,
    balance: 0,
  });

  // ===========================================================
  // MEMOIZED VALUES
  // ===========================================================

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.code.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);

  // ===========================================================
  // LOAD CUSTOMERS
  // ===========================================================

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await axios.get(`${API_URL}/active/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.map((c: Customer) => ({
        ...c,
        id: String(c.id),
        customer_label: `${c.name} (${c.code})`,
      }));

      setCustomers(list);
    } catch (e) {
      console.log("Customer fetch error", e);
      setFormErrors({ api: ["Failed to load customers"] });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = useCallback((id: string) => {
    setSelectedCustomer(id);
    setShowCustomerPicker(false);
    setCustomerSearch("");
    setFormErrors({});
  }, []);

  const getSelectedCustomerName = () => {
    const c = customers.find((x) => x.id === selectedCustomer);
    return c ? c.customer_label : "Select One";
  };

  // ===========================================================
  // FORM VALIDATION
  // ===========================================================

  const validateForm = () => {
    const errors: Record<string, string[]> = {};
    if (!selectedCustomer) errors.customer_id = ["Customer is required"];
    if (fromDate && toDate && fromDate > toDate) {
      errors.dates = ["From date cannot be after to date"];
    }
    return errors;
  };

  // ===========================================================
  // LEDGER FETCH
  // ===========================================================

  const processLedgerData = (ledgers: LedgerEntry[]) => {
    let runningBalance = 0;
    
    return ledgers.map(entry => {
      const debit = Number(entry.debit) || 0;
      const credit = Number(entry.credit) || 0;
      
      // Calculate running balance
      runningBalance += debit - credit;
      
      return {
        ...entry,
        debit: debit,
        credit: credit,
        balance: runningBalance
      };
    });
  };

  const fetchLedger = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const fromDateFormatted = fromDate ? formatDate(fromDate) : '';
      const toDateFormatted = toDate ? formatDate(toDate) : '';

      const res = await axios.get(`${API_URL}/customer/ledgers`, {
        params: {
          customer_id: selectedCustomer,
          from_date: fromDateFormatted,
          to_date: toDateFormatted,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const processedLedgers = processLedgerData(res.data.ledgers || []);
      setLedgers(processedLedgers);
      setTotals({
        debit: Number(res.data.totalDebit ?? 0),
        credit: Number(res.data.totalCredit ?? 0),
        balance: Number(res.data.balance ?? 0),
      });
      
    } catch (e: any) {
      console.log("Ledger fetch error", e);
      setFormErrors({ api: ["Network error. Please try again."] });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLedger();
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
    setCustomerSearch(text);
  };

  const clearSearch = () => {
    setCustomerSearch("");
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

  const formatLedgerDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return dateString.split('T')[0];
  };

  const renderLedgerItem = ({ item, index }: { item: LedgerEntry; index: number }) => (
    <View key={index} style={styles.itemRow}>
      {/* Row Number */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.number }]}>
        <Text style={styles.rowNumberText}>{index + 1}</Text>
      </View>

      {/* Customer Name */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.customer }]}>
        <Text style={styles.customerText} numberOfLines={1}>
          {item.customer_name}
        </Text>
      </View>

      {/* Date */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.date }]}>
        <Text style={styles.ledgerDate}>{formatLedgerDate(item.ledger_date)}</Text>
      </View>

      {/* Debit */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.debit }]}>
        <Text style={[styles.amountText, styles.debitColor]}>
          {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '0'}
        </Text>
      </View>

      {/* Credit */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.credit }]}>
        <Text style={[styles.amountText, styles.creditColor]}>
          {Number(item.credit) > 0 ? formatCurrency(Number(item.credit)) : '0'}
        </Text>
      </View>

      {/* Balance */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.balance }]}>
        <Text style={[
          styles.amountText,
          Number(item.balance) >= 0 ? styles.creditColor : styles.debitColor
        ]}>
          {formatCurrency(Number(item.balance))}
        </Text>
      </View>

      {/* Description */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS.description }]}>
        <Text style={styles.ledgerDescription} numberOfLines={2}>
          {item.description || 'N/A'}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyItems}>
      <Ionicons name="document-text-outline" size={40} color="#ccc" />
      <Text style={styles.emptyItemsText}>
        {selectedCustomer ? "No ledger entries found" : "Select a customer to view ledger"}
      </Text>
    </View>
  );

  // ===========================================================
  // UI
  // ===========================================================

  if (loadingCustomers) return <LoadingScreen />;

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
          <Text style={styles.title}>Customer Ledger</Text>
        </View>

        {/* CUSTOMER SELECT */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select Customer <Text style={styles.errorText}>*</Text></Text>

          <TouchableOpacity
            style={[
              styles.modalTrigger, 
              formErrors.customer_id && styles.inputError
            ]}
            onPress={() => setShowCustomerPicker(true)}
          >
            <Text style={!selectedCustomer ? styles.modalTriggerPlaceholder : styles.modalTriggerText}>
              {getSelectedCustomerName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {formErrors.customer_id && (
            <Text style={styles.errorText}>{formErrors.customer_id[0]}</Text>
          )}
        </View>

        {/* CUSTOMER PICKER MODAL */}
        <Modal
          visible={showCustomerPicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowCustomerPicker(false);
            setCustomerSearch("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Customer</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCustomerPicker(false);
                    setCustomerSearch("");
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
                  onChangeText={handleSearchChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {customerSearch.length > 0 && (
                  <TouchableOpacity 
                    onPress={clearSearch}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {loadingCustomers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading customers...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredCustomers}
                  keyExtractor={(customer) => customer.id}
                  renderItem={({ item: customer }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selectedCustomer === customer.id && styles.selectedModalItem
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
                      {selectedCustomer === customer.id && (
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
              (!selectedCustomer || loading) && styles.buttonDisabled
            ]} 
            onPress={fetchLedger}
            disabled={!selectedCustomer || loading}
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
              setSelectedCustomer(null);
              setFromDate(null);
              setToDate(null);
              setLedgers([]);
              setTotals({ debit: 0, credit: 0, balance: 0 });
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

        {/* LEDGER LIST */}
        {ledgers.length > 0 ? (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Ledger Entries</Text>

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
                        // Apply center alignment for specific columns
                        (key === 'date' || key === 'debit' || key === 'credit' || key === 'balance') && styles.headerCellCenter
                      ]}
                    >
                      <Text style={[
                        styles.headerText,
                        // Apply center alignment for specific columns
                        (key === 'date' || key === 'debit' || key === 'credit' || key === 'balance') && styles.headerTextCenter
                      ]}>
                        {COLUMN_LABELS[key as keyof typeof COLUMN_LABELS]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Ledger Items */}
                <FlatList
                  data={ledgers}
                  renderItem={renderLedgerItem}
                  keyExtractor={(item, index) => `ledger-${index}-${item.ledger_date}`}
                  scrollEnabled={false}
                />

                {/* Totals Footer */}
                <View style={styles.tableFooter}>
                  <View style={[styles.footerCell, { width: COLUMN_WIDTHS.number + COLUMN_WIDTHS.customer + COLUMN_WIDTHS.date }]}>
                    <Text style={styles.footerText}>Total:</Text>
                  </View>
                  <View style={[styles.footerCell, { width: COLUMN_WIDTHS.debit }]}>
                    <Text style={styles.footerText}>{formatCurrency(totals.debit)}</Text>
                  </View>
                  <View style={[styles.footerCell, { width: COLUMN_WIDTHS.credit }]}>
                    <Text style={styles.footerText}>{formatCurrency(totals.credit)}</Text>
                  </View>
                  <View style={[styles.footerCell, { width: COLUMN_WIDTHS.balance }]}>
                    <Text style={styles.footerText}>{formatCurrency(totals.balance)}</Text>
                  </View>
                  <View style={[styles.footerCell, { width: COLUMN_WIDTHS.description }]}>
                    <Text style={styles.footerText}></Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        ) : (
          !loading && renderEmptyState()
        )}

        {/* TOTALS */}
        {ledgers.length > 0 && (
        <View style={styles.totalsSection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Debit:</Text>
            <Text style={[styles.totalValue, styles.debitColor]}>
              {formatCurrency(totals.debit)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Credit:</Text>
            <Text style={[styles.totalValue, styles.creditColor]}>
              {formatCurrency(totals.credit)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Balance:</Text>
            <Text style={[
              styles.grandTotalValue,
              totals.balance >= 0 ? styles.creditColor : styles.debitColor
            ]}>
              {formatCurrency(totals.balance)}
            </Text>
          </View>
        </View>
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
  footerCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },

  // ===== CELL CONTENT STYLES =====
  rowNumberText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  customerText: {
    fontSize: 12,
    color: '#333',
  },
  ledgerDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  ledgerDescription: {
    fontSize: 12,
    color: '#333',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ===== TABLE FOOTER STYLES =====
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderTopWidth: 2,
    borderTopColor: '#dee2e6',
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  // ===== TABLE ROW STYLES =====
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },

  // ===== CELL CONTENT STYLES =====
  debitColor: {
    color: '#dc2626',
  },
  creditColor: {
    color: '#16a34a',
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

  // ===== TOTALS SECTION =====
  totalsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
  },
});