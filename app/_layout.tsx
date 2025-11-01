// app/_layout.tsx
import { Slot } from "expo-router";
import { View, StyleSheet } from "react-native";
import Footer from "./components/Footer";
import { AuthProvider } from "./contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          <Slot />
        </View>
        <Footer />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 },
});
