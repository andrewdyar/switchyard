/**
 * GET /admin/labels/printer-status
 *
 * Check if the Zebra printer is reachable
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { checkPrinterConnection, DEFAULT_PRINTER_CONFIG } from "../../../../lib/labels";

interface PrinterStatusResponse {
  connected: boolean;
  message: string;
  config: {
    host: string;
    port: number;
  };
}

export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<PrinterStatusResponse>
) => {
  const status = await checkPrinterConnection();

  res.json({
    connected: status.connected,
    message: status.message,
    config: {
      host: DEFAULT_PRINTER_CONFIG.host,
      port: DEFAULT_PRINTER_CONFIG.port,
    },
  });
};

