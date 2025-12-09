import { Context, FindConfig, InferEntityType } from "@medusajs/framework/types"
import { ModulesSdkUtils } from "@medusajs/framework/utils"
import { InventoryGroup } from "../models"
import { InventoryGroupRepository } from "../repositories"
import {
  CreateInventoryGroupDTO,
  FilterableInventoryGroupProps,
  InventoryGroupDTO,
  UpdateGroupInput,
} from "../types"

type InjectedDependencies = {
  inventoryGroupRepository: InventoryGroupRepository
}

export default class InventoryGroupService extends ModulesSdkUtils.MedusaInternalService<
  typeof InventoryGroup
>(InventoryGroup) {
  protected readonly inventoryGroupRepository_: InventoryGroupRepository

  constructor({ inventoryGroupRepository }: InjectedDependencies) {
    // @ts-ignore
    super(...arguments)
    this.inventoryGroupRepository_ = inventoryGroupRepository
  }

  async listInventoryGroups(
    filters?: FilterableInventoryGroupProps,
    config?: FindConfig<InventoryGroupDTO>,
    sharedContext?: Context
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    const { include_descendants_tree, include_ancestors_tree, ...restFilters } =
      filters || {}

    const queryOptions = this.buildQueryForList(restFilters, config)
    const transformOptions = this.getTransformOptions(filters)

    return await this.inventoryGroupRepository_.find(
      queryOptions,
      transformOptions,
      sharedContext
    )
  }

  async listAndCountInventoryGroups(
    filters?: FilterableInventoryGroupProps,
    config?: FindConfig<InventoryGroupDTO>,
    sharedContext?: Context
  ): Promise<[InferEntityType<typeof InventoryGroup>[], number]> {
    const { include_descendants_tree, include_ancestors_tree, ...restFilters } =
      filters || {}

    const queryOptions = this.buildQueryForList(restFilters, config)
    const transformOptions = this.getTransformOptions(filters)

    return await this.inventoryGroupRepository_.findAndCount(
      queryOptions,
      transformOptions,
      sharedContext
    )
  }

  async createInventoryGroups(
    data: CreateInventoryGroupDTO[],
    sharedContext?: Context
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    return await this.inventoryGroupRepository_.create(data, sharedContext)
  }

  async updateInventoryGroups(
    data: UpdateGroupInput[],
    sharedContext?: Context
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    return await this.inventoryGroupRepository_.update(data, sharedContext)
  }

  async deleteInventoryGroups(
    ids: string[],
    sharedContext?: Context
  ): Promise<void> {
    await this.inventoryGroupRepository_.delete(ids, sharedContext)
  }

  async softDeleteInventoryGroups(
    ids: string[],
    sharedContext?: Context
  ): Promise<
    [InferEntityType<typeof InventoryGroup>[], Record<string, unknown[]>]
  > {
    return await this.inventoryGroupRepository_.softDelete(ids, sharedContext)
  }

  async restoreInventoryGroups(
    ids: string[],
    sharedContext?: Context
  ): Promise<
    [InferEntityType<typeof InventoryGroup>[], Record<string, unknown[]>]
  > {
    return await this.inventoryGroupRepository_.restore(ids, sharedContext)
  }

  private buildQueryForList(
    filters?: Omit<
      FilterableInventoryGroupProps,
      "include_descendants_tree" | "include_ancestors_tree"
    >,
    config?: FindConfig<InventoryGroupDTO>
  ) {
    const queryOptions: any = {
      where: {},
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          queryOptions.where[key] = value
        }
      }
    }

    if (config?.skip !== undefined) {
      queryOptions.options = {
        ...queryOptions.options,
        offset: config.skip,
      }
    }

    if (config?.take !== undefined) {
      queryOptions.options = {
        ...queryOptions.options,
        limit: config.take,
      }
    }

    if (config?.select) {
      queryOptions.options = {
        ...queryOptions.options,
        fields: config.select as string[],
      }
    }

    if (config?.relations) {
      queryOptions.options = {
        ...queryOptions.options,
        populate: config.relations,
      }
    }

    if (config?.order) {
      queryOptions.options = {
        ...queryOptions.options,
        orderBy: config.order,
      }
    }

    return queryOptions
  }

  private getTransformOptions(filters?: FilterableInventoryGroupProps) {
    return {
      includeDescendantsTree: filters?.include_descendants_tree ?? false,
      includeAncestorsTree: filters?.include_ancestors_tree ?? false,
    }
  }
}

