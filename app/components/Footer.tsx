import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Footer() {
  const navigation = useNavigation();
  const route = useRoute();

  // Use route.name as the dynamic title
  const title = route.name
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard';

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Copyright © 2025 Point of Sale. ThemeRange <Ionicons name="heart" size={18} color="#ff0000ff" /></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerText: { fontSize: 12, color: "#888" },
});
