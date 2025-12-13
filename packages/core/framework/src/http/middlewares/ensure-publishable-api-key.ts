import {
  ApiKeyType,
  ContainerRegistrationKeys,
  isPresent,
  SwitchyardError,
  PUBLISHABLE_KEY_HEADER,
} from "@switchyard/utils"
import type {
  SwitchyardNextFunction,
  SwitchyardResponse,
  MedusaStoreRequest,
} from "../../http"

export async function ensurePublishableApiKeyMiddleware(
  req: MedusaStoreRequest,
  _: SwitchyardResponse,
  next: SwitchyardNextFunction
) {
  const publishableApiKey = req.get(PUBLISHABLE_KEY_HEADER)

  if (!isPresent(publishableApiKey)) {
    const error = new SwitchyardError(
      SwitchyardError.Types.NOT_ALLOWED,
      `Publishable API key required in the request header: ${PUBLISHABLE_KEY_HEADER}. You can manage your keys in settings in the dashboard.`
    )
    return next(error)
  }

  let apiKey
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Cache API key data and check revocation in memory
    const { data } = await query.graph(
      {
        entity: "api_key",
        fields: [
          "id",
          "token",
          "revoked_at",
          "sales_channels_link.sales_channel_id",
        ],
        filters: {
          token: publishableApiKey,
          type: ApiKeyType.PUBLISHABLE,
        },
      },
      {
        cache: {
          enable: true,
        },
      }
    )

    if (data.length) {
      const now = new Date()
      const cachedApiKey = data[0]
      const isRevoked =
        !!cachedApiKey.revoked_at && new Date(cachedApiKey.revoked_at) <= now

      if (!isRevoked) {
        apiKey = cachedApiKey
      }
    }
  } catch (e) {
    return next(e)
  }

  if (!apiKey) {
    try {
      throw new SwitchyardError(
        SwitchyardError.Types.NOT_ALLOWED,
        `A valid publishable key is required to proceed with the request`
      )
    } catch (e) {
      return next(e)
    }
  }

  req.publishable_key_context = {
    key: apiKey.token,
    sales_channel_ids: apiKey.sales_channels_link.map(
      (link) => link.sales_channel_id
    ),
  }

  return next()
}
