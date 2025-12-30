import { z } from "zod";

/**
 * Bag item with quantity
 */
export const BagItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(999),
});

/**
 * Bag label print request validation
 */
export const AdminPrintBagLabel = z.object({
  customerFirstName: z.string().min(1).max(50),
  customerLastName: z.string().max(50).optional(),
  items: z.array(
    z.union([
      z.string(), // Legacy: just item name
      BagItemSchema, // New: item with quantity
    ])
  ).min(1).max(50),
  bagNumber: z.number().int().min(1),
  totalBags: z.number().int().min(1),
  bagId: z.string().min(1).max(50),
  temperatureZone: z.enum(["ambient", "chilled", "frozen"]).default("ambient"),
  orderId: z.string().optional(),
});

export type AdminPrintBagLabelType = z.infer<typeof AdminPrintBagLabel>;

/**
 * Tote label print request validation
 */
export const AdminPrintToteLabel = z.object({
  toteId: z.string().min(1).max(50),
  toteNumber: z.string().min(1).max(20),
});

export type AdminPrintToteLabelType = z.infer<typeof AdminPrintToteLabel>;

/**
 * Slot location label print request validation
 */
export const AdminPrintSlotLabel = z.object({
  locationCode: z.string().min(1).max(20),
  zone: z.enum(["A", "R", "F"]),
  aisle: z.number().int().min(1).max(99),
  bay: z.number().int().min(1).max(99),
  shelf: z.number().int().min(1).max(99),
  slot: z.number().int().min(1).max(99),
});

export type AdminPrintSlotLabelType = z.infer<typeof AdminPrintSlotLabel>;

/**
 * @deprecated Use AdminPrintSlotLabel instead
 * Legacy shelf label for product labels (no longer used)
 */
export const AdminPrintShelfLabel = z.object({
  productName: z.string().min(1).max(100),
  upc: z.string().min(1).max(20),
  location: z.string().min(1).max(20),
});

export type AdminPrintShelfLabelType = z.infer<typeof AdminPrintShelfLabel>;

/**
 * Batch print request validation
 */
export const AdminPrintBagLabelBatch = z.object({
  labels: z.array(AdminPrintBagLabel).min(1).max(50),
});

export const AdminPrintToteLabelBatch = z.object({
  labels: z.array(AdminPrintToteLabel).min(1).max(50),
});

export const AdminPrintSlotLabelBatch = z.object({
  labels: z.array(AdminPrintSlotLabel).min(1).max(100),
});

/**
 * @deprecated Use AdminPrintSlotLabelBatch instead
 */
export const AdminPrintShelfLabelBatch = z.object({
  labels: z.array(AdminPrintShelfLabel).min(1).max(50),
});

/**
 * Printer configuration override (optional)
 */
export const PrinterConfigOverride = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
}).optional();

/**
 * Preview request (returns ZPL instead of printing)
 */
export const AdminPreviewLabel = z.object({
  type: z.enum(["bag", "tote", "slot", "shelf"]),
  data: z.any(), // Validated separately based on type
});
