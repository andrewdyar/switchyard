/**
 * Print Shelf Label Widget
 *
 * Widget for printing shelf labels from the inventory detail page
 */

import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, toast } from "@medusajs/ui";
import { Printer } from "@medusajs/icons";
import { usePrintShelfLabel } from "../hooks/use-label-printing";
import { DetailWidgetProps } from "@medusajs/framework/types";

interface InventoryItemData {
  id: string;
  sku?: string;
  title?: string;
  metadata?: {
    warehouse_location?: string;
    upc?: string;
  };
}

const PrintShelfLabelWidget = ({ data }: DetailWidgetProps<InventoryItemData>) => {
  const { print, loading, error } = usePrintShelfLabel();

  const handlePrint = async () => {
    // Extract data from inventory item
    const productName = data.title || data.sku || "Unknown Product";
    const upc = data.metadata?.upc || data.sku || "";
    const location = data.metadata?.warehouse_location || "";

    if (!upc) {
      toast.error("No UPC/barcode available for this item");
      return;
    }

    const result = await print({
      productName,
      upc,
      location: location || "N/A",
    });

    if (result?.success) {
      toast.success("Shelf label printed successfully");
    } else {
      toast.error(result?.message || "Failed to print shelf label");
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Print Label</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-4">
          <p className="text-ui-fg-subtle text-sm">
            Print a shelf label for this inventory item to the Zebra printer.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={handlePrint}
              disabled={loading}
              isLoading={loading}
            >
              <Printer className="mr-2" />
              Print Shelf Label
            </Button>
          </div>
          {error && (
            <p className="text-ui-fg-error text-sm">{error}</p>
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "inventory_item.details.side.after",
});

export default PrintShelfLabelWidget;

