import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@switchyard/framework/types"
import {
  AbstractAuthModuleProvider,
  SwitchyardError,
  Modules,
} from "@switchyard/framework/utils"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"

type InjectedDependencies = {
  logger: Logger
}

export interface SupabaseAuthProviderOptions {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
}

export class SupabaseAuthService extends AbstractAuthModuleProvider {
  static identifier = "supabase"
  static DISPLAY_NAME = "Supabase Authentication"

  protected config_: SupabaseAuthProviderOptions
  protected logger_: Logger
  protected supabaseClient_: SupabaseClient
  protected supabaseAdmin_: SupabaseClient

  static validateOptions(options: SupabaseAuthProviderOptions) {
    if (!options.supabaseUrl) {
      throw new Error("Supabase URL is required")
    }
    if (!options.supabaseAnonKey) {
      throw new Error("Supabase anon key is required")
    }
    if (!options.supabaseServiceRoleKey) {
      throw new Error("Supabase service role key is required")
    }
  }

  constructor(
    { logger }: InjectedDependencies,
    options: SupabaseAuthProviderOptions
  ) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = logger

    // Public client for user auth
    this.supabaseClient_ = createClient(
      options.supabaseUrl,
      options.supabaseAnonKey
    )

    // Admin client for user management
    this.supabaseAdmin_ = createClient(
      options.supabaseUrl,
      options.supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  async register(_: AuthenticationInput): Promise<AuthenticationResponse> {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_ALLOWED,
      "Registration should be done through Supabase directly or via user invitation"
    )
  }

  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const body = req.body ?? {}
    const { email, password, access_token, api_key } = body

    // Handle service account (robot) authentication via API key
    if (api_key) {
      return this.authenticateServiceAccount(api_key, authIdentityService)
    }

    // If access_token provided, validate it (for already-authenticated users)
    if (access_token) {
      return this.validateToken(access_token, authIdentityService)
    }

    // Otherwise, authenticate with email/password via Supabase
    if (!email || !password) {
      return { success: false, error: "Email and password are required" }
    }

    try {
      const { data, error } = await this.supabaseClient_.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user || !data.session) {
        return { success: false, error: "Authentication failed" }
      }

