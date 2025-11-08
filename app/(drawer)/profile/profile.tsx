import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function UserProfileScreen() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_URL;

  const { token, user: authUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && authUser?.id) {
      fetchUser(authUser.id);
    }
  }, [token, authUser]);

  const fetchUser = async (userId: number | string) => {
    try {
      const res = await axios.get(`${API_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      setError('Failed to load user profile.');
    } finally {
      setLoading(false);
    }
  };
    
  // Show global loader until data fetched
  if (loading) return <LoadingScreen />;
  
  if (error || !user) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'User not found.'}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            {user?.images?.image_name ? (
              <Image
                source={{ uri: `${IMAGE_URL}/users/${user.images.image_name}` }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
            <View style={[styles.statusBadge, 
              user.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={styles.statusText}>{user.status}</Text>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.full_name}</Text>
            <Text style={styles.userUsername}>@{user.username}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            
            <View style={styles.companyBadge}>
              <Ionicons name="business-outline" size={16} color="#007AFF" />
              <Text style={styles.companyText}>{user.company_name}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={[styles.detailValue]}>{user.full_name}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="at-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={[styles.detailValue]}>{user.username}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={[styles.detailValue]}>{user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not set'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact & Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Contact & Location</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={[styles.detailValue]}>{user.email || '-'}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="call-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={[styles.detailValue]}>{user.phone_number || '-'}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="location-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>City</Text>
                <Text style={[styles.detailValue]}>{user.city_name || '-'}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="home-outline" size={18} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={[styles.detailValue]}>{user.address || '-'}</Text>
              </View>
            </View>
            
            {/* 
            <DetailItem 
              icon="location-outline" 
              label="City" 
              value={user.city_name || user.city?.name} 
            />
            {user.address && (
              <DetailItem 
                icon="home-outline" 
                label="Address" 
                value={user.address} 
                multiline
              />
            )} */}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/profile/edit-profile')}
          >
            <Ionicons name="person-outline" size={18} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/profile/change-password')}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ==============================
  // LAYOUT & CONTAINER STYLES
  // ==============================
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  container: {
    flex: 1,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  
  heroCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
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
  
  sectionContent: {
    gap: 12,
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 8,
  },

  // ==============================
  // TYPOGRAPHY STYLES
  // ==============================
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
  
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  userUsername: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  
  companyText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // ==============================
  // BUTTON & INTERACTIVE STYLES
  // ==============================
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
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

  // ==============================
  // AVATAR & IMAGE STYLES
  // ==============================
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },

  // ==============================
  // BADGE & STATUS STYLES
  // ==============================
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  activeBadge: {
    backgroundColor: '#6B7280',
  },
  
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },

  // ==============================
  // LAYOUT & GRID STYLES
  // ==============================
  profileInfo: {
    alignItems: 'center',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
});