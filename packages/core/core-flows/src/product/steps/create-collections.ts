import type {
  IProductModuleService,
  ProductTypes,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

export const createCollectionsStepId = "create-collections"
/**
 * This step creates one or more collection.
 */
export const createCollectionsStep = createStep(
  createCollectionsStepId,
  async (data: ProductTypes.CreateProductCollectionDTO[], { container }) => {
    const service = container.resolve<IProductModuleService>(Modules.PRODUCT)

    const created = await service.createProductCollections(data)
    return new StepResponse(
      created,
      created.map((collection) => collection.id)
    )
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }

    const service = container.resolve<IProductModuleService>(Modules.PRODUCT)

    await service.deleteProductCollections(createdIds)
  }
)
