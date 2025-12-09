import { getLinkedFields } from "../../../dashboard-app"

// Include all default product fields plus Goods-specific fields
export const PRODUCT_DETAIL_FIELDS = getLinkedFields(
  "product",
  "id,title,subtitle,status,external_id,description,handle,is_giftcard,discountable,thumbnail,collection_id,type_id,weight,length,height,width,hs_code,origin_country,mid_code,material,created_at,updated_at,deleted_at,metadata,brand,barcode,unit_of_measure,is_organic,is_gluten_free,is_vegan,is_non_gmo,*type,*collection,*options,*options.values,*tags,*images,*categories,*shipping_profile,-variants"
)
