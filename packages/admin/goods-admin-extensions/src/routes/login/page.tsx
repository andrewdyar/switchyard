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
import { useState } from "react"

const SUPABASE_URL = process.env.MEDUSA_ADMIN_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.MEDUSA_ADMIN_SUPABASE_ANON_KEY || ""

/**
 * Custom login page that authenticates via Supabase
 * and then creates a session with Medusa.
 */
const SupabaseLoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Now authenticate with Switchyard using the Supabase token
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
        throw new Error(errorData.message || "Switchyard authentication failed")
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

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
