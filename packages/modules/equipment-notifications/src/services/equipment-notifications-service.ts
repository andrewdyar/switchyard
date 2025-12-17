import { Context } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  SwitchyardService,
} from "@switchyard/framework/utils"
import { AlertNotificationAssignment } from "../models"
import {
  AlertNotificationAssignmentDTO,
  CreateAlertNotificationAssignmentDTO,
  UpdateAlertNotificationAssignmentDTO,
} from "../types"

type InjectedDependencies = {
  baseRepository: any
}

export default class EquipmentNotificationsService extends SwitchyardService({
  AlertNotificationAssignment,
}) {
  protected readonly baseRepository_: any

  constructor(
    { baseRepository }: InjectedDependencies,
    moduleDeclaration: any
  ) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)

    this.baseRepository_ = baseRepository
  }

  @InjectManager("baseRepository_")
  async list(
    filters: Record<string, unknown> = {},
    config: Record<string, unknown> = {},
    @MedusaContext() context: Context = {}
  ): Promise<AlertNotificationAssignmentDTO[]> {
    const assignmentRepo = this.getRepository(context, AlertNotificationAssignment)

    const query = assignmentRepo.createQueryBuilder("assignment")

    if (filters.user_id) {
      query.andWhere("assignment.user_id = :user_id", { user_id: filters.user_id })
    }

    if (filters.alert_type) {
      query.andWhere("assignment.alert_type = :alert_type", {
        alert_type: filters.alert_type,
      })
    }

    if (filters.equipment_id !== undefined) {
      if (filters.equipment_id === null) {
        query.andWhere("assignment.equipment_id IS NULL")
      } else {
        query.andWhere("assignment.equipment_id = :equipment_id", {
          equipment_id: filters.equipment_id,
        })
      }
    }

    query.andWhere("assignment.deleted_at IS NULL")

    const assignments = await query.getMany()

    return assignments.map((assignment) =>
      this.baseRepository_.serialize<AlertNotificationAssignmentDTO>(assignment)
    )
  }

  @InjectManager("baseRepository_")
  async retrieve(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<AlertNotificationAssignmentDTO> {
    const assignmentRepo = this.getRepository(context, AlertNotificationAssignment)

    const assignment = await assignmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!assignment) {
      throw new Error(`Notification assignment with id ${id} not found`)
    }

    return this.baseRepository_.serialize<AlertNotificationAssignmentDTO>(assignment)
  }

  @InjectManager("baseRepository_")
  async create(
    data: CreateAlertNotificationAssignmentDTO,
    @MedusaContext() context: Context = {}
  ): Promise<AlertNotificationAssignmentDTO> {
    const assignmentRepo = this.getRepository(context, AlertNotificationAssignment)

    const assignment = assignmentRepo.create({
      ...data,
      id: this.generateId(),
    })

    const saved = await assignmentRepo.save(assignment)

    return this.baseRepository_.serialize<AlertNotificationAssignmentDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async update(
    id: string,
    data: UpdateAlertNotificationAssignmentDTO,
    @MedusaContext() context: Context = {}
  ): Promise<AlertNotificationAssignmentDTO> {
    const assignmentRepo = this.getRepository(context, AlertNotificationAssignment)

    const assignment = await assignmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!assignment) {
      throw new Error(`Notification assignment with id ${id} not found`)
    }

    Object.assign(assignment, data, { updated_at: new Date() })

    const saved = await assignmentRepo.save(assignment)

    return this.baseRepository_.serialize<AlertNotificationAssignmentDTO>(saved)
  }

  @InjectManager("baseRepository_")
  async delete(
    id: string,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    const assignmentRepo = this.getRepository(context, AlertNotificationAssignment)

    const assignment = await assignmentRepo.findOne({
      where: { id, deleted_at: null },
    })

    if (!assignment) {
      throw new Error(`Notification assignment with id ${id} not found`)
    }

    assignment.deleted_at = new Date()
    await assignmentRepo.save(assignment)
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }

  protected generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}
