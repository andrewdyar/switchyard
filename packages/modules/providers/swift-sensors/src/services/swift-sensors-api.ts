import { Logger } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"
import type {
  SwiftSensorsAuthResponse,
  SwiftSensorsHardwareTree,
  SwiftSensorsOptions,
  SwiftSensorsSensorDetails,
  SwiftSensorsSensorUpdates,
  SwiftSensorsTimeSeriesRequest,
  SwiftSensorsTimeSeriesResponse,
  SwiftSensorsTokenInfo,
} from "../types"

const DEFAULT_BASE_URL = "https://api.swiftsensors.net"

export class SwiftSensorsAPIClient {
  protected apiKey_: string
  protected email_: string
  protected password_: string
  protected baseUrl_: string
  protected logger_?: Logger
  protected tokenInfo_?: SwiftSensorsTokenInfo

  constructor(
    options: SwiftSensorsOptions,
    dependencies?: { logger?: Logger }
  ) {
    if (!options.apiKey) {
      throw new SwitchyardError(
        SwitchyardError.Types.INVALID_DATA,
        "Swift Sensors API key is required"
      )
    }
    if (!options.email || !options.password) {
      throw new SwitchyardError(
        SwitchyardError.Types.INVALID_DATA,
        "Swift Sensors email and password are required"
      )
    }

    this.apiKey_ = options.apiKey
    this.email_ = options.email
    this.password_ = options.password
    this.baseUrl_ = options.baseUrl || DEFAULT_BASE_URL
    this.logger_ = dependencies?.logger
  }

  /**
   * Get authentication headers with API key and bearer token
   */
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const tokenInfo = await this.ensureValidToken()
    return {
      "X-API-Key": this.apiKey_,
      Authorization: `Bearer ${tokenInfo.accessToken}`,
      "Content-Type": "application/json",
    }
  }

  /**
   * Sign in and get access token
   */
  async signIn(): Promise<SwiftSensorsTokenInfo> {
    try {
      const response = await fetch(`${this.baseUrl_}/api/client/v1/sign-in`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey_,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: this.email_,
          password: this.password_,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.UNAUTHORIZED,
          `Failed to sign in: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      const data: SwiftSensorsAuthResponse = await response.json()

      this.tokenInfo_ = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        accountId: data.account_id,
      }

      return this.tokenInfo_
    } catch (error) {
      this.logger_?.error("Swift Sensors sign-in failed", error)
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<SwiftSensorsTokenInfo> {
    try {
      const response = await fetch(`${this.baseUrl_}/api/token/v2/refresh`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey_,
          "Content-Type": "text/plain",
        },
        body: refreshToken,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.UNAUTHORIZED,
          `Failed to refresh token: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      const data: SwiftSensorsAuthResponse = await response.json()

      this.tokenInfo_ = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        accountId: this.tokenInfo_?.accountId || "",
      }

      return this.tokenInfo_
    } catch (error) {
      this.logger_?.error("Swift Sensors token refresh failed", error)
      throw error
    }
  }

  /**
   * Ensure we have a valid token (sign in or refresh if needed)
   */
  protected async ensureValidToken(): Promise<SwiftSensorsTokenInfo> {
    // If we don't have a token, sign in
    if (!this.tokenInfo_) {
      return await this.signIn()
    }

    // If token expires in less than 5 minutes, refresh it
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000
    if (this.tokenInfo_.expiresAt < fiveMinutesFromNow) {
      try {
        return await this.refreshToken(this.tokenInfo_.refreshToken)
      } catch (error) {
        // If refresh fails, try signing in again
        this.logger_?.warn("Token refresh failed, attempting sign in", error)
        return await this.signIn()
      }
    }

    return this.tokenInfo_
  }

  /**
   * Get hardware tree (collectors, devices, sensors)
   */
  async getHardwareTree(accountId: string): Promise<SwiftSensorsHardwareTree> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseUrl_}/api/client/v1/accounts/${accountId}/treemap`

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.UNEXPECTED_STATE,
          `Failed to get hardware tree: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      return await response.json()
    } catch (error) {
      this.logger_?.error("Failed to get hardware tree", error)
      throw error
    }
  }

  /**
   * Get sensor details
   */
  async getSensorDetails(
    accountId: string,
    sensorId: number
  ): Promise<SwiftSensorsSensorDetails> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseUrl_}/api/client/v2/accounts/${accountId}/sensors/${sensorId}`

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.NOT_FOUND,
          `Failed to get sensor details: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      return await response.json()
    } catch (error) {
      this.logger_?.error(`Failed to get sensor details for sensor ${sensorId}`, error)
      throw error
    }
  }

  /**
   * Get time series data for sensors
   */
  async getSensorTimeSeries(
    accountId: string,
    request: SwiftSensorsTimeSeriesRequest
  ): Promise<SwiftSensorsTimeSeriesResponse> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseUrl_}/api/client/v1/accounts/${accountId}/time-series/sensor`

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.UNEXPECTED_STATE,
          `Failed to get time series data: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      return await response.json()
    } catch (error) {
      this.logger_?.error("Failed to get time series data", error)
      throw error
    }
  }

  /**
   * Get current sensor updates (latest values)
   */
  async getSensorUpdates(
    accountId: string
  ): Promise<SwiftSensorsSensorUpdates> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseUrl_}/api/client/v1/accounts/${accountId}/treeupdate`

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SwitchyardError(
          SwitchyardError.Types.UNEXPECTED_STATE,
          `Failed to get sensor updates: ${response.status} ${response.statusText}. ${errorData.msg || ""}`
        )
      }

      return await response.json()
    } catch (error) {
      this.logger_?.error("Failed to get sensor updates", error)
      throw error
    }
  }

  /**
   * Get account ID from token info
   */
  getAccountId(): string | undefined {
    return this.tokenInfo_?.accountId
  }
}
