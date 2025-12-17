/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Toaster,
  toast,
} from "@switchyard/ui"
import { useState, useEffect } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Supabase config - use import.meta.env for Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

// Create Supabase client for auth
let supabaseClient: SupabaseClient | null = null
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  if (!supabaseClient) {
    throw new Error("Supabase client not initialized")
  }
  return supabaseClient
}

/**
 * Custom login page that authenticates via Supabase
 * and then creates a session with Medusa.
 */
const SupabaseLoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle OAuth callback if user is returning from Google
  useEffect(() => {
    const handleOAuthCallback = async (session: any) => {
      if (session?.access_token && !loading) {
        setLoading(true)
        try {
          // Authenticate with backend using Supabase token
          const medusaResponse = await fetch("/auth/user/supabase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: session.access_token,
            }),
            credentials: "include",
          })

          if (!medusaResponse.ok) {
            const errorData = await medusaResponse.json()
            throw new Error(errorData.message || "Authentication failed")
          }

          toast.success("Login successful!")
          // Clean up URL before redirect
          window.history.replaceState({}, document.title, window.location.pathname)
          window.location.href = "/app"
        } catch (err) {
          console.error("OAuth callback error:", err)
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred during login"
          setError(errorMessage)
          toast.error(errorMessage)
          setLoading(false)
          // Clean up URL on error
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }
    }

    // Check for existing session on mount (OAuth callback)
    const supabase = getSupabaseClient()
    
    // Listen for auth state changes (catches OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await handleOAuthCallback(session)
      }
    })

    // Also check for existing session (in case callback already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleOAuthCallback(session)
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [loading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // First, authenticate with Supabase
      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      if (!supabaseResponse.ok) {
        const errorData = await supabaseResponse.json()
        throw new Error(errorData.error_description || "Authentication failed")
      }

      const supabaseData = await supabaseResponse.json()
      const accessToken = supabaseData.access_token

      // Now authenticate with Medusa using the Supabase token
      const medusaResponse = await fetch("/auth/user/supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
        credentials: "include",
      })

      if (!medusaResponse.ok) {
        const errorData = await medusaResponse.json()
        throw new Error(errorData.message || "Medusa authentication failed")
      }

      toast.success("Login successful!")
      
      // Redirect to admin dashboard
      window.location.href = "/app"
    } catch (err) {
      console.error("Login error:", err)
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during login"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send password reset email")
      }

      toast.success("Password reset email sent! Check your inbox.")
    } catch (err) {
      console.error("Password reset error:", err)
      toast.error(
        err instanceof Error ? err.message : "Failed to send password reset email"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      
      // Get the current URL to use as redirect URL (Supabase will redirect back here)
      const redirectTo = `${window.location.origin}${window.location.pathname}`
      
      // Initiate Google OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        throw new Error(error.message || "Failed to initiate Google sign-in")
      }

      // If we get a URL, redirect to Google
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Google sign-in error:", err)
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during Google sign-in"
      setError(errorMessage)
      toast.error(errorMessage)
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <Toaster />
      <div className="flex min-h-screen items-center justify-center bg-ui-bg-subtle">
        <Container className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Heading level="h1" className="mb-2">
              Goods Grocery
            </Heading>
            <Text className="text-ui-fg-subtle">
              Sign in to your admin account
            </Text>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-ui-bg-subtle-pressed border border-ui-border-error">
                <Text className="text-ui-fg-error text-sm">{error}</Text>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@goodsgrocery.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ui-border-base" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-ui-bg-subtle text-ui-fg-subtle">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full mt-4"
              disabled={loading || googleLoading}
              variant="secondary"
            >
              {googleLoading ? (
                "Connecting to Google..."
              ) : (
                <>
                  <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-ui-fg-interactive text-sm hover:underline"
              disabled={loading}
            >
              Forgot your password?
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-ui-border-base">
            <Text className="text-ui-fg-subtle text-sm text-center">
              Need help? Contact{" "}
              <a
                href="mailto:support@goodsgrocery.com"
                className="text-ui-fg-interactive hover:underline"
              >
                support@goodsgrocery.com
              </a>
            </Text>
          </div>
        </Container>
      </div>
    </>
  )
}

export const config = defineRouteConfig({
  label: "Supabase Login",
})

export default SupabaseLoginPage


