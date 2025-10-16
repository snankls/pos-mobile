import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Redirect } from "expo-router";
import { useAuth } from './contexts/AuthContext';

export default function Dashboard() {
  const { user, initialized } = useAuth();

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>Welcome to POS Dashboard</Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#dc3545",
            padding: 12,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(drawer)/dashboard" />;
  } else {
    return <Redirect href="/login" />;
  }
}
