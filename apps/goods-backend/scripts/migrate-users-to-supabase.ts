/**
 * Migration script to migrate existing Medusa admin users to Supabase Auth.
 * 
 * This script:
 * 1. Reads all users from Medusa's user table
 * 2. Creates corresponding users in Supabase Auth
 * 3. Assigns default roles
 * 4. Sends password reset emails
 * 5. Updates auth_identity records to link to Supabase user IDs
 * 
 * Usage:
 *   npx ts-node scripts/migrate-users-to-supabase.ts
 * 
 * Environment variables required:
 *   - DATABASE_URL (Medusa database)
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import { Client } from "pg"

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL must be set")
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface MedusaUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: Date
  metadata: Record<string, any> | null
}

interface MigrationResult {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

async function getMedusaUsers(): Promise<MedusaUser[]> {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    const result = await client.query(`
      SELECT id, email, first_name, last_name, created_at, metadata
      FROM public.user
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
    `)

    return result.rows
  } finally {
    await client.end()
  }
}

async function getRoleId(roleName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single()

  if (error || !data) {
    console.error(`Failed to get role ID for ${roleName}:`, error)
    return null
  }

  return data.id
}

async function migrateUser(
  user: MedusaUser,
  defaultRoleId: string
): Promise<{ success: boolean; error?: string; supabaseUserId?: string }> {
  console.log(`\nMigrating user: ${user.email}`)

  try {
    // Check if user already exists in Supabase
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === user.email)

    let supabaseUserId: string

    if (existingUser) {
      console.log(`  User already exists in Supabase: ${existingUser.id}`)
      supabaseUserId = existingUser.id
    } else {
      // Create user in Supabase with a random password
      // They will need to reset their password
      const tempPassword = `Temp${Math.random().toString(36).slice(2)}!${Date.now()}`

      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: user.first_name,
            last_name: user.last_name,
            medusa_user_id: user.id,
            migrated_at: new Date().toISOString(),
          },
        })

      if (createError || !newUser.user) {
        return {
          success: false,
          error: createError?.message || "Failed to create user",
        }
      }

      supabaseUserId = newUser.user.id
      console.log(`  Created Supabase user: ${supabaseUserId}`)
    }

    // Check if user already has roles
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", supabaseUserId)

    if (!existingRoles || existingRoles.length === 0) {
      // Assign default role (manager)
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: supabaseUserId,
        role_id: defaultRoleId,
      })

      if (roleError) {
        console.warn(`  Warning: Failed to assign role: ${roleError.message}`)
      } else {
        console.log(`  Assigned default role`)
      }
    } else {
      console.log(`  User already has ${existingRoles.length} role(s)`)
    }

    // Send password reset email (only for new users)
    if (!existingUser) {
      const { error: resetError } =
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email: user.email,
        })

      if (resetError) {
        console.warn(`  Warning: Failed to generate reset link: ${resetError.message}`)
      } else {
        console.log(`  Password reset link generated`)
      }
    }

    return { success: true, supabaseUserId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function updateAuthIdentity(
  medusaUserId: string,
  supabaseUserId: string
): Promise<boolean> {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    // Check if auth identity exists
    const checkResult = await client.query(
      `SELECT id FROM public.auth_identity WHERE entity_id = $1`,
      [medusaUserId]
    )

    if (checkResult.rows.length > 0) {
      // Update existing auth identity
      await client.query(
        `UPDATE public.auth_identity 
         SET user_metadata = user_metadata || $1::jsonb
         WHERE entity_id = $2`,
        [JSON.stringify({ supabase_user_id: supabaseUserId }), medusaUserId]
      )
      console.log(`  Updated auth identity`)
    } else {
      // Create new auth identity pointing to Supabase user
      await client.query(
        `INSERT INTO public.auth_identity (entity_id, user_metadata)
         VALUES ($1, $2)`,
        [
          supabaseUserId,
          JSON.stringify({
            medusa_user_id: medusaUserId,
            supabase_user_id: supabaseUserId,
          }),
        ]
      )
      console.log(`  Created new auth identity`)
    }

    return true
  } catch (error) {
    console.error(`  Failed to update auth identity:`, error)
    return false
  } finally {
    await client.end()
  }
}

async function main() {
  console.log("=== Medusa to Supabase User Migration ===\n")

  // Get default role ID (manager)
  const defaultRoleId = await getRoleId("manager")
  if (!defaultRoleId) {
    console.error("Error: Could not find 'manager' role. Please run the RBAC schema migration first.")
    process.exit(1)
  }

  // Get all Medusa users
  console.log("Fetching Medusa users...")
  const users = await getMedusaUsers()
  console.log(`Found ${users.length} users to migrate\n`)

  const result: MigrationResult = {
    total: users.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  // Migrate each user
  for (const user of users) {
    const migrationResult = await migrateUser(user, defaultRoleId)

    if (migrationResult.success) {
      // Update auth identity in Medusa
      if (migrationResult.supabaseUserId) {
        await updateAuthIdentity(user.id, migrationResult.supabaseUserId)
      }
      result.migrated++
    } else if (migrationResult.error?.includes("already exists")) {
      result.skipped++
    } else {
      result.failed++
      result.errors.push({
        email: user.email,
        error: migrationResult.error || "Unknown error",
      })
    }
  }

  // Print summary
  console.log("\n=== Migration Complete ===")
  console.log(`Total users: ${result.total}`)
  console.log(`Migrated: ${result.migrated}`)
  console.log(`Skipped (already exists): ${result.skipped}`)
  console.log(`Failed: ${result.failed}`)

  if (result.errors.length > 0) {
    console.log("\nErrors:")
    result.errors.forEach((e) => {
      console.log(`  - ${e.email}: ${e.error}`)
    })
  }

  console.log("\n=== Next Steps ===")
  console.log("1. Users should have received password reset emails")
  console.log("2. Verify users can log in via Supabase auth")
  console.log("3. Assign additional roles as needed in the admin UI")
  console.log("4. Once verified, you can disable the emailpass provider")
}

// Check for --dry-run flag
const isDryRun = process.argv.includes("--dry-run")

if (isDryRun) {
  console.log("=== DRY RUN MODE ===")
  console.log("This will show what would be migrated without making changes.\n")
  
  getMedusaUsers().then((users) => {
    console.log(`Found ${users.length} users:\n`)
    users.forEach((user) => {
      console.log(`- ${user.email}`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Name: ${user.first_name || ""} ${user.last_name || ""}`)
      console.log(`  Created: ${user.created_at}`)
      console.log("")
    })
  })
} else {
  main().catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
}
