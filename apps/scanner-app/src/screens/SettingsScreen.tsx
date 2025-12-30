/**
 * Settings Screen
 *
 * Configure printer, server, and app settings
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { checkPrinterConnection, sendTestPrint } from "../lib/printer";
import config from "../config";

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

interface SettingsScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Settings">;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [printerHost, setPrinterHost] = useState(config.printer.host);
  const [printerPort, setPrinterPort] = useState(config.printer.port.toString());
  const [apiUrl, setApiUrl] = useState(config.api.baseUrl);
  const [printerStatus, setPrinterStatus] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  // Check printer status on mount
  useEffect(() => {
    handleCheckPrinter();
  }, []);

  const handleCheckPrinter = async () => {
    setTesting(true);
    const status = await checkPrinterConnection(printerHost, parseInt(printerPort));
    setPrinterStatus(status);
    setTesting(false);
  };

  const handleTestPrint = async () => {
    setTesting(true);
    const result = await sendTestPrint(printerHost, parseInt(printerPort));
    setTesting(false);

    if (result.success) {
      Alert.alert("Success", "Test label sent to printer");
    } else {
      Alert.alert("Error", result.message);
    }
  };

  const handleSaveSettings = () => {
    // In a real app, save to AsyncStorage
    Alert.alert("Settings Saved", "Settings have been updated");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={handleSaveSettings}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Printer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer</Text>

          <View style={styles.field}>
            <Text style={styles.label}>IP Address</Text>
            <TextInput
              style={styles.input}
              value={printerHost}
              onChangeText={setPrinterHost}
              placeholder="192.168.1.100"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={printerPort}
              onChangeText={setPrinterPort}
              placeholder="9100"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>

          {/* Printer Status */}
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusValue}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: printerStatus?.connected
                      ? "#2ecc71"
                      : "#e74c3c",
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {printerStatus?.connected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>

          {/* Printer Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCheckPrinter}
              disabled={testing}
            >
              <Text style={styles.actionButtonText}>
                {testing ? "Checking..." : "Check Connection"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleTestPrint}
              disabled={testing}
            >
              <Text style={styles.primaryButtonText}>
                {testing ? "Printing..." : "Print Test Label"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server</Text>

          <View style={styles.field}>
            <Text style={styles.label}>API URL</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://localhost:9000"
              placeholderTextColor="#888"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* DataWedge Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DataWedge</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Intent Action:</Text>
            <Text style={styles.infoValue}>{config.dataWedge.intentAction}</Text>
          </View>

          <Text style={styles.hint}>
            Configure DataWedge on the scanner to broadcast to this intent action.
            Create a profile with Intent Output enabled.
          </Text>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Build:</Text>
            <Text style={styles.infoValue}>2024.1</Text>
          </View>
        </View>
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
  saveButton: {
    color: "#2ecc71",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: "#2d2d44",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#3d3d5c",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: "#3d3d5c",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#2ecc71",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "monospace",
  },
  hint: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
});

export default SettingsScreen;

