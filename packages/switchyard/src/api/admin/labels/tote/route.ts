/**
 * POST /admin/labels/tote
 *
 * Print a single tote label
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateToteLabel, sendToPrinter, ToteLabelData } from "../../../../lib/labels";
import { AdminPrintToteLabelType } from "../validators";

interface PrintResponse {
  success: boolean;
  message: string;
  labelType: string;
  toteId?: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintToteLabelType>,
  res: SwitchyardResponse<PrintResponse>
) => {
  const data = req.validatedBody as AdminPrintToteLabelType;

  // Convert to ToteLabelData
  const labelData: ToteLabelData = {
    toteId: data.toteId,
    toteNumber: data.toteNumber,
  };

  // Generate ZPL
  const zpl = generateToteLabel(labelData);

  // Send to printer
  const result = await sendToPrinter(zpl);

  if (!result.success) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Failed to print tote label: ${result.message}`
    );
  }

  res.json({
    success: true,
    message: result.message,
    labelType: "tote",
    toteId: data.toteId,
  });
};

