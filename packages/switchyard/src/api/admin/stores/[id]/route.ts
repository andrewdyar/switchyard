import { updateStoresWorkflow } from "@switchyard/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { AdminGetStoreParamsType } from "../validators"
import { refetchStore } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetStoreParamsType>,
  res: MedusaResponse<HttpTypes.AdminStoreResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const variables = { id: req.params.id }

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "store",
    variables,
    fields: req.queryConfig.fields,
  })

  const [store] = await remoteQuery(queryObject)
  res.status(200).json({ store })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminUpdateStore,
    HttpTypes.AdminStoreParams
  >,
  res: MedusaResponse<HttpTypes.AdminStoreResponse>
) => {
  const existingStore = await refetchStore(req.params.id, req.scope, ["id"])
  if (!existingStore) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Store with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateStoresWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const store = await refetchStore(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ store })
}
