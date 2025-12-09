import { useQueryParams } from "../../../../../hooks/use-query-params"

type UseInventoryGroupTableQueryProps = {
  pageSize?: number
  prefix?: string
}

export const useInventoryGroupTableQuery = ({
  pageSize = 20,
  prefix,
}: UseInventoryGroupTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "type", "zone_code", "is_active"],
    prefix
  )

  const { offset, q, type, zone_code, is_active, ...rest } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    type: type,
    zone_code: zone_code,
    is_active: is_active ? is_active === "true" : undefined,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}

