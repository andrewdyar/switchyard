/**
 * Print Label Button Component
 *
 * Reusable button for printing labels from the admin dashboard
 */

import { useState } from "react";
import { Button, toast } from "@medusajs/ui";
import { Printer } from "@medusajs/icons";
import {
  usePrintBagLabel,
  usePrintToteLabel,
  usePrintShelfLabel,
  usePrinterStatus,
  BagLabelData,
  ToteLabelData,
  ShelfLabelData,
} from "../hooks/use-label-printing";

interface PrintBagLabelButtonProps {
  data: BagLabelData;
  variant?: "primary" | "secondary" | "transparent" | "danger";
  size?: "small" | "base" | "large" | "xlarge";
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PrintBagLabelButton({
  data,
  variant = "secondary",
  size = "small",
  disabled = false,
  onSuccess,
  onError,
}: PrintBagLabelButtonProps) {
  const { print, loading } = usePrintBagLabel();

  const handlePrint = async () => {
    const result = await print(data);
    if (result?.success) {
      toast.success("Bag label printed successfully");
      onSuccess?.();
    } else {
      const errorMsg = result?.message || "Failed to print label";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={disabled || loading}
      isLoading={loading}
    >
      <Printer className="mr-2" />
      Print Bag Label
    </Button>
  );
}

interface PrintToteLabelButtonProps {
  data: ToteLabelData;
  variant?: "primary" | "secondary" | "transparent" | "danger";
  size?: "small" | "base" | "large" | "xlarge";
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PrintToteLabelButton({
  data,
  variant = "secondary",
  size = "small",
  disabled = false,
  onSuccess,
  onError,
}: PrintToteLabelButtonProps) {
  const { print, loading } = usePrintToteLabel();

  const handlePrint = async () => {
    const result = await print(data);
    if (result?.success) {
      toast.success("Tote label printed successfully");
      onSuccess?.();
    } else {
      const errorMsg = result?.message || "Failed to print label";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={disabled || loading}
      isLoading={loading}
    >
      <Printer className="mr-2" />
      Print Tote Label
    </Button>
  );
}

interface PrintShelfLabelButtonProps {
  data: ShelfLabelData;
  variant?: "primary" | "secondary" | "transparent" | "danger";
  size?: "small" | "base" | "large" | "xlarge";
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PrintShelfLabelButton({
  data,
  variant = "secondary",
  size = "small",
  disabled = false,
  onSuccess,
  onError,
}: PrintShelfLabelButtonProps) {
  const { print, loading } = usePrintShelfLabel();

  const handlePrint = async () => {
    const result = await print(data);
    if (result?.success) {
      toast.success("Shelf label printed successfully");
      onSuccess?.();
    } else {
      const errorMsg = result?.message || "Failed to print label";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={disabled || loading}
      isLoading={loading}
    >
      <Printer className="mr-2" />
      Print Shelf Label
    </Button>
  );
}

interface PrinterStatusIndicatorProps {
  showLabel?: boolean;
}

export function PrinterStatusIndicator({ showLabel = true }: PrinterStatusIndicatorProps) {
  const { status, loading, checkStatus } = usePrinterStatus();
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    await checkStatus();
    setChecked(true);
  };

  if (!checked) {
    return (
      <Button variant="transparent" size="small" onClick={handleCheck} isLoading={loading}>
        Check Printer
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${
          status?.connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {showLabel && (
        <span className="text-sm text-ui-fg-subtle">
          {status?.connected ? "Printer Connected" : "Printer Offline"}
        </span>
      )}
    </div>
  );
}

