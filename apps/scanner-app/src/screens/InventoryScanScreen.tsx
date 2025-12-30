/**
 * Inventory Scan Screen
 *
 * Scan products, look up inventory, print shelf labels
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useScanner } from "../lib/datawedge";
import { lookupProduct, ProductLookupResult } from "../lib/api";
import { sendToPrinter } from "../lib/printer";
import { generateShelfLabel } from "../lib/labels";

type RootStackParamList = {
  Home: undefined;
  InventoryScan: undefined;
};

interface InventoryScanScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "InventoryScan">;
}

export function InventoryScanScreen({ navigation }: InventoryScanScreenProps) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    if (!barcode || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const lookupResult = await lookupProduct(barcode);
      setResult(lookupResult);
    } catch (err: any) {
      setError(err.message || "Failed to look up product");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Use DataWedge scanner
  const { lastScan, clearLastScan } = useScanner({
    onScan: handleBarcodeScan,
    enabled: true,
  });

  // Manual barcode entry
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      handleBarcodeScan(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  // Print shelf label
  const handlePrintShelfLabel = async () => {
    if (!result?.product) return;

    const upc = result.barcode;
    const productName = result.product.title;
    const location = "N/A"; // Would come from inventory metadata

    const zpl = generateShelfLabel({
      productName,
      upc,
      location,
    });

    const printResult = await sendToPrinter(zpl);

    if (printResult.success) {
      Alert.alert("Success", "Shelf label printed");
    } else {
      Alert.alert("Error", printResult.message);
    }
  };

  // Clear current result
  const handleClear = () => {
    setResult(null);
    setError(null);
    clearLastScan();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inventory Scan</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Manual Entry */}
      <View style={styles.manualEntry}>
        <TextInput
          style={styles.input}
          placeholder="Enter barcode manually..."
          placeholderTextColor="#888"
          value={manualBarcode}
          onChangeText={setManualBarcode}
          onSubmitEditing={handleManualSubmit}
          returnKeyType="search"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleManualSubmit}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Scan Status */}
      <View style={styles.scanStatus}>
        <View style={styles.scanIndicator}>
          <View style={[styles.scanDot, { backgroundColor: loading ? "#f39c12" : "#2ecc71" }]} />
          <Text style={styles.scanText}>
            {loading ? "Looking up..." : "Ready to scan"}
          </Text>
        </View>
        {lastScan && (
          <Text style={styles.lastScan}>Last: {lastScan.data}</Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            {/* Product Info */}
            {result.product ? (
              <>
                <View style={styles.productHeader}>
                  {result.product.thumbnail && (
                    <Image
                      source={{ uri: result.product.thumbnail }}
                      style={styles.thumbnail}
                    />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{result.product.title}</Text>
                    <Text style={styles.barcode}>{result.barcode}</Text>
                  </View>
                </View>

                {/* Inventory Info */}
                {result.inventory ? (
                  <View style={styles.inventoryInfo}>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>In Stock:</Text>
                      <Text style={styles.inventoryValue}>
                        {result.inventory.stocked_quantity}
                      </Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>Reserved:</Text>
                      <Text style={styles.inventoryValue}>
                        {result.inventory.reserved_quantity}
                      </Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>Available:</Text>
                      <Text
                        style={[
                          styles.inventoryValue,
                          {
                            color:
                              result.inventory.available_quantity > 0
                                ? "#2ecc71"
                                : "#e74c3c",
                          },
                        ]}
                      >
                        {result.inventory.available_quantity}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noInventory}>No inventory at this location</Text>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handlePrintShelfLabel}
                  >
                    <Text style={styles.actionButtonText}>🏷️ Print Shelf Label</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={handleClear}
                  >
                    <Text style={styles.secondaryButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.notFound}>
                <Text style={styles.notFoundText}>Product not found</Text>
                <Text style={styles.barcode}>{result.barcode}</Text>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={styles.clearText}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {!result && !error && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>Scan a Barcode</Text>
            <Text style={styles.emptySubtitle}>
              Point the scanner at a product barcode or enter it manually above
            </Text>
          </View>
        )}
      </ScrollView>
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
  manualEntry: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#2d2d44",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
  },
  searchButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  scanStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  scanIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scanText: {
    color: "#888",
    fontSize: 14,
  },
  lastScan: {
    color: "#666",
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorCard: {
    backgroundColor: "#4a1c1c",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 16,
  },
  clearText: {
    color: "#3498db",
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: "#2d2d44",
    borderRadius: 16,
    padding: 20,
  },
  productHeader: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#3d3d5c",
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  barcode: {
    color: "#888",
    fontSize: 14,
    fontFamily: "monospace",
  },
  inventoryInfo: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inventoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inventoryLabel: {
    color: "#888",
    fontSize: 16,
  },
  inventoryValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noInventory: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: "#2ecc71",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3d3d5c",
  },
  secondaryButtonText: {
    color: "#888",
    fontSize: 16,
  },
  notFound: {
    alignItems: "center",
    padding: 20,
  },
  notFoundText: {
    color: "#e74c3c",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyState: {
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

export default InventoryScanScreen;

