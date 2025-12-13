/**
 * Product - Goods Retailer Mapping Link Definition
 * 
 * Links source_products to goods_retailer_mapping
 * One product can have multiple retailer mappings (one per store).
 */

import { ModuleJoinerConfig } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

const GOODS_RETAILER_MODULE = "goodsRetailerModuleService"
const LINK_PRODUCT_GOODS_RETAILER = "ProductGoodsRetailerLink"

export const ProductGoodsRetailer: ModuleJoinerConfig = {
  serviceName: LINK_PRODUCT_GOODS_RETAILER,
  isLink: true,
  databaseConfig: {
    tableName: "product_goods_retailer_link",
    idPrefix: "prodgret",
  },
  alias: [
    {
      name: "product_goods_retailer_link",
    },
    {
      name: "product_goods_retailer_links",
    },
  ],
  primaryKeys: ["id", "product_id", "goods_retailer_mapping_id"],
  relationships: [
    {
      serviceName: Modules.PRODUCT,
      entity: "Product",
      primaryKey: "id",
      foreignKey: "product_id",
      alias: "product",
      args: {
        methodSuffix: "Products",
      },
      hasMany: true,
    },
    {
      serviceName: GOODS_RETAILER_MODULE,
      entity: "RetailerMapping",
      primaryKey: "id",
      foreignKey: "goods_retailer_mapping_id",
      alias: "retailer_mapping",
      args: {
        methodSuffix: "RetailerMappings",
      },
      hasMany: true,
    },
  ],
  extends: [
    {
      serviceName: Modules.PRODUCT,
      entity: "Product",
      fieldAlias: {
        retailer_mappings: {
          path: "retailer_mappings_link.retailer_mapping",
          isList: true,
        },
      },
      relationship: {
        serviceName: LINK_PRODUCT_GOODS_RETAILER,
        primaryKey: "product_id",
        foreignKey: "id",
        alias: "retailer_mappings_link",
        isList: true,
      },
    },
  ],
}
