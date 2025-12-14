import TelemetryDispatcher from "./telemetry-dispatcher"

const SWITCHYARD_TELEMETRY_HOST = process.env.SWITCHYARD_TELEMETRY_HOST || ""
const SWITCHYARD_TELEMETRY_PATH = process.env.SWITCHYARD_TELEMETRY_PATH || ""

const dispatcher = new TelemetryDispatcher({
  host: SWITCHYARD_TELEMETRY_HOST,
  path: SWITCHYARD_TELEMETRY_PATH,
})
dispatcher.dispatch()
