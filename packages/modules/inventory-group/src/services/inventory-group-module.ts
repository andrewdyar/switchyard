import { Context, FindConfig, ModuleJoinerConfig } from "@medusajs/framework/types"
import {
  EmitEvents,
  InjectManager,
  kebabCase,
  MedusaContext,
  MedusaService,
  Modules,
  isString,
} from "@medusajs/framework/utils"
import { InventoryGroup } from "../models"
import { InventoryGroupRepository } from "../repositories"
import InventoryGroupService from "./inventory-group"
import {
  CreateInventoryGroupDTO,
  FilterableInventoryGroupProps,
  generateHandle,
  generateLocationCode,
  InventoryGroupDTO,
  UpdateInventoryGroupDTO,
} from "../types"
import { joinerConfig } from "../joiner-config"

type InjectedDependencies = {
  baseRepository: any
  inventoryGroupRepository: InventoryGroupRepository
  inventoryGroupService: InventoryGroupService
  [Modules.EVENT_BUS]?: any
}

export default class InventoryGroupModuleService extends MedusaService({
  InventoryGroup,
}) {
  protected readonly moduleDeclaration: any
  protected readonly baseRepository_: any
  protected readonly inventoryGroupRepository_: InventoryGroupRepository
  protected readonly inventoryGroupService_: InventoryGroupService
  protected readonly eventBusModuleService_?: any

  constructor(
    {
      baseRepository,
      inventoryGroupRepository,
      inventoryGroupService,
      [Modules.EVENT_BUS]: eventBusModuleService,
    }: InjectedDependencies,
    moduleDeclaration: any
  ) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.moduleDeclaration = moduleDeclaration
    this.baseRepository_ = baseRepository
    this.inventoryGroupRepository_ = inventoryGroupRepository
    this.inventoryGroupService_ = inventoryGroupService
    this.eventBusModuleService_ = eventBusModuleService
  }

  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  @InjectManager()
  @EmitEvents()
  async create(
    data: CreateInventoryGroupDTO | CreateInventoryGroupDTO[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const input = (Array.isArray(data) ? data : [data]).map((group) => {
      // Auto-generate handle if not provided
      if (!group.handle) {
        group.handle = group.name
          ? kebabCase(group.name)
          : generateHandle(
              group.type,
              group.zone_code ?? null,
              group.aisle_number ?? null,
              group.bay_number ?? null,
              group.shelf_number ?? null,
              group.slot_number ?? null
            )
      }

      // Auto-generate location_code if not provided
      if (!group.location_code && group.zone_code) {
        group.location_code = generateLocationCode(
          group.zone_code,
          group.aisle_number ?? null,
          group.bay_number ?? null,
          group.shelf_number ?? null,
          group.slot_number ?? null
        )
      }

      return group
    })

    const groups = await this.inventoryGroupService_.createInventoryGroups(
      input,
      sharedContext
    )

    const createdGroups = await this.baseRepository_.serialize(groups)

    return Array.isArray(data) ? createdGroups : createdGroups[0]
  }

  @InjectManager()
  @EmitEvents()
  async update(
    idOrSelector: string | Partial<FilterableInventoryGroupProps>,
    data: UpdateInventoryGroupDTO,
    @MedusaContext() sharedContext: Context = {}
  ) {
    let normalizedInput: any[] = []

    if (isString(idOrSelector)) {
      await this.inventoryGroupService_.retrieve(
        idOrSelector,
        {},
        sharedContext
      )
      normalizedInput = [{ id: idOrSelector, ...data }]
    } else {
      const groups = await this.inventoryGroupService_.listInventoryGroups(
        idOrSelector as FilterableInventoryGroupProps,
        {},
        sharedContext
      )
      normalizedInput = groups.map((group) => ({
        id: (group as any).id,
        ...data,
      }))
    }

    const updated = await this.inventoryGroupService_.updateInventoryGroups(
      normalizedInput,
      sharedContext
    )

    const serializedGroups = await this.baseRepository_.serialize(updated)

    return isString(idOrSelector) ? serializedGroups[0] : serializedGroups
  }

  @InjectManager()
  async retrieve(
    inventoryGroupId: string,
    config?: FindConfig<InventoryGroupDTO>,
    @MedusaContext() sharedContext?: Context
  ) {
    const group = await this.inventoryGroupService_.retrieve(
      inventoryGroupId,
      config,
      sharedContext
    )

    return this.baseRepository_.serialize(group)
  }

  @InjectManager()
  async list(
    filters?: FilterableInventoryGroupProps,
    config?: FindConfig<InventoryGroupDTO>,
    @MedusaContext() sharedContext?: Context
  ) {
    const groups = await this.inventoryGroupService_.listInventoryGroups(
      filters,
      config,
      sharedContext
    )

    return this.baseRepository_.serialize(groups)
  }

  @InjectManager()
  async listAndCount(
    filters?: FilterableInventoryGroupProps,
    config?: FindConfig<InventoryGroupDTO>,
    @MedusaContext() sharedContext?: Context
  ) {
    const [groups, count] =
      await this.inventoryGroupService_.listAndCountInventoryGroups(
        filters,
        config,
        sharedContext
      )

    const serializedGroups = await this.baseRepository_.serialize(groups)

    return [serializedGroups, count]
  }

  @InjectManager()
  @EmitEvents()
  async delete(
    ids: string[],
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    await this.inventoryGroupService_.deleteInventoryGroups(ids, sharedContext)
  }

  @InjectManager()
  @EmitEvents()
  async softDelete(
    ids: string[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [, cascade] =
      await this.inventoryGroupService_.softDeleteInventoryGroups(
        ids,
        sharedContext
      )
    return cascade
  }

  @InjectManager()
  @EmitEvents()
  async restore(ids: string[], @MedusaContext() sharedContext: Context = {}) {
    const [, cascade] =
      await this.inventoryGroupService_.restoreInventoryGroups(
        ids,
        sharedContext
      )
    return cascade
  }
}