      // Validate the token and create/retrieve auth identity
      return this.validateToken(data.session.access_token, authIdentityService)
    } catch (error: any) {
      this.logger_.error(`Supabase authentication error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  async validateCallback(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    // Handle OAuth callback if using Supabase OAuth providers
    const query = req.query ?? {}
    const { access_token } = query

    if (!access_token) {
      return { success: false, error: "No access token provided" }
    }

    return this.validateToken(access_token as string, authIdentityService)
  }

  private async validateToken(
    accessToken: string,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    try {
      // Verify the Supabase JWT
      const { data: { user }, error } = await this.supabaseAdmin_.auth.getUser(accessToken)

      if (error || !user) {
        return { success: false, error: error?.message || "Invalid token" }
      }

      // Get user roles from our RBAC tables
      const { data: roles, error: rolesError } = await this.supabaseAdmin_
        .rpc('get_user_roles', { p_user_id: user.id })

      if (rolesError) {
        this.logger_.warn(`Failed to fetch user roles: ${rolesError.message}`)
      }

      // Get user permissions
      const { data: permissions, error: permissionsError } = await this.supabaseAdmin_
        .rpc('get_user_permissions', { p_user_id: user.id })

      if (permissionsError) {
        this.logger_.warn(`Failed to fetch user permissions: ${permissionsError.message}`)
      }

      const entity_id = user.id
      
      // Extract user info from Google OAuth metadata if available
      const googleMetadata = user.user_metadata || {}
      const firstName = googleMetadata.given_name || googleMetadata.first_name || 
        (googleMetadata.name ? googleMetadata.name.split(' ')[0] : null)
      const lastName = googleMetadata.family_name || googleMetadata.last_name || 
        (googleMetadata.name ? googleMetadata.name.split(' ').slice(1).join(' ') : null)
      const profilePicture = googleMetadata.picture || googleMetadata.avatar_url || null
      
      const userMetadata = {
        email: user.email,
        phone: user.phone,
        roles: roles?.map((r: { role_name: string }) => r.role_name) || [],
        permissions: permissions?.map((p: { permission_name: string }) => p.permission_name) || [],
        supabase_user_id: user.id,
        email_confirmed: user.email_confirmed_at !== null,
        user_metadata: user.user_metadata,
        // Include Google profile data
        first_name: firstName,
        last_name: lastName,
        picture: profilePicture,
      }

      let authIdentity
      let isNewAuthIdentity = false
      try {
        // Try to retrieve existing auth identity by entity_id (Supabase user ID)
        authIdentity = await authIdentityService.retrieve({ entity_id })
        // Update metadata if changed
        authIdentity = await authIdentityService.update(authIdentity.id, {
          user_metadata: userMetadata,
        })
        
        // Ensure existing auth identity is linked to a user
        if (user.email && !authIdentity.app_metadata?.user_id) {
          const { data: existingUser } = await this.supabaseAdmin_
            .from('user')
            .select('id')
            .eq('email', user.email)
            .single()
          
          if (existingUser) {
            // Link to existing user
            await this.supabaseAdmin_
              .from('auth_identity')
              .update({ 
                app_metadata: { 
                  ...authIdentity.app_metadata,
                  user_id: existingUser.id,
                  picture: profilePicture,
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', authIdentity.id)
            authIdentity.app_metadata = { 
              ...authIdentity.app_metadata,
              user_id: existingUser.id,
              picture: profilePicture,
            }
          } else {
            // Create new user for existing auth identity
            try {
              const userModuleService = this.container_.resolve(Modules.USER)
              const newUser = await userModuleService.createUsers({
                email: user.email,
                first_name: firstName || undefined,
                last_name: lastName || undefined,
              })
              
              await this.supabaseAdmin_
                .from('auth_identity')
                .update({ 
                  app_metadata: { 
                    ...authIdentity.app_metadata,
                    user_id: newUser.id,
                    picture: profilePicture,
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', authIdentity.id)
              
              authIdentity.app_metadata = { 
                ...authIdentity.app_metadata,
                user_id: newUser.id,
                picture: profilePicture,
              }
              this.logger_.info(`Auto-created user record for existing auth identity: ${newUser.id}`)
            } catch (createUserError: any) {
              this.logger_.error(`Failed to auto-create user for existing auth identity: ${createUserError.message}`)
            }
          }
        }
      } catch (error: any) {
        if (error.type === SwitchyardError.Types.NOT_FOUND) {
          try {
            // Create new auth identity
            authIdentity = await authIdentityService.create({
              entity_id,
              user_metadata: userMetadata,
            })
            isNewAuthIdentity = true
            
            // Try to auto-link to existing user by email, or create new user
            if (user.email) {
              const { data: existingUser } = await this.supabaseAdmin_
                .from('user')
                .select('id')
                .eq('email', user.email)
                .single()
              
              if (existingUser) {
                // Link auth identity to existing user via direct database update
                await this.supabaseAdmin_
                  .from('auth_identity')
                  .update({ 
                    app_metadata: { user_id: existingUser.id },
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', authIdentity.id)
                
                // Update authIdentity object to reflect the change
                authIdentity.app_metadata = { user_id: existingUser.id }
                this.logger_.info(`Auto-linked auth identity to existing user: ${existingUser.id}`)
              } else {
                // Create new user record automatically
                try {
                  const userModuleService = this.container_.resolve(Modules.USER)
                  const newUser = await userModuleService.createUsers({
                    email: user.email,
                    first_name: firstName || undefined,
                    last_name: lastName || undefined,
                  })
                  
                  // Link auth identity to new user
                  await this.supabaseAdmin_
                    .from('auth_identity')
                    .update({ 
                      app_metadata: { 
                        user_id: newUser.id,
                        picture: profilePicture, // Store profile picture in app_metadata
                      },
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', authIdentity.id)
                  
                  authIdentity.app_metadata = { 
                    user_id: newUser.id,
                    picture: profilePicture,
                  }
                  this.logger_.info(`Auto-created user record: ${newUser.id} for new Google sign-in`)
                } catch (createUserError: any) {
                  this.logger_.error(`Failed to auto-create user: ${createUserError.message}`)
                  // Continue without user record - user can be created manually later
                }
              }
            }
          } catch (createError: any) {
            // If creation fails due to unique constraint, the identity already exists
            // This means retrieve didn't find it but it exists - try to retrieve by provider
            if (createError.message?.includes('already exists')) {
              this.logger_.info(`Provider identity already exists for entity_id: ${entity_id}, attempting retrieval...`)
              // The identity exists, we just need to find and return it
              // Query provider_identity directly to get auth_identity_id
              const { data: providerIdentity } = await this.supabaseAdmin_
                .from('provider_identity')
                .select('auth_identity_id')
                .eq('entity_id', entity_id)
                .eq('provider', 'supabase')
                .single()
              
              if (providerIdentity?.auth_identity_id) {
                // Retrieve the auth_identity directly from the database
                const { data: existingAuthIdentity } = await this.supabaseAdmin_
                  .from('auth_identity')
                  .select('*')
                  .eq('id', providerIdentity.auth_identity_id)
                  .single()
                
                if (existingAuthIdentity) {
                  authIdentity = existingAuthIdentity
                } else {
                  return { success: false, error: "Failed to retrieve existing auth identity" }
                }
              } else {
                return { success: false, error: "Failed to retrieve existing auth identity" }
              }
            } else {
              return { success: false, error: createError.message }
            }
          }
        } else {
          return { success: false, error: error.message }
        }
      }

      return { success: true, authIdentity }
    } catch (error: any) {
      this.logger_.error(`Token validation error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  private async authenticateServiceAccount(
    apiKey: string,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    try {
      // Hash the API key and look up in service_accounts table
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

      const { data: serviceAccount, error } = await this.supabaseAdmin_
        .from('service_accounts')
        .select('*, roles(*)')
        .eq('api_key_hash', keyHash)
        .eq('is_active', true)
        .single()

      if (error || !serviceAccount) {
        return { success: false, error: "Invalid API key" }
      }

      // Update last_used_at
      await this.supabaseAdmin_
        .from('service_accounts')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', serviceAccount.id)

      // Get permissions for the service account's role
      const { data: permissions } = await this.supabaseAdmin_
        .from('role_permissions')
        .select('permissions(name)')
        .eq('role_id', serviceAccount.role_id)

      const permissionNames = (permissions as Array<{ permissions: { name: string } | null }> | null)?.map(
        (p) => p.permissions?.name
      ).filter((name): name is string => !!name) || []

      // Create/retrieve auth identity for service account
      const entity_id = `service:${serviceAccount.id}`
      const userMetadata = {
        type: 'service_account',
        name: serviceAccount.name,
        roles: [serviceAccount.roles?.name || 'robot'],
        permissions: permissionNames,
        service_account_id: serviceAccount.id,
      }

      let authIdentity
      try {
        authIdentity = await authIdentityService.retrieve({ entity_id })
        authIdentity = await authIdentityService.update(authIdentity.id, {
          user_metadata: userMetadata,
        })
      } catch (error: any) {
        if (error.type === SwitchyardError.Types.NOT_FOUND) {
          authIdentity = await authIdentityService.create({
            entity_id,
            user_metadata: userMetadata,
          })
        } else {
          return { success: false, error: error.message }
        }
      }

      return { success: true, authIdentity }
    } catch (error: any) {
      this.logger_.error(`Service account authentication error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
}


