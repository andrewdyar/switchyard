/**
 * DataWedge Integration for Zebra TC58
 *
 * DataWedge is Zebra's built-in barcode scanning service.
 * It broadcasts scanned barcodes as Android intents.
 *
 * Configuration:
 * 1. Open DataWedge app on TC58
 * 2. Create a new profile for "com.goodsgrocery.scanner"
 * 3. Enable Barcode Input
 * 4. Configure Intent Output:
 *    - Intent Action: com.goodsgrocery.scanner.SCAN
 *    - Intent Category: android.intent.category.DEFAULT
 *    - Intent Delivery: Broadcast Intent
 *    - Extra Data: com.symbol.datawedge.data_string
 */

import { NativeEventEmitter, NativeModules, DeviceEventEmitter, Platform } from "react-native";
import config from "../config";

// DataWedge intent extra keys
const DATAWEDGE_EXTRAS = {
  DATA_STRING: "com.symbol.datawedge.data_string",
  LABEL_TYPE: "com.symbol.datawedge.label_type",
  SOURCE: "com.symbol.datawedge.source",
  DECODE_DATA: "com.symbol.datawedge.decode_data",
};

export interface ScanEvent {
  data: string;
  labelType?: string;
  source?: string;
  timestamp: Date;
}

type ScanCallback = (event: ScanEvent) => void;

let scanListeners: ScanCallback[] = [];
let isListening = false;

/**
 * Start listening for DataWedge scan events
 */
export function startScanListener(): void {
  if (isListening || Platform.OS !== "android") {
    return;
  }

  DeviceEventEmitter.addListener(config.dataWedge.intentAction, (intent: any) => {
    if (!intent) return;

    const scanEvent: ScanEvent = {
      data: intent[DATAWEDGE_EXTRAS.DATA_STRING] || "",
      labelType: intent[DATAWEDGE_EXTRAS.LABEL_TYPE],
      source: intent[DATAWEDGE_EXTRAS.SOURCE],
      timestamp: new Date(),
    };

    // Notify all registered listeners
    scanListeners.forEach((callback) => {
      try {
        callback(scanEvent);
      } catch (error) {
        console.error("Error in scan listener:", error);
      }
    });
  });

  isListening = true;
}

/**
 * Stop listening for DataWedge scan events
 */
export function stopScanListener(): void {
  if (!isListening || Platform.OS !== "android") {
    return;
  }

  DeviceEventEmitter.removeAllListeners(config.dataWedge.intentAction);
  isListening = false;
}

/**
 * Register a callback to receive scan events
 * @returns Unsubscribe function
 */
export function onScan(callback: ScanCallback): () => void {
  scanListeners.push(callback);

  // Start listening if not already
  startScanListener();

  // Return unsubscribe function
  return () => {
    scanListeners = scanListeners.filter((cb) => cb !== callback);
  };
}

/**
 * React hook for using barcode scanner
 */
import { useState, useEffect, useCallback } from "react";

export interface UseScannerOptions {
  onScan?: (data: string) => void;
  enabled?: boolean;
}

export interface UseScannerResult {
  lastScan: ScanEvent | null;
  isListening: boolean;
  clearLastScan: () => void;
}

export function useScanner(options: UseScannerOptions = {}): UseScannerResult {
  const { onScan: onScanCallback, enabled = true } = options;
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onScan((event) => {
      setLastScan(event);
      onScanCallback?.(event.data);
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, onScanCallback]);

  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  return {
    lastScan,
    isListening: enabled && isListening,
    clearLastScan,
  };
}

/**
 * Send a command to DataWedge (for configuration)
 * Note: This requires the IntentWrapper module which may need to be implemented
 * as a native module if not available
 */
export function sendDataWedgeCommand(
  command: string,
  extraName: string,
  extraValue: string | boolean
): void {
  if (Platform.OS !== "android") {
    console.warn("DataWedge is only available on Android");
    return;
  }

  // This would typically use a native module to send intents
  // For now, we log the command
  console.log("DataWedge command:", { command, extraName, extraValue });
}

/**
 * Trigger a soft scan (simulates pressing the scan button)
 */
export function triggerSoftScan(): void {
  sendDataWedgeCommand(
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER",
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER",
    "START_SCANNING"
  );
}

