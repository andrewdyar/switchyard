import { Context } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  SwitchyardService,
  Modules,
} from "@switchyard/framework/utils"
import { EquipmentAlert } from "../models"
import {
  CreateEquipmentAlertDTO,
  EquipmentAlertDTO,
  UpdateEquipmentAlertDTO,
} from "../types"
import { AlertDetectionService } from "./alert-detection-service"
import { NotificationService } from "@switchyard/equipment-notifications"

type InjectedDependencies = {
  baseRepository: any
  logger?: any
  [Modules.NOTIFICATION]?: any
  [Modules.USER]?: any
}

export default class EquipmentAlertsModuleService extends SwitchyardService({
  EquipmentAlert,
}) {
  protected readonly baseRepository_: any
  protected readonly logger_?: any
  protected alertDetectionService_: AlertDetectionService
  protected notificationService_?: NotificationService

  constructor(
    {
      baseRepository,
      logger,
      [Modules.NOTIFICATION]: notificationModuleService,
      [Modules.USER]: userModuleService,
    }: InjectedDependencies,
    moduleDeclaration: any
  ) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.logger_ = logger
    this.alertDetectionService_ = new AlertDetectionService({ baseRepository, logger })

    if (notificationModuleService && userModuleService) {
      this.notificationService_ = new NotificationService({
        baseRepository,
        logger,
        [Modules.NOTIFICATION]: notificationModuleService,
        [Modules.USER]: userModuleService,
      })
    }
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

    return alerts.map((alert) =>
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
      id: this.generateId(),
      triggered_at: new Date(),
    })

    const saved = await alertRepo.save(alert)

    // Send notifications if service is available
    if (this.notificationService_) {
      try {
        await this.notificationService_.sendAlertNotifications(
          this.baseRepository_.serialize<EquipmentAlertDTO>(saved),
          context
        )
      } catch (error) {
        this.logger_?.error("Failed to send alert notifications", error)
      }
    }

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

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }

  protected generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Expose alert detection service methods
  getAlertDetectionService(): AlertDetectionService {
    return this.alertDetectionService_
  }
}
