/**
 * Direct Printing to Zebra ZD421
 *
 * Uses react-native-tcp-socket to send ZPL commands directly to the printer
 */

import TcpSocket from "react-native-tcp-socket";
import config from "../config";

export interface PrintResult {
  success: boolean;
  message: string;
  bytesWritten?: number;
}

/**
 * Send ZPL commands directly to the Zebra printer
 */
export function sendToPrinter(
  zpl: string,
  host?: string,
  port?: number
): Promise<PrintResult> {
  const printerHost = host || config.printer.host;
  const printerPort = port || config.printer.port;

  return new Promise((resolve) => {
    let bytesWritten = 0;

    const client = TcpSocket.createConnection(
      {
        host: printerHost,
        port: printerPort,
        timeout: 10000,
      },
      () => {
        // Connection established, send ZPL
        client.write(zpl, "utf-8", (err) => {
          if (err) {
            client.destroy();
            resolve({
              success: false,
              message: `Failed to write to printer: ${err.message}`,
            });
          } else {
            bytesWritten = zpl.length;
            client.end();
          }
        });
      }
    );

    client.on("close", () => {
      resolve({
        success: true,
        message: "Label sent to printer",
        bytesWritten,
      });
    });

    client.on("error", (error) => {
      client.destroy();
      resolve({
        success: false,
        message: `Printer connection error: ${error.message}`,
      });
    });

    client.on("timeout", () => {
      client.destroy();
      resolve({
        success: false,
        message: "Printer connection timed out",
      });
    });
  });
}

/**
 * Check if printer is reachable
 */
export function checkPrinterConnection(
  host?: string,
  port?: number
): Promise<{ connected: boolean; message: string }> {
  const printerHost = host || config.printer.host;
  const printerPort = port || config.printer.port;

  return new Promise((resolve) => {
    const client = TcpSocket.createConnection(
      {
        host: printerHost,
        port: printerPort,
        timeout: 5000,
      },
      () => {
        client.destroy();
        resolve({
          connected: true,
          message: `Printer at ${printerHost}:${printerPort} is reachable`,
        });
      }
    );

    client.on("error", (error) => {
      client.destroy();
      resolve({
        connected: false,
        message: `Cannot reach printer: ${error.message}`,
      });
    });

    client.on("timeout", () => {
      client.destroy();
      resolve({
        connected: false,
        message: "Connection to printer timed out",
      });
    });
  });
}

/**
 * Send a test print
 */
export async function sendTestPrint(host?: string, port?: number): Promise<PrintResult> {
  const now = new Date().toISOString();
  const testZPL = `^XA
^CI28
^PW406
^LL203

^FO20,20
^A0N,30,30
^FDGoods Scanner Test^FS

^FO20,60
^A0N,20,20
^FD${now}^FS

^FO20,100
^BY2
^BCN,50,Y,N,N
^FDTEST123^FS

^XZ`;

  return sendToPrinter(testZPL, host, port);
}

