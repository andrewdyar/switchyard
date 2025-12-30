/**
 * POST /admin/labels/test
 *
 * Print a test label to verify printer connectivity
 */

import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http";
import { SwitchyardError } from "@switchyard/framework/utils";
import { sendTestPrint } from "../../../../lib/labels";

interface TestPrintResponse {
  success: boolean;
  message: string;
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<TestPrintResponse>
) => {
  const result = await sendTestPrint();

  if (!result.success) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Failed to print test label: ${result.message}`
    );
  }

  res.json({
    success: true,
    message: "Test label sent to printer",
  });
};

