/**
 * POST /admin/labels/preview/bag
 *
 * Generate bag label ZPL without printing (for preview)
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { generateBagLabel, BagLabelData } from "../../../../../lib/labels";
import { AdminPrintBagLabelType } from "../../validators";

interface PreviewResponse {
  zpl: string;
  labelType: string;
  bagId: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPrintBagLabelType>,
  res: SwitchyardResponse<PreviewResponse>
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

  res.json({
    zpl,
    labelType: "bag",
    bagId: data.bagId,
  });
};
