/**
 * Orders Screen
 *
 * View and pick orders assigned to this picker
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getPickerOrders, Order } from "../lib/api";
import { sendToPrinter } from "../lib/printer";
import { generateBagLabel, generateToteLabel } from "../lib/labels";

type RootStackParamList = {
  Home: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
};

interface OrdersScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Orders">;
}

export function OrdersScreen({ navigation }: OrdersScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const result = await getPickerOrders();
      setOrders(result.orders);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handlePrintBagLabel = async (order: Order) => {
    // Create sample bag label data
    const customerName = order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : "Customer";

    const items = order.items.map((item) => item.title);

    const zpl = generateBagLabel({
      customerName,
      items,
      bagNumber: 1,
      totalBags: 1,
      bagId: `BAG-${order.display_id}-1`,
      temperatureZone: "ambient",
      orderId: order.id,
    });

    const result = await sendToPrinter(zpl);

    if (result.success) {
      Alert.alert("Success", "Bag label printed");
    } else {
      Alert.alert("Error", result.message);
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{order.display_id}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                order.status === "pending" ? "#f39c12" : "#2ecc71",
            },
          ]}
        >
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      {order.customer && (
        <Text style={styles.customerName}>
          {order.customer.first_name} {order.customer.last_name}
        </Text>
      )}

      <Text style={styles.itemCount}>{order.items.length} items</Text>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.printButton}
          onPress={() => handlePrintBagLabel(order)}
        >
          <Text style={styles.printButtonText}>🏷️ Print Bag Label</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <View style={{ width: 50 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Orders</Text>
          <Text style={styles.emptySubtitle}>
            No orders are currently assigned for picking
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(order) => order.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    color: "#3498db",
    fontSize: 16,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 16,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  orderCard: {
    backgroundColor: "#2d2d44",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  customerName: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 4,
  },
  itemCount: {
    color: "#888",
    fontSize: 14,
    marginBottom: 16,
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: "#3d3d5c",
    paddingTop: 16,
  },
  printButton: {
    backgroundColor: "#2ecc71",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});

export default OrdersScreen;

