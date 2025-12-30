/**
 * POST /admin/labels/preview/shelf
 *
 * Generate slot location label ZPL without printing (for preview)
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { generateShelfLabel } from "../../../../../lib/labels";
import { SlotLabelData } from "../../../../../lib/labels/types";
import { AdminPrintSlotLabelType } from "../../validators";

interface PreviewResponse {
  zpl: string;
  labelType: string;
  locationCode: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintSlotLabelType>,
  res: SwitchyardResponse<PreviewResponse>
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

  res.json({
    zpl,
    labelType: "slot",
    locationCode: data.locationCode,
  });
};
