// app/(drawer)/_layout.tsx
import React from "react";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StatusBar, Platform } from "react-native";
import DrawerContent from "../components/DrawerContent";
import Header from "../components/Header";

export default function DrawerLayout() {
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
        <Drawer
          screenOptions={{
            headerShown: true,
            header: () => <Header />,
            drawerStyle: {
              width: 320,
            },
            swipeEnabled: true,
            swipeEdgeWidth: 50,
            drawerType: "front",
            overlayColor: "rgba(0,0,0,0.5)",
          }}
          drawerContent={(props) => <DrawerContent {...props} />}
        >
          <Drawer.Screen
            name="dashboard"
            options={{
              drawerLabel: "Dashboard",
              title: "Dashboard",
            }}
          />
          <Drawer.Screen
            name="companies"
            options={{
              drawerLabel: "Companies",
              title: "Companies",
            }}
          />
          <Drawer.Screen name="invoices" options={{ drawerLabel: "Invoices" }} />
          <Drawer.Screen name="invoices/add" options={{ drawerLabel: "Add Invoice" }} />
          <Drawer.Screen name="invoices/returns" options={{ drawerLabel: "Invoice Returns" }} />
          <Drawer.Screen name="products" options={{ drawerLabel: "Products" }} />
          <Drawer.Screen name="products/add" options={{ drawerLabel: "Add Product" }} />
          <Drawer.Screen name="products/categories" options={{ drawerLabel: "Categories" }} />
          <Drawer.Screen name="products/brands" options={{ drawerLabel: "Brands" }} />
          <Drawer.Screen name="products/units" options={{ drawerLabel: "Units" }} />
          <Drawer.Screen name="products/stocks" options={{ drawerLabel: "Stocks" }} />
          <Drawer.Screen name="customers" options={{ drawerLabel: "Customers" }} />
          <Drawer.Screen name="banks" options={{ drawerLabel: "Banks" }} />
          <Drawer.Screen name="cities" options={{ drawerLabel: "Cities" }} />
          <Drawer.Screen name="reports/customers" options={{ drawerLabel: "Customer Reports" }} />
          <Drawer.Screen name="settings" options={{ drawerLabel: "Settings" }} />
        </Drawer>
      </View>
    </GestureHandlerRootView>
  );
}
