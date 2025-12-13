import { SwitchyardWorkflow } from "@switchyard/framework/workflows-sdk"
import { switchyardIntegrationTestRunner } from "@switchyard/test-utils"
import path from "path"
import { setTimeout as setTimeoutPromise } from "timers/promises"
import { testJobHandler } from "../../__fixtures__/feature-flag/src/jobs/test-job"

jest.setTimeout(100000)

switchyardIntegrationTestRunner({
  cwd: path.join(__dirname, "../../__fixtures__/feature-flag"),
  env: {
    CUSTOM_FF: true,
  },
  testSuite: ({ api, dbConnection }) => {
    describe("Resources loaded with feature flags", () => {
      it("should load migration when feature flag is enabled and run job", async () => {
        const migrationNotExecuted = await dbConnection.raw(
          `SELECT name FROM "mikro_orm_migrations" WHERE name = 'Noop'`
        )
        expect(migrationNotExecuted.rows).toHaveLength(0)

        const migrationExecuted = await dbConnection.raw(
          `SELECT name FROM "mikro_orm_migrations" WHERE name = 'MigrationTest'`
        )

        expect(migrationExecuted.rows).toHaveLength(1)
        expect(migrationExecuted.rows[0].name).toBe("MigrationTest")

        await setTimeoutPromise(1000)

        expect(testJobHandler).toHaveBeenCalledTimes(1)
      })

      it("should load workflow when feature flag is enabled", async () => {
        expect(SwitchyardWorkflow.getWorkflow("test-workflow")).toBeDefined()
      })

      it("should load scheduled job when feature flag is enabled", async () => {
        expect(
          SwitchyardWorkflow.getWorkflow("job-greeting-every-second")
        ).toBeDefined()
      })

      it("should load endpoint when feature flag is enabled", async () => {
        expect((await api.get("/custom")).status).toBe(200)
      })
    })
  },
})
