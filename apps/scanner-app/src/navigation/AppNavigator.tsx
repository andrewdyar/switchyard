/**
 * App Navigator
 *
 * Main navigation structure for the scanner app
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  HomeScreen,
  InventoryScanScreen,
  OrdersScreen,
  SettingsScreen,
} from "../screens";

export type RootStackParamList = {
  Home: undefined;
  InventoryScan: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#1a1a2e" },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="InventoryScan" component={InventoryScanScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;

