import { useParams } from "react-router-dom"
import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useInventoryGroup } from "../../../hooks/api/inventory-groups"
import { useExtension } from "../../../providers/extension-provider"
import { InventoryGroupGeneralSection } from "./components/inventory-group-general-section"
import { InventoryGroupOrganizeSection } from "./components/inventory-group-organize-section"
import { InventoryGroupProductSection } from "./components/inventory-group-product-section"

export const InventoryGroupDetail = () => {
  const { id } = useParams()
  const { getWidgets } = useExtension()

  const { inventory_group, isLoading, isError, error } = useInventoryGroup(
    id!,
    {
      include_descendants_tree: true,
    }
  )

  if (isLoading || !inventory_group) {
    return (
      <TwoColumnPageSkeleton
        mainSections={2}
        sidebarSections={1}
        showJSON
        showMetadata
      />
    )
  }

  if (isError) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        after: getWidgets("inventory_group.details.after"),
        before: getWidgets("inventory_group.details.before"),
        sideAfter: getWidgets("inventory_group.details.side.after"),
        sideBefore: getWidgets("inventory_group.details.side.before"),
      }}
      showJSON
      showMetadata
      data={inventory_group}
    >
      <TwoColumnPage.Main>
        <InventoryGroupGeneralSection inventoryGroup={inventory_group} />
        <InventoryGroupProductSection inventoryGroup={inventory_group} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <InventoryGroupOrganizeSection inventoryGroup={inventory_group} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

