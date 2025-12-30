/**
 * ZPL Label Templates for Scanner App
 *
 * These are the same templates as the backend, bundled in the app for direct printing
 */

// ==============================================
// Types
// ==============================================

export type TemperatureZone = "ambient" | "chilled" | "frozen";

export interface BagLabelData {
  customerName: string;
  items: string[];
  bagNumber: number;
  totalBags: number;
  bagId: string;
  temperatureZone: TemperatureZone;
  orderId?: string;
}

export interface ToteLabelData {
  toteId: string;
  toteNumber: string;
}

export interface ShelfLabelData {
  productName: string;
  upc: string;
  location: string;
}

// ==============================================
// Constants
// ==============================================

const DPI = 203;

// Label dimensions in dots
const BAG_LABEL = {
  WIDTH: Math.round(2.5 * DPI), // 508
  HEIGHT: Math.round(6 * DPI), // 1218
  HALF_HEIGHT: Math.round(3 * DPI), // 609
};

const TOTE_LABEL = {
  WIDTH: Math.round(3 * DPI), // 609
  HEIGHT: Math.round(3 * DPI), // 609
};

const SHELF_LABEL = {
  WIDTH: Math.round(2.5 * DPI), // 508
  HEIGHT: Math.round(1.25 * DPI), // 254
};

// ==============================================
// Helper Functions
// ==============================================

function getTemperatureZoneText(zone: TemperatureZone): string {
  switch (zone) {
    case "frozen":
      return "*** FROZEN ***";
    case "chilled":
      return "~~~ CHILLED ~~~";
    case "ambient":
    default:
      return "";
  }
}

function formatItemsList(items: string[], maxLines = 4, maxChars = 30): string[] {
  const result: string[] = [];
  
  for (let i = 0; i < Math.min(items.length, maxLines); i++) {
    let item = items[i];
    if (item.length > maxChars) {
      item = item.substring(0, maxChars - 3) + "...";
    }
    result.push(item);
  }
  
  if (items.length > maxLines) {
    result.push(`+${items.length - maxLines} more items`);
  }
  
  return result;
}

function formatProductName(name: string, maxCharsPerLine = 35): string[] {
  if (name.length <= maxCharsPerLine) {
    return [name];
  }
  
  const words = name.split(" ");
  let line1 = "";
  let line2 = "";
  
  for (const word of words) {
    if ((line1 + " " + word).trim().length <= maxCharsPerLine) {
      line1 = (line1 + " " + word).trim();
    } else if ((line2 + " " + word).trim().length <= maxCharsPerLine) {
      line2 = (line2 + " " + word).trim();
    } else {
      if (line2.length > 0) {
        line2 = line2.substring(0, maxCharsPerLine - 3) + "...";
      } else {
        line2 = word.substring(0, maxCharsPerLine - 3) + "...";
      }
      break;
    }
  }
  
  return line2 ? [line1, line2] : [line1];
}

// ==============================================
// Label Generators
// ==============================================

/**
 * Generate fold-over bag label ZPL
 */
