import { PencilSquare } from "@medusajs/icons"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Skeleton } from "../../../../../components/common/skeleton"
import {
  useInventoryGroup,
  InventoryGroupDTO,
} from "../../../../../hooks/api/inventory-groups"

type InventoryGroupOrganizeSectionProps = {
  inventoryGroup: InventoryGroupDTO
}

// Helper function to get children
const getGroupChildren = (
  group: InventoryGroupDTO | undefined
): { id: string; name: string }[] => {
  if (!group?.group_children) return []
  return group.group_children.map((child) => ({
    id: child.id,
    name: child.name,
  }))
}

export const InventoryGroupOrganizeSection = ({
  inventoryGroup,
}: InventoryGroupOrganizeSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("inventoryGroups.organize.header")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("inventoryGroups.organize.action"),
                  icon: <PencilSquare />,
                  to: `organize`,
                },
              ],
            },
          ]}
        />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start gap-3 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("inventoryGroups.fields.parent.label")}
        </Text>
        <ParentDisplay inventoryGroup={inventoryGroup} />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start gap-3 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("inventoryGroups.fields.children.label")}
        </Text>
        <ChildrenDisplay inventoryGroup={inventoryGroup} />
      </div>
    </Container>
  )
}

const ParentDisplay = ({
  inventoryGroup,
}: {
  inventoryGroup: InventoryGroupDTO
}) => {
  const {
    inventory_group: withParent,
    isLoading,
    isError,
    error,
  } = useInventoryGroup(inventoryGroup.id, {
    include_ancestors_tree: true,
    fields: "id,name,parent_group_id,*parent_group",
  })

  if (isLoading || !withParent) {
    return <Skeleton className="h-5 w-16" />
  }

  if (isError) {
    throw error
  }

  // No parent means this is a top-level item (zone or orphan)
  if (!withParent.parent_group) {
    return (
      <Text size="small" leading="compact">
        -
      </Text>
    )
  }

  return (
    <div className="flex w-full flex-wrap gap-1">
      <Badge
        key={withParent.parent_group.id}
        size="2xsmall"
        className="max-w-full"
        asChild
      >
        <Link to={`/groups/${withParent.parent_group.id}`}>
          <span className="truncate">{withParent.parent_group.name}</span>
        </Link>
      </Badge>
    </div>
  )
}

const ChildrenDisplay = ({
  inventoryGroup,
}: {
  inventoryGroup: InventoryGroupDTO
}) => {
  const {
    inventory_group: withChildren,
    isLoading,
    isError,
    error,
  } = useInventoryGroup(inventoryGroup.id, {
    include_descendants_tree: true,
    fields: "id,name,group_children",
  })

  const chips = useMemo(() => getGroupChildren(withChildren), [withChildren])

  if (isLoading || !withChildren) {
    return <Skeleton className="h-5 w-16" />
  }

  if (isError) {
    throw error
  }

  if (!chips.length) {
    return (
      <Text size="small" leading="compact">
        -
      </Text>
    )
  }

  return (
    <div className="flex w-full flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge key={chip.id} size="2xsmall" className="max-w-full" asChild>
          <Link to={`/groups/${chip.id}`}>
            <span className="truncate">{chip.name}</span>
          </Link>
        </Badge>
      ))}
    </div>
  )
}

