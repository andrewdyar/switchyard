import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { Modules, ContainerRegistrationKeys } from "@switchyard/framework/utils"

// Module key matches the one defined in @switchyard/inventory-group joiner-config
const INVENTORY_GROUP_MODULE = "inventoryGroup"

/**
 * POST /admin/inventory-groups/:id/products
 * Add or remove products from an inventory group
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { add, remove } = req.validatedBody as {
    add?: string[]
    remove?: string[]
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.LINK)

  // Remove products first
  if (remove?.length) {
    await remoteLink.dismiss({
      [Modules.PRODUCT]: {
        product_id: remove,
      },
      [INVENTORY_GROUP_MODULE]: {
        inventory_group_id: id,
      },
    })
  }

  // Add new products
  if (add?.length) {
    const links = add.map((productId) => ({
      [Modules.PRODUCT]: {
        product_id: productId,
      },
      [INVENTORY_GROUP_MODULE]: {
        inventory_group_id: id,
      },
    }))

    await remoteLink.create(links)
  }

  // Fetch the updated inventory group
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any
  const inventory_group = await inventoryGroupService.retrieve(id)

  res.status(200).json({ inventory_group })
}

