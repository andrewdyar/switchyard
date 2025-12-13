import { Check, CheckOptions } from "@switchyard/deps/mikro-orm/core"
import { CheckConstraint, EntityConstructor } from "@switchyard/types"

/**
 * Defines PostgreSQL constraints using the MikrORM's "@Check"
 * decorator
 */
export function applyChecks(
  MikroORMEntity: EntityConstructor<any>,
  entityChecks: CheckConstraint<any>[] = []
) {
  entityChecks.forEach((check) => {
    Check(
      typeof check === "function"
        ? {
            expression: check as CheckOptions["expression"],
          }
        : (check as CheckOptions)
    )(MikroORMEntity)
  })
}
