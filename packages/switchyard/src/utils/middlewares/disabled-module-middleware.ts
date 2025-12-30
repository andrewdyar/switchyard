/**
 * Middleware factory for handling disabled modules
 * 
 * Returns empty results for modules that are disabled in switchyard.config.ts
 * This prevents 500 errors when the admin dashboard tries to access these routes.
 */

import { NextFunction, Request, Response } from "express"

/**
 * Create middleware that checks if a module is registered.
 * If the module is not registered (disabled), returns an empty result.
 */
export const createDisabledModuleMiddleware = (
  serviceName: string,
  resourceName: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = (req as any).scope.resolve(serviceName, { allowUnregistered: true })
      
      if (!service) {
        // Module is disabled, return empty results
        return res.status(200).json({
          [resourceName]: [],
          count: 0,
          offset: 0,
          limit: 20,
        })
      }
      
      return next()
    } catch (error) {
      // If we can't resolve the service, assume it's disabled
      return res.status(200).json({
        [resourceName]: [],
        count: 0,
        offset: 0,
        limit: 20,
      })
    }
  }
}

/**
 * Create middleware that returns a single empty resource (for retrieve endpoints)
 */
export const createDisabledModuleRetrieveMiddleware = (
  serviceName: string,
  resourceName: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = (req as any).scope.resolve(serviceName, { allowUnregistered: true })
      
      if (!service) {
        // Module is disabled, return 404
        return res.status(404).json({
          type: "not_found",
          message: `${resourceName} not found (module disabled)`,
        })
      }
      
      return next()
    } catch (error) {
      return res.status(404).json({
        type: "not_found",
        message: `${resourceName} not found (module disabled)`,
      })
    }
  }
}

// Pre-configured middlewares for common disabled modules
export const isStoreModuleEnabled = createDisabledModuleMiddleware("storeModuleService", "stores")
export const isRegionModuleEnabled = createDisabledModuleMiddleware("regionModuleService", "regions")
export const isSalesChannelModuleEnabled = createDisabledModuleMiddleware("salesChannelModuleService", "sales_channels")
export const isNotificationModuleEnabled = createDisabledModuleMiddleware("notificationModuleService", "notifications")
export const isPricingModuleEnabled = createDisabledModuleMiddleware("pricingModuleService", "price_lists")
export const isTaxModuleEnabled = createDisabledModuleMiddleware("taxModuleService", "tax_regions")
export const isFulfillmentModuleEnabled = createDisabledModuleMiddleware("fulfillmentModuleService", "shipping_profiles")
