export type SweepStatus = "scheduled" | "in_progress" | "completed" | "cancelled"
export type SweepItemStatus = "pending" | "picked" | "unavailable" | "substituted"

export interface SweepDTO {
  id: string
  store_id: string
  sweep_date: Date
  scheduled_start_time: Date
  actual_start_time: Date | null
  actual_end_time: Date | null
  driver_id: string | null
  route_id: string | null
  status: SweepStatus
  total_items: number
  total_load: number | null
  created_at: Date
  updated_at: Date
}

export interface SweepItemDTO {
  id: string
  sweep_id: string
  product_id: string
  store_item_id: string | null
  quantity: number
  picked_quantity: number
  status: SweepItemStatus
  substitute_product_id: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateSweepDTO {
  store_id: string
  sweep_date: Date
  scheduled_start_time: Date
  driver_id?: string | null
  route_id?: string | null
  status?: SweepStatus
}

export interface CreateSweepItemDTO {
  sweep_id: string
  product_id: string
  store_item_id?: string | null
  quantity: number
}

export interface UpdateSweepDTO {
  store_id?: string
  sweep_date?: Date
  scheduled_start_time?: Date
  actual_start_time?: Date | null
  actual_end_time?: Date | null
  driver_id?: string | null
  route_id?: string | null
  status?: SweepStatus
  total_items?: number
  total_load?: number | null
}

export interface UpdateSweepItemDTO {
  quantity?: number
  picked_quantity?: number
  status?: SweepItemStatus
  substitute_product_id?: string | null
  notes?: string | null
}
