import { SwitchyardContainer } from "@switchyard/types"

export default async function handler(container: SwitchyardContainer) {
  console.log(`You have received 5 orders today`)
}

export const config = {
  name: "summarize-orders",
  schedule: "* * * * * *",
  numberOfExecutions: 2,
}
