import { Context } from "@switchyard/framework/types"
import {
  InjectManager,
  MedusaContext,
  SwitchyardService,
} from "@switchyard/framework/utils"
import { TemperatureReading } from "../models"
import { TemperatureReadingDTO, TimeSeriesQueryParams } from "../types"

type InjectedDependencies = {
  baseRepository: any
}

export default class TemperatureDataService extends SwitchyardService({
  TemperatureReading,
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
  async getTimeSeries(
    params: TimeSeriesQueryParams,
    @MedusaContext() context: Context = {}
  ): Promise<TemperatureReadingDTO[]> {
    const readingRepo = this.getRepository(context, TemperatureReading)

    const startDate = new Date(params.startTime)
    const endDate = new Date(params.endTime)

    const query = readingRepo.createQueryBuilder("reading")
      .where("reading.equipment_id = :equipmentId", { equipmentId: params.equipmentId })
      .andWhere("reading.recorded_at >= :startDate", { startDate })
      .andWhere("reading.recorded_at <= :endDate", { endDate })

    if (params.measurementType && params.measurementType !== "both") {
      query.andWhere("reading.measurement_type = :type", { type: params.measurementType })
    }

    query.orderBy("reading.recorded_at", "ASC")

    const readings = await query.getMany()

    return readings.map((reading) =>
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

    const query = readingRepo.createQueryBuilder("reading")
      .where("reading.equipment_id = :equipmentId", { equipmentId })
      .orderBy("reading.recorded_at", "DESC")
      .limit(1)

    if (measurementType) {
      query.andWhere("reading.measurement_type = :type", { type: measurementType })
    }

    const reading = await query.getOne()

    return reading ? this.baseRepository_.serialize<TemperatureReadingDTO>(reading) : null
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }
}
