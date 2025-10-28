// app/_layout.tsx
import { Slot } from "expo-router";
import { AuthProvider } from "./contexts/AuthContext";
import { View, StyleSheet } from "react-native";
import Footer from "./components/Footer";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          <Slot /> {/* This renders nested layouts like auth/_layout.tsx */}
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
