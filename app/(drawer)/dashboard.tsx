import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const { user, token } = useAuth();
  const navigation = useNavigation();
  const [dashboardData, setDashboardData] = useState({
    products_count: 0,
    customers_count: 0,
    invoices_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setDashboardData(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching dashboard data:', error.response?.data || error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Make sure to always fetch, even if token arrives later
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  // ✅ Prevent infinite loading when token is null or delayed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000); // fallback after 5s in case of failure
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) return <LoadingScreen />;

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const quickStats = [
    { 
      title: 'Total Invoices', 
      value: dashboardData.invoices_count.toString(), 
      icon: 'document-text', 
      color: '#007AFF' 
    },
    { 
      title: 'Products', 
      value: dashboardData.products_count.toString(), 
      icon: 'cube', 
      color: '#34C759' 
    },
    { 
      title: 'Customers', 
      value: dashboardData.customers_count.toString(), 
      icon: 'people', 
      color: '#FF3B30' 
    },
    { 
      title: 'Revenue', 
      value: '$0',
      icon: 'cash', 
      color: '#FF3B30' 
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
      >
        <Text style={styles.welcome}>Welcome back, {user?.first_name || user?.name || 'User'}! 👋</Text>
        
        <View style={styles.statsGrid}>
          {quickStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Ionicons name={stat.icon as any} size={20} color="#ffffff" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  welcome: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statTitle: { fontSize: 14, color: '#6B7280' },
});
