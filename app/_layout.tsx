// app/_layout.tsx
import { Stack } from "expo-router";
import { AuthProvider } from "./contexts/AuthContext";
import { View, Text, StyleSheet } from "react-native";
import { ReactNode } from "react";
import Footer from "./components/Footer";

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <Footer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
        </Stack>
      </AppLayout>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 },
});
