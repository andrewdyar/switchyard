import { Context } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@switchyard/framework/utils"
import { EquipmentAlert } from "../models"
import {
  AlertStatus,
  CreateEquipmentAlertDTO,
  EquipmentAlertDTO,
  UpdateEquipmentAlertDTO,
} from "../types"

type InjectedDependencies = {
  baseRepository: any
  logger?: any
}

export default class EquipmentAlertsModuleService extends MedusaService({
  EquipmentAlert,
}) {
  protected readonly baseRepository_: any
  protected readonly logger_?: any

  constructor(
    { baseRepository, logger }: InjectedDependencies,
    moduleDeclaration: any
  ) {
    // @ts-ignore
    super(...arguments)
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  @InjectManager("baseRepository_")
  async list(
    filters: Record<string, unknown> = {},
    config: Record<string, unknown> = {},
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO[]> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const query = alertRepo.createQueryBuilder("alert")

    if (filters.equipment_id) {
      query.andWhere("alert.equipment_id = :equipment_id", {
        equipment_id: filters.equipment_id,
      })
    }

    if (filters.status) {
      query.andWhere("alert.status = :status", { status: filters.status })
    }

    if (filters.alert_type) {
      query.andWhere("alert.alert_type = :alert_type", {
        alert_type: filters.alert_type,
      })
    }

    if (filters.severity) {
      query.andWhere("alert.severity = :severity", { severity: filters.severity })
    }

    query.andWhere("alert.deleted_at IS NULL")
    query.orderBy("alert.triggered_at", "DESC")

    const alerts = await query.getMany()

    return alerts.map((alert: any) =>
      this.baseRepository_.serialize<EquipmentAlertDTO>(alert)
    )
  }

  @InjectManager("baseRepository_")
  async retrieve(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const alert = await alertRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!alert) {
      throw new Error(`Equipment alert with id ${id} not found`)
    }

    return this.baseRepository_.serialize<EquipmentAlertDTO>(alert)
  }

  @InjectManager("baseRepository_")
  async create(
    data: CreateEquipmentAlertDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const alert = alertRepo.create({
      ...data,
      triggered_at: new Date(),
    })

    const saved = await alertRepo.save(alert)

    return this.baseRepository_.serialize<EquipmentAlertDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async update(
    id: string,
    data: UpdateEquipmentAlertDTO,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const alert = await alertRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!alert) {
      throw new Error(`Equipment alert with id ${id} not found`)
    }

    Object.assign(alert, data)

    if (data.status === "resolved" && !alert.resolved_at) {
      alert.resolved_at = new Date()
    }

    const saved = await alertRepo.save(alert)

    return this.baseRepository_.serialize<EquipmentAlertDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async resolve(
    id: string,
    userId: string,
    reason?: string,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const alert = await alertRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!alert) {
      throw new Error(`Equipment alert with id ${id} not found`)
    }

    alert.status = "resolved" as AlertStatus
    alert.resolved_at = new Date()
    alert.resolved_by = userId
    alert.resolved_reason = reason || null

    const saved = await alertRepo.save(alert)

    return this.baseRepository_.serialize<EquipmentAlertDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async acknowledge(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO> {
    const alertRepo = this.getRepository(context, EquipmentAlert)

    const alert = await alertRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!alert) {
      throw new Error(`Equipment alert with id ${id} not found`)
    }

    alert.status = "acknowledged" as AlertStatus

    const saved = await alertRepo.save(alert)

    return this.baseRepository_.serialize<EquipmentAlertDTO>(saved)
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }
}
