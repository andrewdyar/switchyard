import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@switchyard/framework/http";
import {
  AdminPrintBagLabel,
  AdminPrintToteLabel,
  AdminPrintSlotLabel,
  AdminPrintBagLabelBatch,
  AdminPrintToteLabelBatch,
  AdminPrintSlotLabelBatch,
} from "./validators";

export const adminLabelsRoutesMiddlewares: MiddlewareRoute[] = [
  // Printer status check
  {
    method: ["GET"],
    matcher: "/admin/labels/printer-status",
    middlewares: [],
  },
  // Single label printing
  {
    method: ["POST"],
    matcher: "/admin/labels/bag",
    middlewares: [validateAndTransformBody(AdminPrintBagLabel)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/tote",
    middlewares: [validateAndTransformBody(AdminPrintToteLabel)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/shelf",
    middlewares: [validateAndTransformBody(AdminPrintSlotLabel)],
  },
  // Batch label printing
  {
    method: ["POST"],
    matcher: "/admin/labels/bag/batch",
    middlewares: [validateAndTransformBody(AdminPrintBagLabelBatch)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/tote/batch",
    middlewares: [validateAndTransformBody(AdminPrintToteLabelBatch)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/shelf/batch",
    middlewares: [validateAndTransformBody(AdminPrintSlotLabelBatch)],
  },
  // Preview endpoints (return ZPL without printing)
  {
    method: ["POST"],
    matcher: "/admin/labels/preview/bag",
    middlewares: [validateAndTransformBody(AdminPrintBagLabel)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/preview/tote",
    middlewares: [validateAndTransformBody(AdminPrintToteLabel)],
  },
  {
    method: ["POST"],
    matcher: "/admin/labels/preview/shelf",
    middlewares: [validateAndTransformBody(AdminPrintSlotLabel)],
  },
  // Test print
  {
    method: ["POST"],
    matcher: "/admin/labels/test",
    middlewares: [],
  },
];
