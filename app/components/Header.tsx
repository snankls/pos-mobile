import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Text,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import axios from 'axios';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  full_name?: string;
  username?: string;
  email: string;
  pin_code?: string;
  images?: {
    image_name?: string;
  };
}

export default function Header() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const navigation = useNavigation();
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinVisible, setPinVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch current user from API on load
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API_URL}/current-user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        
        setCurrentUser(response.data.data || response.data);
      } catch (err) {
        console.log('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const imageUrl = currentUser?.images?.image_name
    ? `${IMAGE_URL}/users/${currentUser.images.image_name}`
    : null;

  // Generate PIN
  const generatePin = async () => {
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_URL}/users/generate-pin`,
        {},
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      setCurrentUser((prev) => prev ? { ...prev, pin_code: response.data.pin_code } : prev);
      setPinVisible(true);
    } catch (err) {
      console.error('Failed to generate pin:', err);
      alert('Failed to generate pin.');
    }
  };

  return (
    <View style={styles.header}>
      {/* Hamburger menu */}
      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.menuButton}
      >
        <Ionicons name="menu-outline" size={28} color="#000" />
      </TouchableOpacity>

      {/* Logo */}
      <TouchableOpacity
        onPress={() => router.push('/(drawer)/dashboard')}
      >
        <Image
          source={require('../../assets/images/favicon.png')}
          style={styles.logoImage}
        />
      </TouchableOpacity>

      {/* User icon */}
      <TouchableOpacity onPress={() => setDropdownVisible(true)}>
        <Ionicons name="person-circle-outline" size={28} color="#000" />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setDropdownVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.dropdownContainer}>
              {/* User Info */}
              <View style={styles.dropdownContent}>
                <View style={styles.avatarWrapper}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                <Text style={styles.dropdownText}>
                  {loading ? 'Loading...' : currentUser?.full_name || 'User'}
                </Text>
                <Text style={styles.dropdownText}>
                  {currentUser?.email || 'user@example.com'}
                </Text>

                {/* PIN display */}
                <Text style={styles.dropdownText}>
                  Pin Code:{' '}
                  {pinVisible
                    ? currentUser?.pin_code || 'Not Set'
                    : '********'}{' '}
                  <Ionicons
                    name={pinVisible ? 'eye-off' : 'eye'}
                    size={18}
                    color="#007AFF"
                    style={styles.dropdownIcon}
                    onPress={() => setPinVisible(!pinVisible)}
                  />
                </Text>

                <View style={styles.pinButtonWrapper}>
                  <TouchableOpacity
                    style={styles.pinButton}
                    onPress={generatePin}
                  >
                    <Text style={styles.pinButtonText}>Generate Pin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dropdown Items */}
              <TouchableOpacity style={styles.dropdownItem} onPress={() => {router.push('/pages/profile');}}>
                <Ionicons name="person-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
                <Text style={styles.dropdownItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} onPress={() => {router.push('/pages/edit-profile');}}>
                <Ionicons name="create-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
                <Text style={styles.dropdownItemText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} onPress={() => {router.push('/pages/change-password');}}>
                <Ionicons name="lock-closed-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
                <Text style={styles.dropdownItemText}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} onPress={logout}>
                <Ionicons name="log-out-outline" size={18} color="#FF3B30" style={styles.dropdownIcon} />
                <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  menuButton: {
    padding: 4
  },
  logoImage: {
    width: 50
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingRight: 15,
  },
  dropdownContainer: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  dropdownContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    textAlign: 'center'
  },
  pinButtonWrapper: {
    alignItems: 'center',
  },
  pinButton: {
    backgroundColor: '#28a745',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownIcon: {
    marginRight: 10,
  },
});
