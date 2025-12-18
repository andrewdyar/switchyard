import { Context } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@switchyard/framework/utils"
import { Equipment, EquipmentThreshold } from "../models"
import {
  CreateEquipmentDTO,
  CreateEquipmentThresholdDTO,
  EquipmentDTO,
  EquipmentThresholdDTO,
  UpdateEquipmentDTO,
  UpdateEquipmentThresholdDTO,
} from "../types"

type InjectedDependencies = {
  baseRepository: any
}

export default class EquipmentModuleService extends MedusaService({
  Equipment,
  EquipmentThreshold,
}) {
  protected readonly baseRepository_: any

  constructor(
    { baseRepository }: InjectedDependencies,
    moduleDeclaration: any
  ) {
    // @ts-ignore
    super(...arguments)
    this.baseRepository_ = baseRepository
  }

  @InjectManager("baseRepository_")
  async list(
    filters: Record<string, unknown> = {},
    config: Record<string, unknown> = {},
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentDTO[]> {
    const equipmentRepo = this.getRepository(context, Equipment)

    const query = equipmentRepo.createQueryBuilder("equipment")

    if (filters.type) {
      query.andWhere("equipment.type = :type", { type: filters.type })
    }

    if (filters.is_active !== undefined) {
      query.andWhere("equipment.is_active = :is_active", {
        is_active: filters.is_active,
      })
    }

    if (filters.inventory_group_id) {
      query.andWhere("equipment.inventory_group_id = :inventory_group_id", {
        inventory_group_id: filters.inventory_group_id,
      })
    }

    query.andWhere("equipment.deleted_at IS NULL")

    const items = await query.getMany()

    return items.map((item: any) => this.baseRepository_.serialize<EquipmentDTO>(item))
  }

  @InjectManager("baseRepository_")
  async retrieve(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentDTO> {
    const equipmentRepo = this.getRepository(context, Equipment)

    const equipment = await equipmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!equipment) {
      throw new Error(`Equipment with id ${id} not found`)
    }

    return this.baseRepository_.serialize<EquipmentDTO>(equipment)
  }

  @InjectManager("baseRepository_")
  async create(
    data: CreateEquipmentDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentDTO> {
    const equipmentRepo = this.getRepository(context, Equipment)

    const equipment = equipmentRepo.create(data)
    const saved = await equipmentRepo.save(equipment)

    return this.baseRepository_.serialize<EquipmentDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async update(
    id: string,
    data: UpdateEquipmentDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentDTO> {
    const equipmentRepo = this.getRepository(context, Equipment)

    const equipment = await equipmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!equipment) {
      throw new Error(`Equipment with id ${id} not found`)
    }

    Object.assign(equipment, data, { updated_at: new Date() })
    const saved = await equipmentRepo.save(equipment)

    return this.baseRepository_.serialize<EquipmentDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async delete(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    const equipmentRepo = this.getRepository(context, Equipment)

    const equipment = await equipmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!equipment) {
      throw new Error(`Equipment with id ${id} not found`)
    }

    equipment.deleted_at = new Date()
    await equipmentRepo.save(equipment)
  }

  @InjectManager("baseRepository_")
  async createThreshold(
    data: CreateEquipmentThresholdDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentThresholdDTO> {
    const thresholdRepo = this.getRepository(context, EquipmentThreshold)

    const threshold = thresholdRepo.create(data)
    const saved = await thresholdRepo.save(threshold)

    return this.baseRepository_.serialize<EquipmentThresholdDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async updateThreshold(
    id: string,
    data: UpdateEquipmentThresholdDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentThresholdDTO> {
    const thresholdRepo = this.getRepository(context, EquipmentThreshold)

    const threshold = await thresholdRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!threshold) {
      throw new Error(`Equipment threshold with id ${id} not found`)
    }

    Object.assign(threshold, data, { updated_at: new Date() })
    const saved = await thresholdRepo.save(threshold)

    return this.baseRepository_.serialize<EquipmentThresholdDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async getThresholds(
    equipmentId: string,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentThresholdDTO[]> {
    const thresholdRepo = this.getRepository(context, EquipmentThreshold)

    const thresholds = await thresholdRepo.find({
      where: { equipment_id: equipmentId, deleted_at: null },
    })

    return thresholds.map((threshold: any) =>
      this.baseRepository_.serialize<EquipmentThresholdDTO>(threshold)
    )
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }
}
