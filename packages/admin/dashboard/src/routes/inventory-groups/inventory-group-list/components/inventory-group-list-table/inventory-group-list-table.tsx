import { PencilSquare, Trash } from "@switchyard/icons"
import { Button, Container, Heading, Text } from "@switchyard/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  useInventoryGroups,
  InventoryGroupDTO,
} from "../../../../../hooks/api/inventory-groups"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { useDeleteInventoryGroupAction } from "../../../common/hooks/use-delete-inventory-group-action"
import { useInventoryGroupTableColumns } from "./use-inventory-group-table-columns"
import { useInventoryGroupTableQuery } from "./use-inventory-group-table-query"

const PAGE_SIZE = 20

export const InventoryGroupListTable = () => {
  const { t } = useTranslation()

  const { raw, searchParams } = useInventoryGroupTableQuery({
    pageSize: PAGE_SIZE,
  })

  // When searching, we want flat results with ancestors
  // When browsing, we want aisles as top level with descendants tree
  const { type: _typeParam, ...searchParamsWithoutType } = searchParams
  
  const query = raw.q
    ? {
        include_ancestors_tree: true,
        fields:
          "id,name,handle,is_active,parent_group,type,zone_code,location_code",
        q: raw.q,
        ...searchParamsWithoutType,
      }
    : {
        include_descendants_tree: true,
        type: "aisle", // Fetch aisles as top level, with bays/shelves/slots nested
        fields:
          "id,name,group_children,handle,is_active,type,zone_code,location_code",
        ...searchParamsWithoutType,
      }

  const { inventory_groups, count, isLoading, isError, error } =
    useInventoryGroups(
      {
        ...query,
      },
      {
        placeholderData: keepPreviousData,
      }
    )

  const columns = useColumns()

  const { table } = useDataTable({
    data: inventory_groups || [],
    columns,
    count,
    getRowId: (original) => original.id,
    getSubRows: (original) => original.group_children,
    enableExpandableRows: true,
    pageSize: PAGE_SIZE,
  })

  const showOrganizeAction =
    !!inventory_groups && inventory_groups.length > 0

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("inventoryGroups.pageTitle")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("inventoryGroups.subtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          {showOrganizeAction && (
            <Button size="small" variant="secondary" asChild>
              <Link to="organize">{t("inventoryGroups.organize.action")}</Link>
            </Button>
          )}
          <Button size="small" variant="secondary" asChild>
            <Link to="create">{t("actions.create")}</Link>
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={PAGE_SIZE}
        isLoading={isLoading}
        navigateTo={(row) => row.id}
        queryObject={raw}
        search
        pagination
      />
    </Container>
  )
}

const InventoryGroupRowActions = ({
  group,
}: {
  group: InventoryGroupDTO
}) => {
  const { t } = useTranslation()
  const handleDelete = useDeleteInventoryGroupAction(group)

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("actions.edit"),
              icon: <PencilSquare />,
              to: `${group.id}/edit`,
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
  )
}

const columnHelper = createColumnHelper<InventoryGroupDTO>()

const useColumns = () => {
  const base = useInventoryGroupTableColumns()

  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <InventoryGroupRowActions group={row.original} />
        },
      }),
    ],
    [base]
  )
}

