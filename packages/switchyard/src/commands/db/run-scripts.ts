import { SwitchyardAppLoader } from "@switchyard/framework"
import { LinkLoader } from "@switchyard/framework/links"
import { MigrationScriptsMigrator } from "@switchyard/framework/migrations"
import {
  ContainerRegistrationKeys,
  getResolvedPlugins,
  mergePluginModules,
} from "@switchyard/framework/utils"
import { dirname, join } from "path"

import { SwitchyardModule } from "@switchyard/framework/modules-sdk"
import { Logger, SwitchyardContainer, PluginDetails } from "@switchyard/types"
import { initializeContainer } from "../../loaders"
import { ensureDbExists } from "../utils"

const TERMINAL_SIZE = process.stdout.columns

/**
 * A low-level utility to migrate the migration scripts. This util should
 * never exit the process implicitly.
 */
export async function runMigrationScripts({
  directory,
  container,
  logger,
}: {
  directory: string
  container: SwitchyardContainer
  logger: Logger
}): Promise<boolean> {
  let onApplicationPrepareShutdown: () => Promise<void> = async () =>
    Promise.resolve()
  let onApplicationShutdown: () => Promise<void> = async () => Promise.resolve()

  let plugins: PluginDetails[]

  try {
    await ensureDbExists(container)

    const configModule = container.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    )

    plugins = await getResolvedPlugins(directory, configModule, true)

    mergePluginModules(configModule, plugins)

    const resources = await loadResources(plugins, logger)
    onApplicationPrepareShutdown = resources.onApplicationPrepareShutdown
    onApplicationShutdown = resources.onApplicationShutdown

    const scriptsSourcePaths = [
      join(dirname(require.resolve("@switchyard/core")), "migration-scripts"),
      ...plugins.map((plugin) => join(plugin.resolve, "migration-scripts")),
    ]

    const migrator = new MigrationScriptsMigrator({ container: container })
    await migrator.ensureMigrationsTable()
    const pendingScripts = await migrator.getPendingMigrations(
      scriptsSourcePaths
    )

    if (!pendingScripts?.length) {
      logger.info("No pending migration scripts to execute")
      return true
    }

    logger.log(new Array(TERMINAL_SIZE).join("-"))
    logger.info("Pending migration scripts to execute")
    logger.info(`${pendingScripts.join("\n")}`)

    logger.log(new Array(TERMINAL_SIZE).join("-"))
    logger.info("Running migration scripts...")
    await migrator.run(scriptsSourcePaths)

    logger.log(new Array(TERMINAL_SIZE).join("-"))
    logger.info("Migration scripts completed")

    return true
  } finally {
    await onApplicationPrepareShutdown()
    await onApplicationShutdown()
  }
}

async function loadResources(
  plugins: any,
  logger: Logger
): Promise<{
  onApplicationPrepareShutdown: () => Promise<void>
  onApplicationShutdown: () => Promise<void>
}> {
  /**
   * Clear all module instances to prevent cache from kicking in
   */
  SwitchyardModule.clearInstances()

  /**
   * Setup
   */

  const linksSourcePaths = plugins.map((plugin) =>
    join(plugin.resolve, "links")
  )
  await new LinkLoader(linksSourcePaths, logger).load()

  const switchyardAppResources = await new SwitchyardAppLoader().load()
  const onApplicationPrepareShutdown =
    switchyardAppResources.onApplicationPrepareShutdown
  const onApplicationShutdown = switchyardAppResources.onApplicationShutdown
  await switchyardAppResources.onApplicationStart()

  return {
    onApplicationPrepareShutdown,
    onApplicationShutdown,
  }
}

const main = async function ({
  directory,
}: {
  directory: string
  container?: SwitchyardContainer
}) {
  const container = await initializeContainer(directory)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const migrated = await runMigrationScripts({
      directory,
      container: container,
      logger,
    })
    process.exit(migrated ? 0 : 1)
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

export default main
