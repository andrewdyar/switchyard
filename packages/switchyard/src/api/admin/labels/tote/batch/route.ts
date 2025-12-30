/**
 * POST /admin/labels/tote/batch
 *
 * Print multiple tote labels
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateToteLabel, sendToPrinter, ToteLabelData } from "../../../../../lib/labels";
import { AdminPrintToteLabelType } from "../../validators";

interface BatchPrintRequest {
  labels: AdminPrintToteLabelType[];
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
    // Convert to ToteLabelData
    const labelData: ToteLabelData = {
      toteId: data.toteId,
      toteNumber: data.toteNumber,
    };

    // Generate ZPL
    const zpl = generateToteLabel(labelData);

    // Send to printer
    const result = await sendToPrinter(zpl);

    if (result.success) {
      printed++;
    } else {
      failed++;
      errors.push(`Tote ${data.toteId}: ${result.message}`);
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
    labelType: "tote",
    printed,
    failed,
    errors,
  });
};

