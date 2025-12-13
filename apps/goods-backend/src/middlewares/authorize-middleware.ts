import { NextFunction, RequestHandler } from "express"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Cache for user permissions to reduce database queries
const permissionCache = new Map<string, { permissions: string[]; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

/**
 * Authorization middleware that checks if the authenticated user has the required permissions.
 * 
 * @param requiredPermissions - Single permission or array of permissions. User needs ANY of these.
 * @returns Express middleware handler
 * 
 * @example
 * // Single permission
 * authorize("orders.read")
 * 
 * @example
 * // Multiple permissions (user needs any one)
 * authorize(["orders.read", "orders.write"])
 */
export const authorize = (
  requiredPermissions: string | string[]
): RequestHandler => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions]

  const authorizeMiddleware = async (
    req: SwitchyardRequest,
    res: SwitchyardResponse,
    next: NextFunction
  ): Promise<void> => {
    const authReq = req as AuthenticatedSwitchyardRequest

    // Check if user is authenticated
    if (!authReq.auth_context) {
      res.status(401).json({ message: "Authentication required" })
      return
    }

    const authContext = authReq.auth_context

    // API keys get special handling - they have admin access
    if (authContext.actor_type === "api-key") {
      return next()
    }

    // Get user metadata from auth identity
    const userMetadata = (authContext as any).auth_identity?.user_metadata || {}
    const userRoles: string[] = userMetadata.roles || []
    const userPermissions: string[] = userMetadata.permissions || []

    // Superadmin bypasses all permission checks
    if (userRoles.includes("superadmin")) {
      return next()
    }

    // Check if user has any of the required permissions from cached metadata
    if (userPermissions.length > 0) {
      const hasPermission = permissions.some((p) => userPermissions.includes(p))
      if (hasPermission) {
        return next()
      }
    }

    // If permissions not in metadata, query Supabase directly
    const userId = authContext.actor_id || userMetadata.supabase_user_id
    
    if (userId) {
      const freshPermissions = await getUserPermissionsFromSupabase(userId)
      const hasPermission = permissions.some((p) => freshPermissions.includes(p))
      
      if (hasPermission) {
        return next()
      }
    }

    res.status(403).json({
      message: `Forbidden: Missing required permission. Required: ${permissions.join(" or ")}`,
    })
  }

  return authorizeMiddleware as unknown as RequestHandler
}

/**
 * Middleware to require a specific role (or any of multiple roles)
 */
export const requireRole = (
  requiredRoles: string | string[]
): RequestHandler => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  const requireRoleMiddleware = async (
    req: SwitchyardRequest,
    res: SwitchyardResponse,
    next: NextFunction
  ): Promise<void> => {
    const authReq = req as AuthenticatedSwitchyardRequest

    if (!authReq.auth_context) {
      res.status(401).json({ message: "Authentication required" })
      return
    }

    const authContext = authReq.auth_context

    // API keys get special handling
    if (authContext.actor_type === "api-key") {
      return next()
    }

    const userMetadata = (authContext as any).auth_identity?.user_metadata || {}
    const userRoles: string[] = userMetadata.roles || []

    // Check if user has any of the required roles
    const hasRole = roles.some((r) => userRoles.includes(r))

    if (hasRole) {
      return next()
    }

    // Query Supabase directly if not found in metadata
    const userId = authContext.actor_id || userMetadata.supabase_user_id
    
    if (userId) {
      const freshRoles = await getUserRolesFromSupabase(userId)
      const hasRequiredRole = roles.some((r) => freshRoles.includes(r))
      
      if (hasRequiredRole) {
        return next()
      }
    }

    res.status(403).json({
      message: `Forbidden: Missing required role. Required: ${roles.join(" or ")}`,
    })
  }

  return requireRoleMiddleware as unknown as RequestHandler
}

/**
 * Middleware that requires superadmin role
 */
export const requireSuperadmin = (): RequestHandler => {
  return requireRole("superadmin")
}

// Helper function to get Supabase admin client
function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Query user permissions from Supabase with caching
async function getUserPermissionsFromSupabase(userId: string): Promise<string[]> {
  // Check cache first
  const cached = permissionCache.get(`permissions:${userId}`)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase.rpc("get_user_permissions", {
      p_user_id: userId,
    })

    if (error) {
      console.error("Error fetching user permissions:", error)
      return []
    }

    const permissions = data?.map((p: { permission_name: string }) => p.permission_name) || []
    
    // Cache the result
    permissionCache.set(`permissions:${userId}`, {
      permissions,
      timestamp: Date.now(),
    })

    return permissions
  } catch (error) {
    console.error("Error querying Supabase for permissions:", error)
    return []
  }
}

// Query user roles from Supabase with caching
async function getUserRolesFromSupabase(userId: string): Promise<string[]> {
  // Check cache first
  const cached = permissionCache.get(`roles:${userId}`)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions // reusing the same structure
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase.rpc("get_user_roles", {
      p_user_id: userId,
    })

    if (error) {
      console.error("Error fetching user roles:", error)
      return []
    }

    const roles = data?.map((r: { role_name: string }) => r.role_name) || []
    
    // Cache the result
    permissionCache.set(`roles:${userId}`, {
      permissions: roles,
      timestamp: Date.now(),
    })

    return roles
  } catch (error) {
    console.error("Error querying Supabase for roles:", error)
    return []
  }
}

/**
 * Clear permission cache for a specific user or all users
 */
export function clearPermissionCache(userId?: string): void {
  if (userId) {
    permissionCache.delete(`permissions:${userId}`)
    permissionCache.delete(`roles:${userId}`)
  } else {
    permissionCache.clear()
  }
}
