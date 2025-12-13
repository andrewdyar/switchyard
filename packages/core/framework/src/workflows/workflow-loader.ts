import { SwitchyardContainer } from "@switchyard/types"
import { isFileSkipped } from "@switchyard/utils"
import { SwitchyardWorkflow } from "@switchyard/workflows-sdk"
import { logger } from "../logger"
import { ResourceLoader } from "../utils/resource-loader"

export class WorkflowLoader extends ResourceLoader {
  protected resourceName = "workflow"

  constructor(sourceDir: string | string[], container: SwitchyardContainer) {
    super(sourceDir, container)
  }

  protected async onFileLoaded(
    path: string,
    fileExports: Record<string, unknown>
  ) {
    if (isFileSkipped(fileExports)) {
      const exportedFns = Object.keys(fileExports)
      for (const exportedFn of exportedFns) {
        const fn = fileExports[exportedFn] as any
        if (fn?.getName?.()) {
          SwitchyardWorkflow.unregisterWorkflow(fn.getName())
        }
      }
      return
    }

    logger.debug(`Registering workflows from ${path}.`)
  }

  /**
   * Load workflows from the source paths, workflows are registering themselves,
   * therefore we only need to import them
   */
  async load() {
    await super.discoverResources()

    this.logger.debug(`Workflows registered.`)
  }
}
