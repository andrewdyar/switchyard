import { Context, DAL } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  SwitchyardService,
} from "@switchyard/framework/utils"
import { TemperatureReading } from "../models"
import { TemperatureReadingDTO, TimeSeriesQueryParams } from "../types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  logger?: any
}

export default class TemperatureDataModuleService extends SwitchyardService<{
  TemperatureReading: { dto: TemperatureReadingDTO }
}>({
  TemperatureReading,
}) {
  protected readonly baseRepository_: DAL.RepositoryService
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
  async getTimeSeries(
    params: TimeSeriesQueryParams,
    @MedusaContext() context: Context = {}
  ): Promise<TemperatureReadingDTO[]> {
    const readingRepo = this.getRepository(context, TemperatureReading)

    const startDate = new Date(params.startTime)
    const endDate = new Date(params.endTime)

    const query = readingRepo
      .createQueryBuilder("reading")
      .where("reading.equipment_id = :equipmentId", {
        equipmentId: params.equipmentId,
      })
      .andWhere("reading.recorded_at >= :startDate", { startDate })
      .andWhere("reading.recorded_at <= :endDate", { endDate })

    if (params.measurementType && params.measurementType !== "both") {
      query.andWhere("reading.measurement_type = :type", {
        type: params.measurementType,
      })
    }

    query.orderBy("reading.recorded_at", "ASC")

    const readings = await query.getMany()

    return readings.map((reading: any) =>
      this.baseRepository_.serialize<TemperatureReadingDTO>(reading)
    )
  }

  @InjectManager("baseRepository_")
  async getLatestReading(
    equipmentId: string,
    measurementType?: "temperature" | "humidity",
    @MedusaContext() context: Context = {}
  ): Promise<TemperatureReadingDTO | null> {
    const readingRepo = this.getRepository(context, TemperatureReading)

    const query = readingRepo
      .createQueryBuilder("reading")
      .where("reading.equipment_id = :equipmentId", { equipmentId })
      .orderBy("reading.recorded_at", "DESC")
      .limit(1)

    if (measurementType) {
      query.andWhere("reading.measurement_type = :type", { type: measurementType })
    }

    const reading = await query.getOne()

    return reading
      ? this.baseRepository_.serialize<TemperatureReadingDTO>(reading)
      : null
  }

  @InjectManager("baseRepository_")
  async createReading(
    data: {
      equipment_id: string
      sensor_id: number
      measurement_type: "temperature" | "humidity"
      value: number
      unit: string
      threshold_status?: number | null
      recorded_at: Date
      swift_timestamp?: number | null
    },
    @MedusaContext() context: Context = {}
  ): Promise<TemperatureReadingDTO> {
    const readingRepo = this.getRepository(context, TemperatureReading)

    const reading = readingRepo.create(data)
    const saved = await readingRepo.save(reading)

    return this.baseRepository_.serialize<TemperatureReadingDTO>(saved)
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }
}
