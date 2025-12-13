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
    describe("POST /admin/users/me", () => {
      let container

      beforeAll(() => {
        container = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)
      })

      it("gets the current user", async () => {
        const response = await api.get(`/admin/users/me`, adminHeaders)

        expect(response.status).toEqual(200)
        expect(response.data).toEqual({
          user: expect.objectContaining({ id: expect.any(String) }),
        })
      })
    })
  },
})
