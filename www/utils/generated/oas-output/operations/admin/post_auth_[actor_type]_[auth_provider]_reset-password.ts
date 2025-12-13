/**
 * @oas [post] /auth/user/{auth_provider}/reset-password
 * operationId: PostActor_typeAuth_providerResetPassword
 * summary: Generate Reset Password Token for Admin User
 * x-sidebar-summary: Generate Reset Password Token
 * description: >
 *   Generate a reset password token for an admin user. This API route doesn't reset the admin's password or send them the reset instructions in a notification.
 * 
 * 
 *   Instead, This API route emits the `auth.password_reset` event, passing it the token as a payload. You can listen to that event in a subscriber as explained in [this guide](https://docs.switchyard.run/resources/commerce-modules/auth/reset-password), then send the user a notification. The notification is sent using a [Notification Module Provider](https://docs.switchyard.run/resources/infrastructure-modules/notification), and it should have the URL to reset the password in the Switchyard Admin dashboard, such as `http://localhost:9000/app/reset-password?token=123`.
 * 
 * 
 *    Use the generated token to update the user's password using the [Reset Password API route](https://docs.switchyard.run/api/admin#auth_postactor_typeauth_providerupdate).
 * externalDocs:
 *   url: https://docs.switchyard.run/resources/commerce-modules/auth/authentication-route#generate-reset-password-token-route
 *   description: Learn more about this API route.
 * x-authenticated: false
 * parameters:
 *   - name: auth_provider
 *     in: path
 *     description: The provider used for authentication.
 *     required: true
 *     schema:
 *       type: string
 *       example: "emailpass"
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         title: identifier
 *         description: The user's identifier for the selected auth provider. For example, for the `emailpass` auth provider, the value is the user's email.
 *         example: "admin@switchyard-test.run"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS SDK
 *     source: |-
 *       import Switchyard from "@switchyard/js-sdk"
 * 
 *       export const sdk = new Switchyard({
 *         baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
 *         debug: import.meta.env.DEV,
 *         auth: {
 *           type: "session",
 *         },
 *       })
 * 
 *       sdk.auth.resetPassword(
 *         "user",
 *         "emailpass",
 *         {
 *           identifier: "user@gmail.com"
 *         }
 *       )
 *       .then(() => {
 *         // user receives token
 *       })
 *   - lang: Shell
 *     label: cURL
 *     source:  |-
 *       curl -X POST '{backend_url}/auth/user/emailpass/reset-password' \
 *       -H 'Content-Type: application/json' \
 *       --data-raw '{
 *         "identifier": "admin@switchyard-test.run"
 *       }'
 * tags:
 *   - Auth
 * responses:
 *   "201":
 *     description: OK
 *   "400":
 *     $ref: "#/components/responses/400_error"
 *   "401":
 *     $ref: "#/components/responses/unauthorized"
 *   "404":
 *     $ref: "#/components/responses/not_found_error"
 *   "409":
 *     $ref: "#/components/responses/invalid_state_error"
 *   "422":
 *     $ref: "#/components/responses/invalid_request_error"
 *   "500":
 *     $ref: "#/components/responses/500_error"
 * x-workflow: generateResetPasswordTokenWorkflow
 * x-events:
 *   - name: auth.password_reset
 *     payload: |-
 *       ```ts
 *       {
 *         entity_id, // The identifier of the user or customer. For example, an email address.
 *         actor_type, // The type of actor. For example, "customer", "user", or custom.
 *         token, // The generated token.
 *       }
 *       ```
 *     description: |-
 *       Emitted when a reset password token is generated. You can listen to this event
 *       to send a reset password email to the user or customer, for example.
 *     deprecated: false
*/

