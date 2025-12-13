import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@switchyard/framework/workflows-sdk"
import { Modules } from "@switchyard/framework/utils"
import { createClient } from "@supabase/supabase-js"

interface SyncSupabaseUserInput {
  supabaseUserId: string
  email?: string
  firstName?: string
  lastName?: string
  roles?: string[]
}

interface SyncSupabaseUserOutput {
  userId: string
  authIdentityId: string
  synced: boolean
}

/**
 * Step to sync a Supabase user to Medusa's auth_identity and user tables
 */
const syncSupabaseUserStep = createStep(
  "sync-supabase-user-step",
  async (input: SyncSupabaseUserInput, { container }) => {
    const userModuleService = container.resolve(Modules.USER)
    const authModuleService = container.resolve(Modules.AUTH)

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get user details from Supabase if not provided
    let email = input.email
    let userMetadata = {}

    if (!email) {
      const { data: supabaseUser, error } = await supabase.auth.admin.getUserById(
        input.supabaseUserId
      )
      
      if (error || !supabaseUser.user) {
        throw new Error(`Failed to fetch Supabase user: ${error?.message || 'User not found'}`)
      }

      email = supabaseUser.user.email
      userMetadata = supabaseUser.user.user_metadata || {}
    }

    if (!email) {
      throw new Error("User email is required")
    }

    // Get user roles from RBAC tables
    const { data: roles } = await supabase
      .rpc('get_user_roles', { p_user_id: input.supabaseUserId })

    const { data: permissions } = await supabase
      .rpc('get_user_permissions', { p_user_id: input.supabaseUserId })

    // Check if auth identity already exists
    let authIdentity: any
    try {
      // Use provider_identities filter instead of entity_id
      const existingIdentities = await authModuleService.listAuthIdentities({
        provider_identities: {
          entity_id: input.supabaseUserId,
        },
      } as any)
      
      if (existingIdentities.length > 0) {
        authIdentity = existingIdentities[0]
        // Update metadata - use selector + data pattern
        const [updated] = await authModuleService.updateAuthIdentities(
          { id: authIdentity.id } as any,
          {
            app_metadata: {
              ...(authIdentity.app_metadata || {}),
              roles: roles?.map((r: { role_name: string }) => r.role_name) || input.roles || [],
              permissions: permissions?.map((p: { permission_name: string }) => p.permission_name) || [],
              supabase_user_id: input.supabaseUserId,
              email,
              ...userMetadata,
            },
          } as any
        )
        authIdentity = updated || authIdentity
      }
    } catch (error) {
      // Identity doesn't exist, will create below
    }

    // Create auth identity if it doesn't exist
    if (!authIdentity) {
      authIdentity = await authModuleService.createAuthIdentities({
        provider_identities: [{
          entity_id: input.supabaseUserId,
          provider: "supabase",
        }],
        app_metadata: {
          email,
          roles: roles?.map((r: { role_name: string }) => r.role_name) || input.roles || [],
          permissions: permissions?.map((p: { permission_name: string }) => p.permission_name) || [],
          supabase_user_id: input.supabaseUserId,
          ...userMetadata,
        },
      } as any)
    }

    // Check if user already exists
    let user
    const existingUsers = await userModuleService.listUsers({
      email: email,
    })

    if (existingUsers.length > 0) {
      user = existingUsers[0]
      // Update user if needed
      if (input.firstName || input.lastName) {
        user = await userModuleService.updateUsers(
          { id: user.id } as any,
          {
            first_name: input.firstName || user.first_name,
            last_name: input.lastName || user.last_name,
          } as any
        )
      }
    } else {
      // Create new user
      user = await userModuleService.createUsers({
        email: email,
        first_name: input.firstName || (userMetadata as any).first_name,
        last_name: input.lastName || (userMetadata as any).last_name,
      })
    }

    // Link auth identity to user via app_metadata
    await authModuleService.updateAuthIdentities(
      { id: authIdentity.id } as any,
      {
        app_metadata: {
          ...(authIdentity.app_metadata || {}),
          user_id: user.id,
        },
      } as any
    )

    return new StepResponse({
      userId: user.id,
      authIdentityId: authIdentity.id,
      synced: true,
    })
  }
)

export const syncSupabaseUserWorkflowId = "sync-supabase-user-workflow"

/**
 * Workflow to sync a Supabase user to Medusa's auth_identity and user tables.
 * This ensures that Supabase users are properly linked to Medusa user records.
 * 
 * @example
 * const { result } = await syncSupabaseUserWorkflow(container)
 * .run({
 *   input: {
 *     supabaseUserId: "123e4567-e89b-12d3-a456-426614174000",
 *     email: "user@example.com",
 *     firstName: "John",
 *     lastName: "Doe",
 *     roles: ["manager"]
 *   }
 * })
 */
export const syncSupabaseUserWorkflow = createWorkflow(
  syncSupabaseUserWorkflowId,
  (
    input: WorkflowData<SyncSupabaseUserInput>
  ): WorkflowResponse<SyncSupabaseUserOutput> => {
    const result = syncSupabaseUserStep(input)
    return new WorkflowResponse(result)
  }
)
