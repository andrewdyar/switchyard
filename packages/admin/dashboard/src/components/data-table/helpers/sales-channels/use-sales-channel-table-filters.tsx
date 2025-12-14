import { HttpTypes } from "@switchyard/types"
import { createDataTableFilterHelper } from "@switchyard/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useDataTableDateFilters } from "../general/use-data-table-date-filters"

const filterHelper = createDataTableFilterHelper<HttpTypes.AdminSalesChannel>()

export const useSalesChannelTableFilters = () => {
  const { t } = useTranslation()
  const dateFilters = useDataTableDateFilters()

  return useMemo(
    () => [
      filterHelper.accessor("is_disabled", {
        label: t("fields.status"),
        type: "radio",
        options: [
          {
            label: t("general.enabled"),
            value: "false",
          },
          {
            label: t("general.disabled"),
            value: "true",
          },
        ],
      }),
      ...dateFilters,
    ],
    [dateFilters, t]
  )
}
