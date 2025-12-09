import { PlusMini, Trash } from "@medusajs/icons"
import {
  Checkbox,
  CommandBar,
  Container,
  Heading,
  toast,
  usePrompt,
  Text,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { RowSelectionState, createColumnHelper } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { HttpTypes } from "@medusajs/framework/types"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  useUpdateInventoryGroupProducts,
  InventoryGroupDTO,
} from "../../../../../hooks/api/inventory-groups"
import { useProducts } from "../../../../../hooks/api/products"
import { useProductTableColumns } from "../../../../../hooks/table/columns/use-product-table-columns"
import { useProductTableFilters } from "../../../../../hooks/table/filters/use-product-table-filters"
import { useProductTableQuery } from "../../../../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"

type InventoryGroupProductSectionProps = {
  inventoryGroup: InventoryGroupDTO
}

const PAGE_SIZE = 10

export const InventoryGroupProductSection = ({
  inventoryGroup,
}: InventoryGroupProductSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const [selection, setSelection] = useState<RowSelectionState>({})

  const { raw, searchParams } = useProductTableQuery({ pageSize: PAGE_SIZE })

  // TODO: Once product-inventory-group link is set up, filter by inventory_group_id
  // For now, show all products
  const { products, count, isLoading, isError, error } = useProducts(
    {
      ...searchParams,
      // inventory_group_id: [inventoryGroup.id], // Uncomment when link is ready
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useColumns()
  const filters = useProductTableFilters(["categories"])

  const { table } = useDataTable({
    data: products || [],
    columns,
    count,
    getRowId: (original) => original.id,
    pageSize: PAGE_SIZE,
    enableRowSelection: true,
    enablePagination: true,
    rowSelection: {
      state: selection,
      updater: setSelection,
    },
  })

  const { mutateAsync } = useUpdateInventoryGroupProducts(inventoryGroup.id)

  const handleRemove = async () => {
    const selectedIds = Object.keys(selection)
    if (!selectedIds.length) return

    const result = await prompt({
      title: t("general.areYouSure"),
      description: t("inventoryGroups.products.removeConfirmation", {
        count: selectedIds.length,
      }),
      confirmText: t("actions.remove"),
      cancelText: t("actions.cancel"),
    })

    if (!result) return

    await mutateAsync(
      { remove: selectedIds },
      {
        onSuccess: () => {
          toast.success(
            t("inventoryGroups.products.removeSuccess", {
              count: selectedIds.length,
            })
          )
          setSelection({})
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("products.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("inventoryGroups.products.description")}
          </Text>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.add"),
                  icon: <PlusMini />,
                  to: "add-products",
                },
              ],
            },
          ]}
        />
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={PAGE_SIZE}
        isLoading={isLoading}
        navigateTo={(row) => `/products/${row.id}`}
        queryObject={raw}
        filters={filters}
        search
        pagination
      />
      <CommandBar open={Object.keys(selection).length > 0}>
        <CommandBar.Bar>
          <CommandBar.Value>
            {t("general.countSelected", {
              count: Object.keys(selection).length,
            })}
          </CommandBar.Value>
          <CommandBar.Seperator />
          <CommandBar.Command
            action={handleRemove}
            shortcut="r"
            label={t("actions.remove")}
          />
        </CommandBar.Bar>
      </CommandBar>
    </Container>
  )
}

const columnHelper = createColumnHelper<HttpTypes.AdminProduct>()

const useColumns = () => {
  const baseColumns = useProductTableColumns()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      ...baseColumns,
    ],
    [baseColumns]
  )
}

