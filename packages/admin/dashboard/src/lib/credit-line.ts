import { OrderCreditLineDTO } from "@switchyard/types"

export const getTotalCreditLines = (creditLines: OrderCreditLineDTO[]) =>
  creditLines.reduce((acc, creditLine) => {
    acc = acc + (creditLine.amount as number)

    return acc
  }, 0)
