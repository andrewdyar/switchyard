export interface VariantGroupDTO {
  id: string
  name: string
  brand?: string | null
  description?: string | null
  image_url?: string | null
  members?: VariantGroupMemberDTO[]
  created_at?: Date
  updated_at?: Date
}

export interface VariantGroupMemberDTO {
  id: string
  variant_group_id: string
  sellable_product_id: string
  is_default: boolean
  display_order: number
  variant_label?: string | null
  created_at?: Date
}

export interface CreateVariantGroupDTO {
  name: string
  brand?: string | null
  description?: string | null
  image_url?: string | null
}

export interface UpdateVariantGroupDTO {
  name?: string
  brand?: string | null
  description?: string | null
  image_url?: string | null
}

export interface AddProductToGroupDTO {
  variant_group_id: string
  sellable_product_id: string
  is_default?: boolean
  display_order?: number
  variant_label?: string | null
}
