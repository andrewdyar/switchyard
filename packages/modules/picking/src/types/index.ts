export type PickListStatus = "pending" | "in_progress" | "completed"
export type PickListItemStatus = "pending" | "picked" | "unavailable" | "partial"

export interface PickListDTO {
  id: string
  order_id: string
  picker_id: string | null
  status: PickListStatus
  started_at: Date | null
  completed_at: Date | null
  priority: number
  created_at: Date
  updated_at: Date
}

export interface PickListItemDTO {
  id: string
  pick_list_id: string
  order_item_id: string
  product_id: string
  variant_id: string | null
  location_id: string | null
  location_code: string | null
  quantity: number
  picked_quantity: number
  status: PickListItemStatus
  sequence: number | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface CreatePickListDTO {
  order_id: string
  picker_id?: string | null
  priority?: number
}

export interface CreatePickListItemDTO {
  pick_list_id: string
  order_item_id: string
  product_id: string
  variant_id?: string | null
  location_id?: string | null
  location_code?: string | null
  quantity: number
  sequence?: number | null
}

export interface UpdatePickListDTO {
  picker_id?: string | null
  status?: PickListStatus
  started_at?: Date | null
  completed_at?: Date | null
  priority?: number
}

export interface UpdatePickListItemDTO {
  picked_quantity?: number
  status?: PickListItemStatus
  sequence?: number | null
  notes?: string | null
}

