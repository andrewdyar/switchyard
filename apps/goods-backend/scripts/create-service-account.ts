/**
 * Script to create a service account for robots/automated systems.
 * 
 * Usage:
 *   npx ts-node scripts/create-service-account.ts --name "Inventory Scanner Bot" --role robot
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface CreateServiceAccountOptions {
  name: string
  roleName: string
}

async function generateApiKey(): Promise<{ key: string; hash: string }> {
  // Generate a random API key
  const keyBytes = crypto.randomBytes(32)
  const key = `sk_robot_${keyBytes.toString("hex")}`
  
  // Hash it for storage
  const hash = crypto.createHash("sha256").update(key).digest("hex")
  
  return { key, hash }
}

async function createServiceAccount(options: CreateServiceAccountOptions) {
  const { name, roleName } = options

  console.log(`Creating service account: ${name}`)
  console.log(`Role: ${roleName}`)

  // Get the role ID
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single()

  if (roleError || !role) {
    console.error(`Error: Role "${roleName}" not found`)
    console.error(roleError)
    process.exit(1)
  }

  // Generate API key
  const { key, hash } = await generateApiKey()

  // Create the service account
  const { data: serviceAccount, error: createError } = await supabase
    .from("service_accounts")
    .insert({
      name,
      api_key_hash: hash,
      role_id: role.id,
      is_active: true,
    })
    .select()
    .single()

  if (createError) {
    console.error("Error creating service account:")
    console.error(createError)
    process.exit(1)
  }

  console.log("\n=== Service Account Created ===")
  console.log(`ID: ${serviceAccount.id}`)
  console.log(`Name: ${serviceAccount.name}`)
  console.log(`Role: ${roleName}`)
  console.log(`\nAPI Key (save this - it will not be shown again):`)
  console.log(`\n  ${key}\n`)
  console.log("================================")
  
  return {
    id: serviceAccount.id,
    name: serviceAccount.name,
    apiKey: key,
    roleId: role.id,
  }
}

async function listServiceAccounts() {
  const { data, error } = await supabase
    .from("service_accounts")
    .select("*, roles(name)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error listing service accounts:")
    console.error(error)
    process.exit(1)
  }

  console.log("\n=== Service Accounts ===")
  if (!data || data.length === 0) {
    console.log("No service accounts found.")
  } else {
    data.forEach((account) => {
      console.log(`- ${account.name}`)
      console.log(`  ID: ${account.id}`)
      console.log(`  Role: ${account.roles?.name || "unknown"}`)
      console.log(`  Active: ${account.is_active}`)
      console.log(`  Last used: ${account.last_used_at || "Never"}`)
      console.log(`  Created: ${account.created_at}`)
      console.log("")
    })
  }
  console.log("========================")
}

async function revokeServiceAccount(id: string) {
  const { error } = await supabase
    .from("service_accounts")
    .update({ is_active: false })
    .eq("id", id)

  if (error) {
    console.error("Error revoking service account:")
    console.error(error)
    process.exit(1)
  }

  console.log(`Service account ${id} has been revoked.`)
}

async function deleteServiceAccount(id: string) {
  const { error } = await supabase.from("service_accounts").delete().eq("id", id)

  if (error) {
    console.error("Error deleting service account:")
    console.error(error)
    process.exit(1)
  }

  console.log(`Service account ${id} has been deleted.`)
}

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case "create": {
      const nameIndex = args.indexOf("--name")
      const roleIndex = args.indexOf("--role")

      if (nameIndex === -1 || roleIndex === -1) {
        console.error("Usage: create --name <name> --role <role>")
        console.error("Available roles: superadmin, manager, picker, driver, robot")
        process.exit(1)
      }

      const name = args[nameIndex + 1]
      const role = args[roleIndex + 1]

      if (!name || !role) {
        console.error("Name and role are required")
        process.exit(1)
      }

      await createServiceAccount({ name, roleName: role })
      break
    }

    case "list":
      await listServiceAccounts()
      break

    case "revoke": {
      const id = args[1]
      if (!id) {
        console.error("Usage: revoke <id>")
        process.exit(1)
      }
      await revokeServiceAccount(id)
      break
    }

    case "delete": {
      const id = args[1]
      if (!id) {
        console.error("Usage: delete <id>")
        process.exit(1)
      }
      await deleteServiceAccount(id)
      break
    }

    default:
      console.log("Service Account Management Tool")
      console.log("")
      console.log("Commands:")
      console.log("  create --name <name> --role <role>  Create a new service account")
      console.log("  list                                 List all service accounts")
      console.log("  revoke <id>                          Revoke a service account")
      console.log("  delete <id>                          Delete a service account")
      console.log("")
      console.log("Available roles: superadmin, manager, picker, driver, robot")
  }
}

main().catch(console.error)
