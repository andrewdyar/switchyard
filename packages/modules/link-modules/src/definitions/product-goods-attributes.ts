/**
 * Product - Goods Attributes Link Definition
 * 
 * Links source_products to goods_product_attributes
 * Extends products with Goods-specific attributes like brand, dietary flags, etc.
 */

import { ModuleJoinerConfig } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const GOODS_ATTRIBUTES_MODULE = "goodsAttributesModuleService"
export const LINK_PRODUCT_GOODS_ATTRIBUTES = "ProductGoodsAttributesLink"

export const ProductGoodsAttributes: ModuleJoinerConfig = {
  serviceName: LINK_PRODUCT_GOODS_ATTRIBUTES,
  isLink: true,
  databaseConfig: {
    tableName: "product_goods_attributes_link",
    idPrefix: "prodgattr",
  },
  alias: [
    {
      name: "product_goods_attributes_link",
    },
    {
      name: "product_goods_attributes_links",
    },
  ],
  primaryKeys: ["id", "product_id", "goods_product_attributes_id"],
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
      hasMany: false,
    },
    {
      serviceName: GOODS_ATTRIBUTES_MODULE,
      entity: "ProductAttributes",
      primaryKey: "id",
      foreignKey: "goods_product_attributes_id",
      alias: "goods_attributes",
      args: {
        methodSuffix: "GoodsAttributes",
      },
      hasMany: false,
    },
  ],
  extends: [
    {
      serviceName: Modules.PRODUCT,
      entity: "Product",
      fieldAlias: {
        goods_attributes: {
          path: "goods_attributes_link.goods_attributes",
          isList: false,
        },
      },
      relationship: {
        serviceName: LINK_PRODUCT_GOODS_ATTRIBUTES,
        primaryKey: "product_id",
        foreignKey: "id",
        alias: "goods_attributes_link",
        isList: false,
      },
    },
  ],
}

