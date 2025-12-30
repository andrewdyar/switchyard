/**
 * POST /admin/labels/bag
 *
 * Print a single bag label
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateBagLabel, sendToPrinter, BagLabelData } from "../../../../lib/labels";
import { AdminPrintBagLabelType } from "../validators";

interface PrintResponse {
  success: boolean;
  message: string;
  labelType: string;
  bagId?: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintBagLabelType>,
  res: SwitchyardResponse<PrintResponse>
) => {
  const data = req.validatedBody as AdminPrintBagLabelType;

  // Convert to BagLabelData
  const labelData: BagLabelData = {
    customerFirstName: data.customerFirstName,
    customerLastName: data.customerLastName,
    items: data.items,
    bagNumber: data.bagNumber,
    totalBags: data.totalBags,
    bagId: data.bagId,
    temperatureZone: data.temperatureZone,
    orderId: data.orderId,
  };

  // Generate ZPL
  const zpl = generateBagLabel(labelData);

  // Send to printer
  const result = await sendToPrinter(zpl);

  if (!result.success) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Failed to print bag label: ${result.message}`
    );
  }

  res.json({
    success: true,
    message: result.message,
    labelType: "bag",
    bagId: data.bagId,
  });
};
