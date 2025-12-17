import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Button, Heading, Hint, Input } from "@switchyard/ui"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router-dom"
import * as z from "zod"
import { useState, useEffect } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

import { Form } from "../../components/common/form"
import { useSignInWithEmailPass } from "../../hooks/api"
import { isFetchError } from "../../lib/is-fetch-error"
import { useExtension } from "../../providers/extension-provider"

// Supabase config for Google OAuth
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

let supabaseClient: SupabaseClient | null = null
function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseClient
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// Track if we're already processing OAuth callback to prevent loops
let isProcessingOAuth = false

export const Login = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { getWidgets } = useExtension()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [oauthProcessed, setOauthProcessed] = useState(false)

  const from = location.state?.from?.pathname || "/orders"

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { mutateAsync, isPending } = useSignInWithEmailPass()

  // Handle OAuth callback if user is returning from Google
  useEffect(() => {
    // Check if we're returning from OAuth (hash contains access_token or we have a fresh session)
    const hash = window.location.hash
    const isOAuthCallback = hash.includes("access_token") || hash.includes("token_type")
    
    // Skip if not an OAuth callback or already processed
    if (!isOAuthCallback || oauthProcessed || isProcessingOAuth) {
      return
    }

    const handleOAuthCallback = async () => {
      // Prevent concurrent/repeated processing
      if (isProcessingOAuth) return
      isProcessingOAuth = true
      setGoogleLoading(true)

      const supabase = getSupabaseClient()
      if (!supabase) {
        isProcessingOAuth = false
        setGoogleLoading(false)
        return
      }

      try {
        // Get the session from Supabase (this parses the hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.access_token) {
          throw new Error(sessionError?.message || "No session found")
        }

        // Authenticate with backend using Supabase token
        const response = await fetch("/auth/user/supabase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: session.access_token }),
          credentials: "include",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Authentication failed (${response.status})`)
        }

        // Create backend session
        const sessionResponse = await fetch("/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })

        if (!sessionResponse.ok) {
          throw new Error(`Session creation failed (${sessionResponse.status})`)
        }

        // Clear URL hash and navigate
        window.history.replaceState({}, document.title, window.location.pathname)
        setOauthProcessed(true)
        navigate(from, { replace: true })
      } catch (err) {
        console.error("OAuth callback error:", err)
        setGoogleError(err instanceof Error ? err.message : "OAuth login failed")
        
        // Sign out from Supabase to prevent infinite loop
        const supabase = getSupabaseClient()
        if (supabase) {
          await supabase.auth.signOut()
        }
        
        // Clear URL hash
        window.history.replaceState({}, document.title, window.location.pathname)
        setOauthProcessed(true)
      } finally {
        isProcessingOAuth = false
        setGoogleLoading(false)
      }
    }

    handleOAuthCallback()
  }, [from, navigate, oauthProcessed])

  const handleGoogleSignIn = async () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setGoogleError("Google sign-in not configured")
      return
    }

    setGoogleLoading(true)
    setGoogleError(null)

    try {
      // Use current URL for redirect - ensures it works in both dev and production
      // The redirect URL must be whitelisted in Supabase Dashboard > Authentication > URL Configuration
      const redirectTo = window.location.href.split('#')[0].split('?')[0]
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      })

      if (error) throw new Error(error.message)
      if (data?.url) window.location.href = data.url
    } catch (err) {
      console.error("Google sign-in error:", err)
      setGoogleError(err instanceof Error ? err.message : "Google sign-in failed")
      setGoogleLoading(false)
    }
  }

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    await mutateAsync(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          if (isFetchError(error)) {
            if (error.status === 401) {
              form.setError("email", {
                type: "manual",
                message: error.message,
              })

              return
            }
          }

          form.setError("root.serverError", {
            type: "manual",
            message: error.message,
          })
        },
        onSuccess: () => {
          navigate(from, { replace: true })
        },
      }
    )
  })

  const serverError = form.formState.errors?.root?.serverError?.message
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh w-dvw items-center justify-center">
      <div className="m-4 flex w-full max-w-[280px] flex-col items-center">
        <img 
          src="https://epwngkevdzaehiivtzpd.supabase.co/storage/v1/object/public/branding-assets/goods-logo.png" 
          alt="Goods Admin" 
          className="mb-4 h-12 w-auto"
        />
        <div className="mb-4 flex flex-col items-center">
          <Heading>Employee Login</Heading>
        </div>
        <div className="flex w-full flex-col gap-y-3">
          {getWidgets("login.before").map((Component, i) => {
            return <Component key={i} />
          })}
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-y-6"
            >
              <div className="flex flex-col gap-y-1">
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Control>
                          <Input
                            autoComplete="email"
                            {...field}
                            className="bg-ui-bg-field-component"
                            placeholder={t("fields.email")}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
                <Form.Field
                  control={form.control}
                  name="password"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Label>{}</Form.Label>
                        <Form.Control>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            {...field}
                            className="bg-ui-bg-field-component"
                            placeholder={t("fields.password")}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
              </div>
              {validationError && (
                <div className="text-center">
                  <Hint className="inline-flex" variant={"error"}>
                    {validationError}
                  </Hint>
                </div>
              )}
              {serverError && (
                <Alert
                  className="bg-ui-bg-base items-center p-2"
                  dismissible
                  variant="error"
                >
                  {serverError}
                </Alert>
              )}
              <Button 
                className="w-full bg-[#00713d] hover:bg-[#005a31]" 
                type="submit" 
                isLoading={isPending}
                disabled={googleLoading}
              >
                {t("actions.continueWithEmail")}
              </Button>
            </form>
          </Form>
          
          {/* Google Sign-In */}
          {SUPABASE_URL && SUPABASE_ANON_KEY && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ui-border-base" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-ui-bg-subtle px-2 text-ui-fg-muted">
                    or
                  </span>
                </div>
              </div>
              
              {googleError && (
                <Alert
                  className="bg-ui-bg-base items-center p-2 mb-2"
                  dismissible
                  variant="error"
                >
                  {googleError}
                </Alert>
              )}
              
              <Button
                type="button"
                variant="secondary"
                className="w-full h-10"
                onClick={handleGoogleSignIn}
                disabled={isPending || googleLoading}
              >
                {googleLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </>
          )}
          
          {getWidgets("login.after").map((Component, i) => {
            return <Component key={i} />
          })}
        </div>
        <span className="text-ui-fg-muted txt-small my-6">
          <Trans
            i18nKey="login.forgotPassword"
            components={[
              <Link
                key="reset-password-link"
                to="/reset-password"
                className="text-[#f48308] transition-fg hover:text-[#d97007] focus-visible:text-[#d97007] font-medium outline-none"
              />,
            ]}
          />
        </span>
      </div>
    </div>
  )
}
