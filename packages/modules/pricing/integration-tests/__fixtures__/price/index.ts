import { Price } from "@models"
import { defaultPricesData } from "./data"
import { SqlEntityManager } from "@switchyard/framework/mikro-orm/postgresql"
import { toMikroORMEntity } from "@switchyard/framework/utils"

export * from "./data"

export async function createPrices(
  manager: SqlEntityManager,
  pricesData: any[] = defaultPricesData
): Promise<Price[]> {
  const prices: Price[] = []

  for (let data of pricesData) {
    const price = manager.create(toMikroORMEntity(Price), data)
    prices.push(price)
  }

  await manager.persistAndFlush(prices)

  return prices
}
