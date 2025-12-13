import { switchyardIntegrationTestRunner } from "@switchyard/test-utils"
import { createAdminUser } from "../../../helpers/create-admin-user"

jest.setTimeout(50000)

const env = {}
const adminHeaders = {
  headers: { "x-switchyard-access-token": "test_token" },
}

switchyardIntegrationTestRunner({
  env,
  testSuite: ({ dbConnection, getContainer, api }) => {
    describe("POST /admin/invites", () => {
      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, getContainer())
      })

      it("create an invite", async () => {
        const body = {
          email: "test_member@test.com",
        }

        const response = await api.post(`/admin/invites`, body, adminHeaders)

        expect(response.status).toEqual(200)
        expect(response.data).toEqual({
          invite: expect.objectContaining(body),
        })
      })
    })
  },
})
