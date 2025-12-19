import { Module } from "@switchyard/framework/utils"
import TemperatureDataModuleService from "./services/temperature-data-module"

export const TEMPERATURE_DATA_MODULE = "temperatureData"

export default Module(TEMPERATURE_DATA_MODULE, {
  service: TemperatureDataModuleService,
})

export { TemperatureDataModuleService }
export * from "./models"
export * from "./types"

