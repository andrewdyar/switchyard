/**
 * Labels Library
 *
 * ZPL label generation and printing utilities for Zebra printers
 *
 * Usage:
 * ```typescript
 * import {
 *   generateBagLabel,
 *   generateToteLabel,
 *   generateShelfLabel,
 *   sendToPrinter,
 * } from "@switchyard/switchyard/lib/labels";
 *
 * // Generate and print a bag label
 * const zpl = generateBagLabel({
 *   customerFirstName: "John",
 *   customerLastName: "Smith",
 *   items: [
 *     { name: "Milk", quantity: 2 },
 *     { name: "Eggs", quantity: 1 },
 *   ],
 *   bagNumber: 1,
 *   totalBags: 2,
 *   bagId: "BAG-001",
 *   temperatureZone: "chilled",
 * });
 *
 * // Generate a slot location label
 * const slotZpl = generateShelfLabel({
 *   locationCode: "A01-08-1-05",
 *   zone: "A",
 *   aisle: 1,
 *   bay: 8,
 *   shelf: 1,
 *   slot: 5,
 * });
 *
 * await sendToPrinter(zpl);
 * ```
 */

// Types
export type {
  BagLabelData,
  BagItem,
  ToteLabelData,
  ShelfLabelData,
  SlotLabelData,
  TemperatureZone,
  WarehouseZone,
  PrinterConfig,
  LabelDimensions,
} from "./types";

export { LABEL_SIZES, inchesToDots, ZONE_NAMES } from "./types";

// Label generators
export {
  generateBagLabel,
  generateBagLabelWithOptions,
  EXAMPLE_BAG_LABEL_DATA,
} from "./bag-label";

export {
  generateToteLabel,
  generateToteLabels,
  EXAMPLE_TOTE_LABEL_DATA,
  TOTE_LABEL_TEMPLATE_ZPL,
} from "./tote-label";

export {
  generateShelfLabel,
  generateShelfLabels,
  parseLocationCode,
  EXAMPLE_SHELF_LABEL_DATA,
  SHELF_LABEL_TEMPLATE_ZPL,
} from "./shelf-label";

// Logo
export {
  getLogoZPL,
  getLogoDownloadZPL,
  LOGO_SIMPLIFIED_ZPL,
  LOGO_PRINT_COMMAND,
} from "./logo";

// Printer utilities
export {
  sendToPrinter,
  checkPrinterConnection,
  sendTestPrint,
  DEFAULT_PRINTER_CONFIG,
} from "./printer";

export type { PrintResult } from "./printer";
