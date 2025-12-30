/**
 * Tote Label ZPL Generator
 *
 * Generates ZPL code for simple tote identification labels
 * Size: 3" x 3" square
 *
 * Layout:
 * - Large 2" x 2" QR code centered
 * - Tote number text below QR code
 */

import { ToteLabelData, inchesToDots } from "./types";

// Label dimensions at 203 DPI
const DPI = 203;
const LABEL_WIDTH = inchesToDots(3, DPI); // 609 dots
const LABEL_HEIGHT = inchesToDots(3, DPI); // 609 dots

// QR code size target: 2" x 2" = 406 dots
// QR magnification of 10 gives roughly 2" for typical data length
const QR_MAGNIFICATION = 10;

/**
 * Generate tote label ZPL
 */
export function generateToteLabel(data: ToteLabelData): string {
  const lines: string[] = [];
  
  // Start label format
  lines.push("^XA");
  
  // Set character encoding to UTF-8
  lines.push("^CI28");
  
  // Set print width and label length
  lines.push(`^PW${LABEL_WIDTH}`);
  lines.push(`^LL${LABEL_HEIGHT}`);
  
  // Set label home position
  lines.push("^LH0,0");
  
  // Calculate QR code position (centered horizontally)
  // QR code at magnification 10 is approximately 400 dots for typical content
  const qrWidth = 400; // Approximate
  const qrX = Math.round((LABEL_WIDTH - qrWidth) / 2);
  const qrY = 40; // Top margin
  
  // QR Code
  // ^BQ = QR Code
  // N = Normal orientation
  // 2 = Model 2 (most common)
  // QR magnification (1-10, we use 10 for large ~2" code)
  // ^FD starts with error correction level: H, Q, M, L (we use Q for balanced)
  // QA, prefix means "Automatic" mode for data
  lines.push(`^FO${qrX},${qrY}`);
  lines.push(`^BQN,2,${QR_MAGNIFICATION}`);
  lines.push(`^FDQA,${data.toteId}^FS`);
  
  // Tote number text (centered below QR)
  const toteText = `TOTE #${data.toteNumber}`;
  // Estimate text width: approximately 20 dots per character at font size 50
  const textWidth = toteText.length * 25;
  const textX = Math.round((LABEL_WIDTH - textWidth) / 2);
  const textY = 500; // Position near bottom
  
  lines.push(`^FO${textX},${textY}`);
  lines.push(`^A0N,50,50`); // Font 0, Normal rotation, 50 height, 50 width
  lines.push(`^FD${toteText}^FS`);
  
  // Optional: Add a border around the label for visibility
  // lines.push(`^FO5,5^GB${LABEL_WIDTH - 10},${LABEL_HEIGHT - 10},3^FS`);
  
  // End label format
  lines.push("^XZ");
  
  return lines.join("\n");
}

/**
 * Generate multiple tote labels (for batch printing)
 */
export function generateToteLabels(totes: ToteLabelData[]): string {
  return totes.map(tote => generateToteLabel(tote)).join("\n");
}

/**
 * Example usage and test data
 */
export const EXAMPLE_TOTE_LABEL_DATA: ToteLabelData = {
  toteId: "TOTE-2024-000123",
  toteNumber: "123",
};

/**
 * Simple ZPL for testing in Labelary
 * Copy this to labelary.com with settings: 3" x 3", 8 DPMM (203 DPI)
 */
export const TOTE_LABEL_TEMPLATE_ZPL = `^XA
^CI28
^PW609
^LL609

^FO104,40
^BQN,2,10
^FDQA,TOTE-2024-000123^FS

^FO180,500
^A0N,50,50
^FDTOTE #123^FS

^XZ`;

