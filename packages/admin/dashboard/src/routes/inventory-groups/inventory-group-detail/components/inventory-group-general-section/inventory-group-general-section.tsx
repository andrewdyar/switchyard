import { PencilSquare, Trash } from "@medusajs/icons"
import { Badge, Container, Heading, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { InventoryGroupDTO } from "../../../../../hooks/api/inventory-groups"
import { useDeleteInventoryGroupAction } from "../../../common/hooks/use-delete-inventory-group-action"
import { ZONE_NAMES, ZoneCode, getZoneBadgeColor } from "../../../common/types"

type InventoryGroupGeneralSectionProps = {
  inventoryGroup: InventoryGroupDTO
}

export const InventoryGroupGeneralSection = ({
  inventoryGroup,
}: InventoryGroupGeneralSectionProps) => {
  const { t } = useTranslation()
  const handleDelete = useDeleteInventoryGroupAction(inventoryGroup)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{inventoryGroup.name}</Heading>
        <div className="flex items-center gap-x-4">
          <div className="flex items-center gap-x-2">
            {inventoryGroup.type && (
              <Badge color="purple">
                {inventoryGroup.type.charAt(0).toUpperCase() +
                  inventoryGroup.type.slice(1)}
              </Badge>
            )}
            {inventoryGroup.zone_code && (
              <Badge
                color={getZoneBadgeColor(inventoryGroup.zone_code as ZoneCode)}
                className={clx({
                  "!bg-gray-600 !text-white dark:!bg-blue-100 dark:!text-gray-800":
                    inventoryGroup.zone_code === "F",
                })}
              >
                {ZONE_NAMES[inventoryGroup.zone_code as ZoneCode]}
              </Badge>
            )}
          </div>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.edit"),
                    icon: <PencilSquare />,
                    to: "edit",
                  },
                ],
              },
              {
                actions: [
                  {
                    label: t("actions.delete"),
                    icon: <Trash />,
                    onClick: handleDelete,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.handle")}
        </Text>
        <Text size="small" leading="compact">
          {inventoryGroup.handle || "-"}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.locationCode")}
        </Text>
        <Text size="small" leading="compact">
          {inventoryGroup.location_code || "-"}
        </Text>
      </div>
      {inventoryGroup.description && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("fields.description")}
          </Text>
          <Text size="small" leading="compact">
            {inventoryGroup.description}
          </Text>
        </div>
      )}
      {inventoryGroup.aisle_number && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("fields.aisle")}
          </Text>
          <Text size="small" leading="compact">
            {String(inventoryGroup.aisle_number).padStart(2, "0")}
          </Text>
        </div>
      )}
      {inventoryGroup.bay_number && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("fields.bay")}
          </Text>
          <Text size="small" leading="compact">
            {String(inventoryGroup.bay_number).padStart(2, "0")}
          </Text>
        </div>
      )}
      {inventoryGroup.shelf_number && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("fields.shelf")}
          </Text>
          <Text size="small" leading="compact">
            {inventoryGroup.shelf_number}
          </Text>
        </div>
      )}
      {inventoryGroup.slot_number && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("fields.slot")}
          </Text>
          <Text size="small" leading="compact">
            {String(inventoryGroup.slot_number).padStart(2, "0")}
          </Text>
        </div>
      )}
    </Container>
  )
}

