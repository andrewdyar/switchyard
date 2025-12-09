import { TriangleRightMini } from "@medusajs/icons"
import { IconButton, clx } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { InventoryGroupDTO } from "../../../../../hooks/api/inventory-groups"
import {
  ZONE_NAMES,
  ZoneCode,
  getZoneStatusColor,
} from "../../../common/types"

const columnHelper = createColumnHelper<InventoryGroupDTO>()

export const useInventoryGroupTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      // Name column (first) - with expand/collapse functionality
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue, row }) => {
          const expandHandler = row.getToggleExpandedHandler()

          return (
            <div className="flex size-full items-center gap-x-3 overflow-hidden">
              <div className="flex size-7 items-center justify-center">
                {row.getCanExpand() ? (
                  <IconButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      expandHandler()
                    }}
                    size="small"
                    variant="transparent"
                    className="text-ui-fg-subtle"
                  >
                    <TriangleRightMini
                      className={clx({
                        "rotate-90 transition-transform will-change-transform":
                          row.getIsExpanded(),
                      })}
                    />
                  </IconButton>
                ) : (
                  <div className="size-7" /> // Spacer for alignment
                )}
              </div>
              <span className="truncate">{getValue() || "-"}</span>
            </div>
          )
        },
      }),
      // Zone column (second) - with colored square indicator
      columnHelper.accessor("zone_code", {
        header: t("fields.zone"),
        cell: ({ getValue }) => {
          const zone = getValue() as ZoneCode | null
          if (!zone) return "-"

          return (
            <div className="flex items-center gap-x-2">
              <span
                className={clx("size-2 rounded-sm", getZoneStatusColor(zone))}
              />
              <span>{ZONE_NAMES[zone]}</span>
            </div>
          )
        },
      }),
      // Level/Type column (third)
      columnHelper.accessor("type", {
        header: t("fields.level"),
        cell: ({ getValue }) => {
          const level = getValue()
          return level ? level.charAt(0).toUpperCase() + level.slice(1) : "-"
        },
      }),
      // Location Code column (fourth)
      columnHelper.accessor("location_code", {
        header: t("fields.locationCode"),
        cell: ({ getValue }) => getValue() || "-",
      }),
    ],
    [t]
  )
}

