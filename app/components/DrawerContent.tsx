// components/DrawerContent.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'expo-router';
import { useRouter } from 'expo-router';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: string;
  category?: boolean;
  items?: MenuItem[];
}

const menuData: MenuItem[] = [
  { id: 'category-main', title: 'Main', category: true },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'grid-outline',
    route: 'dashboard',
  },
  
  { id: 'category-companies', title: 'Companies', category: true },
  {
    id: 'companies',
    title: 'Company',
    icon: 'business-outline',
    route: 'companies',
  },
  
  {
    id: 'invoices',
    title: 'Invoices',
    icon: 'document-text-outline',
    items: [
      { id: 'invoices-list', title: 'Listing', route: 'invoices/lists' },
      { id: 'invoices-add', title: 'Add New', route: 'invoices/add' },
      { id: 'invoices-returns', title: 'Returns', route: 'invoices/returns' },
    ],
  },
  
  {
    id: 'products',
    title: 'Products',
    icon: 'cube-outline',
    items: [
      { id: 'products-list', title: 'Listing', route: 'products/lists' },
      { id: 'products-add', title: 'Add New', route: 'products/add' },
      { id: 'products-categories', title: 'Categories', route: 'products/categories' },
      { id: 'products-brands', title: 'Brands', route: 'products/brands' },
      { id: 'products-units', title: 'Units', route: 'products/units' },
      { id: 'products-stocks', title: 'Stocks', route: 'products/stocks' },
    ],
  },
  
  {
    id: 'customers',
    title: 'Customers',
    icon: 'people-outline',
    route: 'customers',
  },
  
  {
    id: 'banks',
    title: 'Bank A/C',
    icon: 'card-outline',
    route: 'banks',
  },
  
  {
    id: 'cities',
    title: 'Cities',
    icon: 'location-outline',
    route: 'cities',
  },
  
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bar-chart-outline',
    items: [
      { id: 'reports-customers', title: 'Customers', route: 'reports/customers' },
    ],
  },
  
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    route: 'settings',
  },
];

interface DrawerContentProps {
  navigation: any;
}

const DrawerContent = (props: DrawerContentProps) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (route?: string) => {
    if (route) {
      router.push(`/(drawer)/${route}`); // add /(drawer)/ prefix for all drawer routes
      props.navigation.closeDrawer();
    }
  };

  const isActive = (route?: string) => {
    if (!route) return false;
    const routePath = `/(drawer)/${route}`;
    return pathname === routePath || pathname.startsWith(routePath + '/');
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (item.category) {
      return (
        <View key={item.id} style={[styles.categoryContainer, { paddingLeft: 16 + level * 16 }]}>
          <Text style={styles.categoryText}>{item.title}</Text>
        </View>
      );
    }

    const hasChildren = item.items && item.items.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.route);

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={[
            styles.menuItem, 
            { paddingLeft: 16 + level * 16 },
            active && styles.activeMenuItem
          ]}
          onPress={() => hasChildren ? toggleExpand(item.id) : handleNavigation(item.route)}
        >
          <Ionicons 
            name={item.icon as any} 
            size={20} 
            color={active ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.menuText, active && styles.activeMenuText]}>
            {item.title}
          </Text>
          {hasChildren && (
            <Ionicons
              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color={active ? '#007AFF' : '#666'}
            />
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View style={styles.subMenu}>
            {item.items!.map((subItem) => renderMenuItem(subItem, level + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}
      
      {/* Header with proper status bar spacing */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Ionicons name="person-circle-outline" size={48} color="#ffffff" />
          <View style={styles.userText}>
            <Text style={styles.userName}>{user?.first_name || user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuData.map((item) => renderMenuItem(item))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#007AFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
  },
  categoryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  activeMenuItem: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  activeMenuText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  subMenu: {
    backgroundColor: '#fafafa',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff3b30',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default DrawerContent;