export function generateBagLabel(data: BagLabelData): string {
  const MARGIN = 20;
  const lines: string[] = [];
  
  lines.push("^XA");
  lines.push("^CI28");
  lines.push(`^PW${BAG_LABEL.WIDTH}`);
  lines.push(`^LL${BAG_LABEL.HEIGHT}`);
  lines.push("^LH0,0");
  
  // Format items
  const formattedItems = formatItemsList(data.items);
  const tempZoneText = getTemperatureZoneText(data.temperatureZone);
  
  // ----- TOP HALF (Inverted - 180° rotation) -----
  // Content positioned from top, printed upside down
  let y = BAG_LABEL.HALF_HEIGHT - MARGIN;
  
  // Customer name (inverted)
  lines.push(`^FO${MARGIN},${y - 40}^A0I,35,35^FD${data.customerName}^FS`);
  y -= 55;
  
  // Items (inverted)
  for (const item of formattedItems) {
    lines.push(`^FO${MARGIN},${y - 22}^A0I,20,20^FD- ${item}^FS`);
    y -= 25;
  }
  
  y -= 10;
  
  // Bag number (inverted)
  lines.push(`^FO${MARGIN},${y - 28}^A0I,26,26^FDBag ${data.bagNumber} of ${data.totalBags}^FS`);
  y -= 35;
  
  // Temperature zone (inverted)
  if (tempZoneText) {
    lines.push(`^FO${MARGIN},${y - 22}^A0I,20,20^FD${tempZoneText}^FS`);
    y -= 30;
  }
  
  // Barcode at top of top half (inverted)
  lines.push(`^FO${MARGIN},40^BY2,2.5,55^BCI,55,Y,N,N^FD${data.bagId}^FS`);
  
  // ----- CENTER FOLD LINE -----
  lines.push(`^FO0,${BAG_LABEL.HALF_HEIGHT}^GB${BAG_LABEL.WIDTH},2,2^FS`);
  
  // ----- BOTTOM HALF (Normal orientation) -----
  y = BAG_LABEL.HALF_HEIGHT + MARGIN;
  
  // Customer name
  lines.push(`^FO${MARGIN},${y}^A0N,35,35^FD${data.customerName}^FS`);
  y += 45;
  
  // Items
  for (const item of formattedItems) {
    lines.push(`^FO${MARGIN},${y}^A0N,20,20^FD- ${item}^FS`);
    y += 25;
  }
  
  y += 10;
  
  // Bag number
  lines.push(`^FO${MARGIN},${y}^A0N,26,26^FDBag ${data.bagNumber} of ${data.totalBags}^FS`);
  y += 35;
  
  // Temperature zone
  if (tempZoneText) {
    lines.push(`^FO${MARGIN},${y}^A0N,20,20^FD${tempZoneText}^FS`);
    y += 30;
  }
  
  // Barcode at bottom
  lines.push(`^FO${MARGIN},${BAG_LABEL.HEIGHT - 100}^BY2,2.5,55^BCN,55,Y,N,N^FD${data.bagId}^FS`);
  
  lines.push("^XZ");
  
  return lines.join("\n");
}

/**
 * Generate tote label ZPL
 */
export function generateToteLabel(data: ToteLabelData): string {
  const lines: string[] = [];
  
  lines.push("^XA");
  lines.push("^CI28");
  lines.push(`^PW${TOTE_LABEL.WIDTH}`);
  lines.push(`^LL${TOTE_LABEL.HEIGHT}`);
  lines.push("^LH0,0");
  
  // QR code centered (magnification 10 ≈ 2")
  const qrX = 104;
  const qrY = 40;
  lines.push(`^FO${qrX},${qrY}`);
  lines.push(`^BQN,2,10`);
  lines.push(`^FDQA,${data.toteId}^FS`);
  
  // Tote number text centered at bottom
  const toteText = `TOTE #${data.toteNumber}`;
  const textX = 180;
  const textY = 500;
  lines.push(`^FO${textX},${textY}`);
  lines.push(`^A0N,50,50`);
  lines.push(`^FD${toteText}^FS`);
  
  lines.push("^XZ");
  
  return lines.join("\n");
}

/**
 * Generate shelf label ZPL
 */
export function generateShelfLabel(data: ShelfLabelData): string {
  const MARGIN = 15;
  const lines: string[] = [];
  
  lines.push("^XA");
  lines.push("^CI28");
  lines.push(`^PW${SHELF_LABEL.WIDTH}`);
  lines.push(`^LL${SHELF_LABEL.HEIGHT}`);
  lines.push("^MNY"); // Continuous media mode
  lines.push("^LH0,0");
  
  let y = 10;
  
  // Product name (1-2 lines)
  const nameLines = formatProductName(data.productName);
  const fontSize = nameLines.length > 1 ? 22 : 26;
  
  for (const nameLine of nameLines) {
    lines.push(`^FO${MARGIN},${y}^A0N,${fontSize},${fontSize}^FD${nameLine}^FS`);
    y += fontSize + 4;
  }
  
  y += 5;
  
  // UPC Barcode
  lines.push(`^FO${MARGIN},${y}^BY1.5,2.5,45^BCN,45,N,N,N^FD${data.upc}^FS`);
  y += 55;
  
  // UPC text and location
  lines.push(`^FO${MARGIN},${y}^A0N,18,18^FD${data.upc}^FS`);
  
  const locationText = `Loc: ${data.location}`;
  const locationX = SHELF_LABEL.WIDTH - MARGIN - locationText.length * 10;
  lines.push(`^FO${locationX},${y}^A0N,18,18^FD${locationText}^FS`);
  
  lines.push("^XZ");
  
  return lines.join("\n");
}

