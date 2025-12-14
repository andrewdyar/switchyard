import { join } from "path"
import { FileSystem } from "../file-system"
import { loadEnv } from "../load-env"

const filesystem = new FileSystem(join(__dirname, "tmp"))

describe("loadEnv", function () {
  afterEach(async () => {
    await filesystem.cleanup()
    delete process.env.SWITCHYARD_VERSION
    delete process.env.SWITCHYARD_DEV_VERSION
    delete process.env.SWITCHYARD_TEST_VERSION
    delete process.env.SWITCHYARD_STAGING_VERSION
    delete process.env.SWITCHYARD_PRODUCTION_VERSION
  })

  it("should load .env file when in unknown environment", async function () {
    await filesystem.create(".env", "SWITCHYARD_VERSION=1.0")
    loadEnv("", filesystem.basePath)

    expect(process.env.SWITCHYARD_VERSION).toEqual("1.0")
  })

  it("should load .env file for known environments", async function () {
    await filesystem.create(".env", "SWITCHYARD_DEV_VERSION=1.0")
    await filesystem.create(".env.test", "SWITCHYARD_TEST_VERSION=1.0")
    await filesystem.create(".env.staging", "SWITCHYARD_STAGING_VERSION=1.0")
    await filesystem.create(".env.production", "SWITCHYARD_PRODUCTION_VERSION=1.0")

    loadEnv("development", filesystem.basePath)
    loadEnv("test", filesystem.basePath)
    loadEnv("staging", filesystem.basePath)
    loadEnv("production", filesystem.basePath)

    expect(process.env.SWITCHYARD_DEV_VERSION).toEqual("1.0")
    expect(process.env.SWITCHYARD_TEST_VERSION).toEqual("1.0")
    expect(process.env.SWITCHYARD_STAGING_VERSION).toEqual("1.0")
    expect(process.env.SWITCHYARD_PRODUCTION_VERSION).toEqual("1.0")
  })
})
