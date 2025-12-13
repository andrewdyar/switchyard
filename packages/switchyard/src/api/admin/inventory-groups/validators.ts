import { z } from "zod"
import { booleanString } from "../../utils/common-validators"
import { createFindParams } from "../../utils/validators"

export const AdminCreateInventoryGroup = z.object({
  name: z.string().min(1),
  handle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  type: z.enum(["zone", "aisle", "group", "shelf"]).optional(),
  zone_code: z.enum(["A", "R", "F"]).optional().nullable(),
  aisle_number: z.number().optional().nullable(),
  group_number: z.number().optional().nullable(),
  shelf_number: z.number().optional().nullable(),
  location_code: z.string().optional().nullable(),
  parent_group_id: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  rank: z.number().optional(),
})

export type AdminCreateInventoryGroupType = z.infer<
  typeof AdminCreateInventoryGroup
>

export const AdminUpdateInventoryGroup = z.object({
  name: z.string().optional(),
  handle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  type: z.enum(["zone", "aisle", "group", "shelf"]).optional(),
  zone_code: z.enum(["A", "R", "F"]).optional().nullable(),
  aisle_number: z.number().optional().nullable(),
  group_number: z.number().optional().nullable(),
  shelf_number: z.number().optional().nullable(),
  location_code: z.string().optional().nullable(),
  parent_group_id: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  rank: z.number().optional(),
})

export type AdminUpdateInventoryGroupType = z.infer<
  typeof AdminUpdateInventoryGroup
>

export const AdminGetInventoryGroupsParamsFields = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
  handle: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  zone_code: z.union([z.string(), z.array(z.string())]).optional(),
  parent_group_id: z
    .union([z.string(), z.array(z.string()), z.null()])
    .optional(),
  is_active: booleanString().optional(),
  q: z.string().optional(),
  include_descendants_tree: booleanString().optional(),
  include_ancestors_tree: booleanString().optional(),
})

export const AdminGetInventoryGroupsParams = createFindParams({
  offset: 0,
  limit: 50,
}).merge(AdminGetInventoryGroupsParamsFields)

export type AdminGetInventoryGroupsParamsType = z.infer<
  typeof AdminGetInventoryGroupsParams
>

export const AdminUpdateInventoryGroupProducts = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
})

export type AdminUpdateInventoryGroupProductsType = z.infer<
  typeof AdminUpdateInventoryGroupProducts
>

