/**
 * Zebra Printer Communication Utility
 *
 * Handles sending ZPL commands to Zebra printers over TCP
 * Default port: 9100 (raw TCP for ZPL)
 */

import * as net from "net";
import { PrinterConfig } from "./types";

/**
 * Default printer configuration
 * Override with environment variables
 */
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  host: process.env.ZEBRA_PRINTER_IP || "192.168.1.100",
  port: parseInt(process.env.ZEBRA_PRINTER_PORT || "9100", 10),
  dpi: 203,
};

/**
 * Result of a print operation
 */
export interface PrintResult {
  success: boolean;
  message: string;
  bytesWritten?: number;
  error?: Error;
}

/**
 * Send ZPL commands to a Zebra printer
 * @param zpl - ZPL command string to send
 * @param config - Printer configuration (optional, uses defaults if not provided)
 * @returns Promise resolving to print result
 */
export async function sendToPrinter(
  zpl: string,
  config: Partial<PrinterConfig> = {}
): Promise<PrintResult> {
  const printerConfig: PrinterConfig = {
    ...DEFAULT_PRINTER_CONFIG,
    ...config,
  };

  return new Promise((resolve) => {
    const client = new net.Socket();
    let bytesWritten = 0;

    // Set timeout for connection
    client.setTimeout(10000); // 10 second timeout

    client.on("connect", () => {
      // Send ZPL data
      const buffer = Buffer.from(zpl, "utf-8");
      client.write(buffer, (err) => {
        if (err) {
          client.destroy();
          resolve({
            success: false,
            message: `Failed to write to printer: ${err.message}`,
            error: err,
          });
        } else {
          bytesWritten = buffer.length;
          // Close connection after sending
          client.end();
        }
      });
    });

    client.on("close", () => {
      resolve({
        success: true,
        message: "Label sent to printer successfully",
        bytesWritten,
      });
    });

    client.on("error", (err: Error) => {
      client.destroy();
      resolve({
        success: false,
        message: `Printer connection error: ${err.message}`,
        error: err,
      });
    });

    client.on("timeout", () => {
      client.destroy();
      resolve({
        success: false,
        message: "Printer connection timed out",
      });
    });

    // Connect to printer
    client.connect(printerConfig.port, printerConfig.host);
  });
}

/**
 * Check if printer is reachable
 * @param config - Printer configuration
 * @returns Promise resolving to true if printer is reachable
 */
export async function checkPrinterConnection(
  config: Partial<PrinterConfig> = {}
): Promise<{ connected: boolean; message: string }> {
  const printerConfig: PrinterConfig = {
    ...DEFAULT_PRINTER_CONFIG,
    ...config,
  };

  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(5000); // 5 second timeout for check

    client.on("connect", () => {
      client.destroy();
      resolve({
        connected: true,
        message: `Printer at ${printerConfig.host}:${printerConfig.port} is reachable`,
      });
    });

    client.on("error", (err: Error) => {
      client.destroy();
      resolve({
        connected: false,
        message: `Cannot reach printer: ${err.message}`,
      });
    });

    client.on("timeout", () => {
      client.destroy();
      resolve({
        connected: false,
        message: "Connection to printer timed out",
      });
    });

    client.connect(printerConfig.port, printerConfig.host);
  });
}

/**
 * Send a test print to verify printer is working
 * Prints a simple test label with the current date/time
 */
export async function sendTestPrint(
  config: Partial<PrinterConfig> = {}
): Promise<PrintResult> {
  const now = new Date().toISOString();
  const testZPL = `^XA
^CI28
^PW406
^LL203

^FO20,20
^A0N,30,30
^FDGoods Printer Test^FS

^FO20,60
^A0N,20,20
^FD${now}^FS

^FO20,100
^BY2
^BCN,50,Y,N,N
^FDTEST123^FS

^XZ`;

  return sendToPrinter(testZPL, config);
}

