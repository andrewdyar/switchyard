/**
 * Label Types and Interfaces
 */

/**
 * Temperature zone for bag labels
 */
export type TemperatureZone = "ambient" | "chilled" | "frozen";

/**
 * Warehouse zone code
 */
export type WarehouseZone = "A" | "R" | "F";

/**
 * Item with quantity for bag labels
 */
export interface BagItem {
  /** Item name */
  name: string;
  /** Quantity of this item */
  quantity: number;
}

/**
 * Data required to generate a bag label
 */
export interface BagLabelData {
  /** Customer's first name */
  customerFirstName: string;
  /** Customer's last name (optional) */
  customerLastName?: string;
  /** List of items in the bag with quantities (ALL items shown) */
  items: Array<string | BagItem>;
  /** Current bag number (e.g., 1) */
  bagNumber: number;
  /** Total number of bags for this order */
  totalBags: number;
  /** Unique bag identifier for bottom barcode */
  bagId: string;
  /** Order ID for top barcode (optional) */
  orderId?: string;
  /** Temperature zone of the bag */
  temperatureZone?: TemperatureZone;
  /** Timestamp when bag was prepared (for "Prepared at" display) */
  preparedAt?: Date | string;
}

/**
 * Data required to generate a tote label
 */
export interface ToteLabelData {
  /** Unique tote identifier (will be encoded in QR code) */
  toteId: string;
  /** Human-readable tote number for display */
  toteNumber: string;
}

/**
 * Data required to generate a slot location label
 */
export interface SlotLabelData {
  /** Full location code (e.g., "A01-08-1-05") */
  locationCode: string;
  /** Zone code (A=Ambient, R=Refrigerated, F=Frozen) */
  zone: WarehouseZone;
  /** Aisle number */
  aisle: number;
  /** Bay number */
  bay: number;
  /** Shelf number */
  shelf: number;
  /** Slot number */
  slot: number;
}

/**
 * @deprecated Use SlotLabelData instead
 * Legacy interface for shelf labels - now slot location labels
 */
export interface ShelfLabelData {
  /** Product name (will be truncated if too long) */
  productName: string;
  /** UPC barcode number */
  upc: string;
  /** Warehouse location code (e.g., "3A-2") */
  location: string;
}

/**
 * Printer configuration
 */
export interface PrinterConfig {
  /** Printer IP address */
  host: string;
  /** Port number (default: 9100 for raw TCP) */
  port: number;
  /** Printer DPI (203 or 300) */
  dpi: 203 | 300;
}

/**
 * Label dimensions in inches
 */
export interface LabelDimensions {
  width: number;
  height: number;
}

/**
 * Predefined label sizes
 */
export const LABEL_SIZES = {
  BAG: { width: 2.5, height: 6 } as LabelDimensions,
  TOTE: { width: 3, height: 3 } as LabelDimensions,
  SLOT: { width: 2.5, height: 1.25 } as LabelDimensions,
  /** @deprecated Use SLOT instead */
  SHELF: { width: 2.5, height: 1.25 } as LabelDimensions,
} as const;

/**
 * Convert inches to dots at given DPI
 */
export function inchesToDots(inches: number, dpi: number = 203): number {
  return Math.round(inches * dpi);
}

/**
 * Zone display names
 */
export const ZONE_NAMES: Record<WarehouseZone, string> = {
  A: "Ambient",
  R: "Refrigerated",
  F: "Frozen",
};
