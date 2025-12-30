/**
 * POST /admin/labels/bag/batch
 *
 * Print multiple bag labels
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateBagLabel, sendToPrinter, BagLabelData } from "../../../../../lib/labels";
import { AdminPrintBagLabelType } from "../../validators";

interface BatchPrintRequest {
  labels: AdminPrintBagLabelType[];
}

interface BatchPrintResponse {
  success: boolean;
  message: string;
  labelType: string;
  printed: number;
  failed: number;
  errors: string[];
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<BatchPrintRequest>,
  res: SwitchyardResponse<BatchPrintResponse>
) => {
  const { labels } = req.validatedBody as BatchPrintRequest;

  let printed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const data of labels) {
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

    if (result.success) {
      printed++;
    } else {
      failed++;
      errors.push(`Bag ${data.bagId}: ${result.message}`);
    }
  }

  if (printed === 0 && failed > 0) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Failed to print all ${failed} labels`
    );
  }

  res.json({
    success: failed === 0,
    message: `Printed ${printed}/${labels.length} labels`,
    labelType: "bag",
    printed,
    failed,
    errors,
  });
};
