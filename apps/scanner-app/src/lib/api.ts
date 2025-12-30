/**
 * API Client for Scanner App
 *
 * Communicates with the Switchyard Scanner API
 */

import { supabase } from "./supabase";
import config from "../config";

/**
 * Make an authenticated API request
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const url = `${config.api.baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ==============================================
// Scanner API Types
// ==============================================

export interface ScannerStatus {
  status: string;
  version: string;
  features: {
    inventory_scan: boolean;
    barcode_lookup: boolean;
    location_tracking: boolean;
    fefo_fifo_picking: boolean;
    inventory_receiving: boolean;
  };
}

export interface ProductLookupResult {
  success: boolean;
  barcode: string;
  product?: {
    id: string;
    title: string;
    handle: string;
    thumbnail?: string;
  };
  inventory?: {
    stocked_quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    location_id: string;
  };
  scanned_at: string;
  error?: string;
}

export interface ScanResult {
  success: boolean;
  barcode: string;
  product?: {
    id: string;
    title: string;
    handle: string;
    thumbnail?: string;
  };
  inventory?: {
    stocked_quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    location_id: string;
  };
  scanned_at: string;
  scanned_by?: string;
  error?: string;
}

export interface Order {
  id: string;
  display_id: number;
  status: string;
  customer?: {
    first_name: string;
    last_name: string;
  };
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  variant?: {
    sku: string;
    barcode?: string;
  };
}

// ==============================================
// Scanner API Functions
// ==============================================

/**
 * Check scanner API status
 */
export async function getScannerStatus(): Promise<ScannerStatus> {
  return fetchWithAuth<ScannerStatus>("/scanner");
}

/**
 * Look up a product by barcode
 */
export async function lookupProduct(
  barcode: string,
  locationId?: string
): Promise<ProductLookupResult> {
  const params = new URLSearchParams({ barcode });
  if (locationId) {
    params.append("location_id", locationId);
  }
  return fetchWithAuth<ProductLookupResult>(`/scanner/inventory/lookup?${params}`);
}

/**
 * Process an inventory scan
 */
export async function scanInventory(
  barcode: string,
  locationId?: string,
  quantity?: number,
  action: "lookup" | "adjust" | "count" = "lookup"
): Promise<ScanResult> {
  return fetchWithAuth<ScanResult>("/scanner/inventory/scan", {
    method: "POST",
    body: JSON.stringify({
      barcode,
      location_id: locationId,
      quantity,
      action,
    }),
  });
}

/**
 * Get orders assigned for picking
 */
export async function getPickerOrders(): Promise<{ orders: Order[] }> {
  return fetchWithAuth<{ orders: Order[] }>("/scanner/orders");
}

/**
 * Get order details
 */
export async function getOrderDetails(orderId: string): Promise<Order> {
  return fetchWithAuth<Order>(`/scanner/orders/${orderId}`);
}

