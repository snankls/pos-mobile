// app/pages/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StatusBar, Platform } from "react-native";
import Header from ".././../components/Header";

export default function PagesLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          backgroundColor: "#fff",
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <Stack
          screenOptions={{
            headerShown: true,
            header: () => <Header />,
            contentStyle: { backgroundColor: "#fff" },
          }}
        >
          <Stack.Screen
            name="change-password"
            options={{ title: "Change Password" }}
          />
        </Stack>
      </View>
    </GestureHandlerRootView>
  );
}
