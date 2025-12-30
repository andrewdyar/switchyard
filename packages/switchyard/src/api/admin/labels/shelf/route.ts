/**
 * POST /admin/labels/shelf
 *
 * Print a single slot location label
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateShelfLabel, sendToPrinter } from "../../../../lib/labels";
import { SlotLabelData } from "../../../../lib/labels/types";
import { AdminPrintSlotLabelType } from "../validators";

interface PrintResponse {
  success: boolean;
  message: string;
  labelType: string;
  locationCode?: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintSlotLabelType>,
  res: SwitchyardResponse<PrintResponse>
) => {
  const data = req.validatedBody as AdminPrintSlotLabelType;

  // Convert to SlotLabelData
  const labelData: SlotLabelData = {
    locationCode: data.locationCode,
    zone: data.zone,
    aisle: data.aisle,
    bay: data.bay,
    shelf: data.shelf,
    slot: data.slot,
  };

  // Generate ZPL
  const zpl = generateShelfLabel(labelData);

  // Send to printer
  const result = await sendToPrinter(zpl);

  if (!result.success) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Failed to print slot label: ${result.message}`
    );
  }

  res.json({
    success: true,
    message: result.message,
    labelType: "slot",
    locationCode: data.locationCode,
  });
};
