import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="business-outline" size={50} color="#007AFF" />
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>This is the Settings page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#007AFF',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
  },
});
