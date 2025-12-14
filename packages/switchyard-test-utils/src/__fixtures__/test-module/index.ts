import { Module } from "@switchyard/framework/utils"
import TestService from "./service"

export const TEST_MODULE = "test"

export default Module(TEST_MODULE, {
  service: TestService,
})
