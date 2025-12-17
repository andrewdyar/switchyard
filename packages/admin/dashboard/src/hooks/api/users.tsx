import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"

export interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // TODO: Replace with actual users API endpoint when available
      // For now, return empty array - this will be implemented when user management is available
      return [] as User[]
    },
  })
}
