/**
 * POST /admin/labels/preview/tote
 *
 * Preview a tote label (returns ZPL without printing)
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { generateToteLabel, ToteLabelData } from "../../../../../lib/labels";
import { AdminPrintToteLabelType } from "../../validators";

interface PreviewResponse {
  zpl: string;
  labelType: string;
  labelaryUrl: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintToteLabelType>,
  res: SwitchyardResponse<PreviewResponse>
) => {
  const data = req.validatedBody as AdminPrintToteLabelType;

  // Convert to ToteLabelData
  const labelData: ToteLabelData = {
    toteId: data.toteId,
    toteNumber: data.toteNumber,
  };

  // Generate ZPL
  const zpl = generateToteLabel(labelData);

  res.json({
    zpl,
    labelType: "tote",
    labelaryUrl: "https://labelary.com/viewer.html",
  });
};

