import { Context, FindConfig } from "@switchyard/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  SwitchyardContext,
  MikroOrmBaseRepository,
  ModulesSdkUtils,
} from "@switchyard/framework/utils"

type InjectedDependencies = {
  linkRepository: MikroOrmBaseRepository
}

export default class LinkService<TEntity> {
  protected readonly linkRepository_: any

  constructor({ linkRepository }: InjectedDependencies) {
    this.linkRepository_ = linkRepository
  }

  @InjectManager("linkRepository_")
  async list(
    filters: unknown = {},
    config: FindConfig<unknown> = {},
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<TEntity[]> {
    const queryOptions = ModulesSdkUtils.buildQuery<unknown>(
      filters as any,
      config
    )
    return await this.linkRepository_.find(queryOptions, sharedContext)
  }

  @InjectManager("linkRepository_")
  async listAndCount(
    filters = {},
    config: FindConfig<unknown> = {},
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<[TEntity[], number]> {
    const queryOptions = ModulesSdkUtils.buildQuery<unknown>(filters, config)
    return await this.linkRepository_.findAndCount(queryOptions, sharedContext)
  }

  @InjectTransactionManager("linkRepository_")
  async create(
    data: unknown[],
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<TEntity[]> {
    return await this.linkRepository_.create(data, {
      transactionManager: sharedContext.transactionManager,
    })
  }

  @InjectTransactionManager("linkRepository_")
  async dismiss(
    data: unknown[],
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<TEntity[]> {
    const filter: any = []
    for (const pair of data) {
      filter.push({
        $and: Object.entries(pair as object).map(([key, value]) => ({
          [key]: value,
        })),
      })
    }

    const [rows] = await this.linkRepository_.softDelete(
      { $or: filter },
      {
        transactionManager: sharedContext.transactionManager,
      }
    )

    return rows
  }

  @InjectTransactionManager("linkRepository_")
  async delete(
    data: unknown,
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<void> {
    await this.linkRepository_.delete(data, {
      transactionManager: sharedContext.transactionManager,
    })
  }

  @InjectTransactionManager("linkRepository_")
  async softDelete(
    data: any[],
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<[object[], Record<string, string[]>]> {
    const deleteFilters = {
      $or: data.map((dataEntry) => {
        const filter = {}
        for (const key in dataEntry) {
          filter[key] = {
            $in: Array.isArray(dataEntry[key])
              ? dataEntry[key]
              : [dataEntry[key]],
          }
        }
        return filter
      }),
    }

    return await this.linkRepository_.softDelete(deleteFilters, {
      transactionManager: sharedContext.transactionManager,
    })
  }

  @InjectTransactionManager("linkRepository_")
  async restore(
    data: any,
    @SwitchyardContext() sharedContext: Context = {}
  ): Promise<[object[], Record<string, string[]>]> {
    const restoreFilters = {
      $or: data.map((dataEntry) => {
        const filter = {}
        for (const key in dataEntry) {
          filter[key] = {
            $in: Array.isArray(dataEntry[key])
              ? dataEntry[key]
              : [dataEntry[key]],
          }
        }
        return filter
      }),
    }

    return await this.linkRepository_.restore(restoreFilters, {
      transactionManager: sharedContext.transactionManager,
    })
  }
}
