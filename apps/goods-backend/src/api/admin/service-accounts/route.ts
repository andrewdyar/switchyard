import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Supabase configuration missing")
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * GET /admin/service-accounts
 * List all service accounts
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("service_accounts")
      .select("id, name, role_id, is_active, last_used_at, created_at, roles(id, name)")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    res.json({
      service_accounts: data.map((account) => ({
        id: account.id,
        name: account.name,
        role: account.roles,
        is_active: account.is_active,
        last_used_at: account.last_used_at,
        created_at: account.created_at,
      })),
    })
  } catch (error: any) {
    console.error("Error listing service accounts:", error)
    res.status(500).json({
      error: "Failed to list service accounts",
      message: error.message,
    })
  }
}

interface CreateServiceAccountBody {
  name: string
  role_id: string
}

/**
 * POST /admin/service-accounts
 * Create a new service account
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<CreateServiceAccountBody>,
  res: MedusaResponse
) => {
  const { name, role_id } = req.body

  if (!name || !role_id) {
    res.status(400).json({ error: "Name and role_id are required" })
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    // Generate API key
    const keyBytes = crypto.randomBytes(32)
    const apiKey = `sk_robot_${keyBytes.toString("hex")}`
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")

    // Create the service account
    const { data, error } = await supabase
      .from("service_accounts")
      .insert({
        name,
        api_key_hash: keyHash,
        role_id,
        is_active: true,
      })
      .select("id, name, role_id, is_active, created_at, roles(id, name)")
      .single()

    if (error) {
      throw error
    }

    res.status(201).json({
      service_account: {
        id: data.id,
        name: data.name,
        role: data.roles,
        is_active: data.is_active,
        created_at: data.created_at,
      },
      // Only return the API key once at creation time
      api_key: apiKey,
    })
  } catch (error: any) {
    console.error("Error creating service account:", error)
    res.status(500).json({
      error: "Failed to create service account",
      message: error.message,
    })
  }
}
