/**
 * Home Screen
 *
 * Main dashboard showing scanner options
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { getScannerStatus, ScannerStatus } from "../lib/api";
import { checkPrinterConnection } from "../lib/printer";

type RootStackParamList = {
  Home: undefined;
  InventoryScan: undefined;
  Orders: undefined;
  Settings: undefined;
};

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus | null>(null);
  const [printerConnected, setPrinterConnected] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadStatus = async () => {
    try {
      const [status, printerStatus] = await Promise.all([
        getScannerStatus().catch(() => null),
        checkPrinterConnection().catch(() => ({ connected: false })),
      ]);
      setScannerStatus(status);
      setPrinterConnected(printerStatus.connected);
    } catch (error) {
      console.error("Error loading status:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {user?.email?.split("@")[0] || "Scanner"}
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Status Cards */}
      <View style={styles.statusRow}>
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: scannerStatus ? "#2ecc71" : "#e74c3c" },
            ]}
          />
          <Text style={styles.statusLabel}>API</Text>
        </View>
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: printerConnected ? "#2ecc71" : "#e74c3c" },
            ]}
          />
          <Text style={styles.statusLabel}>Printer</Text>
        </View>
      </View>

      {/* Main Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#3498db" }]}
          onPress={() => navigation.navigate("InventoryScan")}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionTitle}>Inventory Scan</Text>
          <Text style={styles.actionSubtitle}>Look up products, adjust stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#9b59b6" }]}
          onPress={() => navigation.navigate("Orders")}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionTitle}>Order Picking</Text>
          <Text style={styles.actionSubtitle}>View and pick orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#e67e22" }]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionTitle}>Settings</Text>
          <Text style={styles.actionSubtitle}>Printer, server configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <Text style={styles.version}>
        Scanner v1.0.0 {scannerStatus ? `• API v${scannerStatus.version}` : ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  logout: {
    fontSize: 16,
    color: "#e74c3c",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2d2d44",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  actions: {
    gap: 16,
  },
  actionCard: {
    borderRadius: 16,
    padding: 24,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  version: {
    textAlign: "center",
    color: "#666",
    marginTop: 32,
    fontSize: 12,
  },
});

export default HomeScreen;

