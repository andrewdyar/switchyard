import { SwitchyardError } from "@switchyard/framework/utils"
import { getRuleAttributesMap } from "./rule-attributes-map"
import {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionTypeValues,
  RuleTypeValues,
} from "@switchyard/types"

export function validateRuleAttribute(attributes: {
  promotionType: PromotionTypeValues | undefined
  ruleType: RuleTypeValues
  ruleAttributeId: string
  applicationMethodType?: ApplicationMethodTypeValues
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
}) {
  const {
    promotionType,
    ruleType,
    ruleAttributeId,
    applicationMethodType,
    applicationMethodTargetType,
  } = attributes

  const ruleAttributes =
    getRuleAttributesMap({
      promotionType,
      applicationMethodType,
      applicationMethodTargetType,
    })[ruleType] || []

  const ruleAttribute = ruleAttributes.find((obj) => obj.id === ruleAttributeId)

  if (!ruleAttribute) {
    throw new SwitchyardError(
      SwitchyardError.Types.INVALID_DATA,
      `Invalid rule attribute - ${ruleAttributeId}`
    )
  }
}
