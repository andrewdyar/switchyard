/**
 * Slot Location Label ZPL Generator
 *
 * Generates ZPL code for warehouse slot location labels
 * Size: 2.5" wide x 1.25" tall
 * Media: Continuous non-adhesive paper
 *
 * Layout:
 * - Left side: AISLE, BAY, SHELF stacked
 * - Right side: Large SLOT number
 * - Bottom: Wide barcode with location code
 */

import { inchesToDots } from "./types";

// Label dimensions at 203 DPI
const DPI = 203;
const LABEL_WIDTH = inchesToDots(2.5, DPI); // 508 dots
const LABEL_HEIGHT = inchesToDots(1.25, DPI); // 254 dots

// Content positioning
const MARGIN_X = 8;
const MARGIN_Y = 5;

/**
 * Temperature zone type for the slot
 */
export type WarehouseZone = "A" | "R" | "F";

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
 * Format number with leading zero if needed
 */
function padNumber(num: number, digits: number = 2): string {
  return num.toString().padStart(digits, "0");
}

/**
 * Generate slot location label ZPL
 */
export function generateShelfLabel(data: SlotLabelData): string {
  const lines: string[] = [];

  // Start label format
  lines.push("^XA");

  // Set character encoding to UTF-8
  lines.push("^CI28");

  // Set print width and label length
  lines.push(`^PW${LABEL_WIDTH}`);
  lines.push(`^LL${LABEL_HEIGHT}`);

  // Set continuous media mode (for non-adhesive paper roll)
  lines.push("^MNY");

  // Set label home position
  lines.push("^LH0,0");

  // LEFT SIDE: Aisle, Bay, Shelf info
  const leftX = MARGIN_X;
  let leftY = MARGIN_Y;

  // Aisle
  lines.push(`^FO${leftX},${leftY}^A0N,22,22^FDAISLE ${padNumber(data.aisle)}^FS`);
  leftY += 28;

  // Bay
  lines.push(`^FO${leftX},${leftY}^A0N,22,22^FDBAY ${padNumber(data.bay)}^FS`);
  leftY += 28;

  // Shelf
  lines.push(`^FO${leftX},${leftY}^A0N,22,22^FDSHELF ${data.shelf}^FS`);
  leftY += 28;

  // Location code
  lines.push(`^FO${leftX},${leftY}^A0N,20,20^FD${data.locationCode}^FS`);

  // RIGHT SIDE: Large SLOT number
  const slotX = 280;
  const slotY = MARGIN_Y;

  // "SLOT" label
  lines.push(`^FO${slotX},${slotY}^A0N,28,28^FDSLOT^FS`);

  // Large slot number
  lines.push(`^FO${slotX},${slotY + 35}^A0N,80,80^FD${padNumber(data.slot)}^FS`);

  // BOTTOM: Wide barcode with location code
  const barcodeY = LABEL_HEIGHT - 70;
  const barcodeHeight = 55;

  // Barcode spanning most of the width
  lines.push(`^FO${MARGIN_X},${barcodeY}^BY2.5,3,${barcodeHeight}`);
  lines.push(`^BCN,${barcodeHeight},Y,N,N`);
  lines.push(`^FD${data.locationCode}^FS`);

  // End label format
  lines.push("^XZ");

  return lines.join("\n");
}

/**
 * Generate multiple slot labels (for batch printing)
 */
export function generateShelfLabels(slots: SlotLabelData[]): string {
  return slots.map((slot) => generateShelfLabel(slot)).join("\n");
}

/**
 * Parse a location code into components
 */
export function parseLocationCode(locationCode: string): SlotLabelData | null {
  // Format: A01-08-1-05 (Zone+Aisle-Bay-Shelf-Slot)
  const match = locationCode.match(/^([ARF])(\d{2})-(\d{2})-(\d+)-(\d{2})$/);
  if (!match) return null;

  return {
    locationCode,
    zone: match[1] as WarehouseZone,
    aisle: parseInt(match[2], 10),
    bay: parseInt(match[3], 10),
    shelf: parseInt(match[4], 10),
    slot: parseInt(match[5], 10),
  };
}

/**
 * Example usage and test data
 */
export const EXAMPLE_SHELF_LABEL_DATA: SlotLabelData = {
  locationCode: "A01-08-1-05",
  zone: "A",
  aisle: 1,
  bay: 8,
  shelf: 1,
  slot: 5,
};

/**
 * Simple ZPL for testing in Labelary
 * Copy this to labelary.com with settings: 2.5" x 1.25", 8 DPMM (203 DPI)
 */
export const SHELF_LABEL_TEMPLATE_ZPL = `^XA
^CI28
^PW508
^LL254
^MNY
^LH0,0

^FO8,5^A0N,22,22^FDAISLE 01^FS
^FO8,33^A0N,22,22^FDBAY 08^FS
^FO8,61^A0N,22,22^FDSHELF 1^FS
^FO8,89^A0N,20,20^FDA01-08-1-05^FS

^FO280,5^A0N,28,28^FDSLOT^FS
^FO280,40^A0N,80,80^FD05^FS

^FO8,184^BY2.5,3,55
^BCN,55,Y,N,N
^FDA01-08-1-05^FS

^XZ`;
