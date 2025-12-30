/**
 * POST /admin/labels/shelf/batch
 *
 * Print multiple slot location labels
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { generateShelfLabel, sendToPrinter } from "../../../../../lib/labels";
import { SlotLabelData } from "../../../../../lib/labels/types";
import { AdminPrintSlotLabelType } from "../../validators";

interface BatchPrintRequest {
  labels: AdminPrintSlotLabelType[];
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

    if (result.success) {
      printed++;
    } else {
      failed++;
      errors.push(`${data.locationCode}: ${result.message}`);
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
    labelType: "slot",
    printed,
    failed,
    errors,
  });
};
