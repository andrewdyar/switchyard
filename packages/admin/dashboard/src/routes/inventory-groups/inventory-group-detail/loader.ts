import { LoaderFunctionArgs } from "react-router-dom"

import { inventoryGroupsQueryKeys } from "../../../hooks/api/inventory-groups"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const inventoryGroupDetailQuery = (id: string) => ({
  queryKey: inventoryGroupsQueryKeys.detail(id, {
    include_ancestors_tree: true,
    fields: "id,name,type,zone_code,aisle_number,group_number,shelf_number,parent_group_id,*parent_group",
  }),
  queryFn: async () => {
    const response = await fetch(`/admin/inventory-groups/${id}?include_ancestors_tree=true&fields=id,name,type,zone_code,aisle_number,group_number,shelf_number,parent_group_id,*parent_group`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory group: ${response.statusText}`)
    }
    return response.json()
  },
})

export const inventoryGroupLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = inventoryGroupDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
