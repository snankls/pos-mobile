import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';

export default function Header() {
  const navigation = useNavigation();
  const [dropdownVisible, setDropdownVisible] = useState(false);

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
      <Image
        source={require('../../assets/images/favicon.png')}
        style={styles.logoImage}
      />

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
              <Text style={styles.dropdownText}>Full Name: John Doe</Text>
              <Text style={styles.dropdownText}>Email: john@example.com</Text>
              <Text style={styles.dropdownText}>Pin Code: ********</Text>
              <View style={styles.pinButtonWrapper}>
                <TouchableOpacity style={styles.pinButton}>
                  <Text style={styles.pinButtonText}>Generate Pin</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dropdown Items */}
            <TouchableOpacity style={styles.dropdownItem}>
              <Ionicons name="person-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
              <Text style={styles.dropdownItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem}>
              <Ionicons name="create-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
              <Text style={styles.dropdownItemText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem}>
              <Ionicons name="lock-closed-outline" size={18} color="#007AFF" style={styles.dropdownIcon} />
              <Text style={styles.dropdownItemText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem}>
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
