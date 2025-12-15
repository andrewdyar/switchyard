export interface DriverDTO {
  id: string
  customer_id: string | null
  first_name: string
  last_name: string
  phone: string
  email: string | null
  license_number: string | null
  vehicle_info: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateDriverDTO {
  customer_id?: string | null
  first_name: string
  last_name: string
  phone: string
  email?: string | null
  license_number?: string | null
  vehicle_info?: string | null
  is_active?: boolean
}

export interface UpdateDriverDTO {
  customer_id?: string | null
  first_name?: string
  last_name?: string
  phone?: string
  email?: string | null
  license_number?: string | null
  vehicle_info?: string | null
  is_active?: boolean
}

