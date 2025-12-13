import { ModuleJoinerConfig } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

export const OrderCustomer: ModuleJoinerConfig = {
  isLink: true,
  isReadOnlyLink: true,
  extends: [
    {
      serviceName: Modules.ORDER,
      entity: "Order",
      relationship: {
        serviceName: Modules.CUSTOMER,
        entity: "Customer",
        primaryKey: "id",
        foreignKey: "customer_id",
        alias: "customer",
        args: {
          methodSuffix: "Customers",
        },
      },
    },
    {
      serviceName: Modules.CUSTOMER,
      entity: "Customer",
      relationship: {
        serviceName: Modules.ORDER,
        entity: "Order",
        primaryKey: "customer_id",
        foreignKey: "id",
        alias: "orders",
        args: {
          methodSuffix: "Orders",
        },
        isList: true,
      },
    },
  ],
}
