// components/GlobalRefresh.tsx
import React, { useState, useCallback, useEffect, ReactNode } from "react";
import {
  View,
  ScrollView,
  StyleSheet
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

interface GlobalRefreshProps {
  children: ReactNode;
}

export default function GlobalRefresh({ children }: GlobalRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const { refreshAuthData, logout } = useAuth();

  // Simple refresh function
  const reloadApp = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAuthData();
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
  },
});
