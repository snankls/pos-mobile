// app/_layout.tsx
import { Stack } from "expo-router";
import { AuthProvider } from "./contexts/AuthContext";
import { View, Text, StyleSheet } from "react-native";
import { ReactNode } from "react";
import { Ionicons } from '@expo/vector-icons';

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Copyright © 2025 Point of Sale. Powered by ThemeRange <Ionicons name="heart" size={18} color="#ff0000ff" /></Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(drawer)" />
        </Stack>
      </AppLayout>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 },
  footer: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerText: { fontSize: 12, color: "#888" },
});
