// components/DrawerContent.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePathname, useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: string;
  category?: boolean;
  items?: MenuItem[];
}

const menuData: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'grid-outline',
    route: 'dashboard',
  },

  { id: 'category-sales', title: 'Sales', category: true, icon: '' },
  {
    id: 'invoices',
    title: 'Invoices',
    icon: 'receipt-outline',
    route: 'invoices/invoices/lists',
  },
  {
    id: 'invoice-returns',
    title: 'Returns',
    icon: 'arrow-undo-outline',
    route: 'invoices/returns/lists',
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: 'people-outline',
    route: 'customers/lists',
  },

  { id: 'category-inventory', title: 'Inventory', category: true, icon: '' },
  {
    id: 'products',
    title: 'Products',
    icon: 'pricetag-outline',
    items: [
      { id: 'products-list', title: 'Listing', route: 'products/lists', icon: 'list-outline' },
      { id: 'products-add', title: 'Add New', route: 'products/setup', icon: 'add-circle-outline' },
      { id: 'products-brands', title: 'Brands', route: 'products/brands', icon: 'ribbon-outline' },
      { id: 'products-categories', title: 'Categories', route: 'products/categories', icon: 'albums-outline' },
      { id: 'products-units', title: 'Units', route: 'products/units', icon: 'resize-outline' },
    ],
  },
  {
    id: 'products-stocks',
    title: 'Stocks',
    icon: 'cube-outline',
    route: 'stocks/lists',
  },

  { id: 'category-administration', title: 'Administration', category: true, icon: '' },
  {
    id: 'companies',
    title: 'Company',
    icon: 'business-outline',
    route: 'companies',
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

  { id: 'category-reports', title: 'Reports & Analytics', category: true, icon: '' },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bar-chart-outline',
    items: [
      { id: 'reports-customers', title: 'Customers', route: 'reports/customers', icon: 'person-outline' },
      { id: 'reports-sales', title: 'Sales', route: 'reports/sales', icon: 'stats-chart-outline' },
      { id: 'reports-inventory', title: 'Inventory', route: 'reports/inventory', icon: 'cube-outline' },
    ],
  },

  { id: 'category-system', title: 'System', category: true, icon: '' },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    route: 'settings',
  },
];

interface DrawerContentProps {
  navigation?: { closeDrawer: () => void };
}

export default function DrawerContent(props: DrawerContentProps) {
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.has(itemId) ? new Set() : new Set([itemId])
    );
  };

  const handleNavigation = (route?: string, parentId?: string) => {
    if (!route) return;

    if (parentId) setExpandedItems(new Set([parentId]));
    else setExpandedItems(new Set());

    router.push(`/(drawer)/${route}` as any);
    props.navigation?.closeDrawer?.();
  };

  const isActive = (route?: string) => {
    if (!route) return false;
    const routePath = `/(drawer)/${route}`;
    return pathname === routePath || pathname.startsWith(routePath + '/');
  };

  const renderMenuItem = (item: MenuItem & { parentId?: string }, level = 0) => {
    if (item.category) {
      return (
        <View
          key={item.id}
          style={[styles.categoryContainer, { paddingLeft: 16 + level * 12 }]}
        >
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
            { paddingLeft: 20 + level * 16 },
            active && styles.activeMenuItem,
          ]}
          onPress={() =>
            hasChildren
              ? toggleExpand(item.id)
              : handleNavigation(item.route, item.parentId)
          }
        >
          <Ionicons
            name={item.icon as any}
            size={20}
            color={active ? '#007AFF' : '#6B7280'}
          />
          <Text style={[styles.menuText, active && styles.activeMenuText]}>
            {item.title}
          </Text>
          {hasChildren && (
            <Ionicons
              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color={active ? '#007AFF' : '#9CA3AF'}
            />
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View style={styles.subMenu}>
            {item.items!.map(subItem =>
              renderMenuItem({ ...subItem, parentId: item.id }, level + 1)
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {user?.images?.image_name ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `${IMAGE_URL}/users/${user.images.image_name}` }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <Ionicons name="person-circle-outline" size={54} color="#fff" />
          )}

          <View style={styles.userText}>
            <Text style={styles.userName}>
              {user?.full_name || `${user?.full_name || ''}`.trim() || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        {menuData.map(item => renderMenuItem(item))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          Business Suite v{Constants.expoConfig?.version || '1.0.0'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // HEADER
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  imageContainer: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userText: { marginLeft: 14 },
  userName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userEmail: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },

  // MENU
  menuContainer: { flex: 1, marginTop: 10 },
  categoryContainer: {
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  activeMenuItem: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  activeMenuText: {
    color: '#007AFF',
    fontWeight: '600'
  },
  subMenu: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },

  // FOOTER
  footer: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutText: {
    fontSize: 15,
    color: '#EF4444',
    marginLeft: 10,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    paddingHorizontal: 20,
  },
});
