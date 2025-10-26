import React, { useState, useCallback, useEffect, ReactNode } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

interface GlobalRefreshProps {
  children: ReactNode;
}

export default function GlobalRefresh({ children }: GlobalRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const { refreshAuthData, logout } = useAuth();

  // ⏱ Show refresh button after 1 minute
  useEffect(() => {
    const timer = setTimeout(() => setShowRefreshButton(true), 60000); // 60 seconds
    return () => clearTimeout(timer);
  }, [refreshing]); // Reset timer after each refresh

  // 🔃 Simple refresh function
  const reloadApp = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAuthData(); // reload user info only
      console.log("✅ User and auth data refreshed");
      setShowRefreshButton(false); // hide button until next timer
    } catch (err: any) {
      console.error("Global refresh error:", err);
      if (err.response?.status === 401) logout();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return (
    <View style={styles.container}>
      {/* App content */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Floating refresh button */}
      {showRefreshButton && !refreshing && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={reloadApp}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Loading overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
  },
  refreshButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#007AFF",
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});
