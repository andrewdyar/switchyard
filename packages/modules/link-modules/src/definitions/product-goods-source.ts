/**
 * Product - Goods Source Link Definition
 * 
 * Links source_products to goods_source_product_link
 * This enables tracing commerce products back to their source catalog.
 */

import { ModuleJoinerConfig } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const GOODS_SOURCE_MODULE = "goodsSourceModuleService"
export const LINK_PRODUCT_GOODS_SOURCE = "ProductGoodsSourceLink"

export const ProductGoodsSource: ModuleJoinerConfig = {
  serviceName: LINK_PRODUCT_GOODS_SOURCE,
  isLink: true,
  databaseConfig: {
    tableName: "product_goods_source_link",
    idPrefix: "prodgsrc",
  },
  alias: [
    {
      name: "product_goods_source_link",
    },
    {
      name: "product_goods_source_links",
    },
  ],
  primaryKeys: ["id", "product_id", "goods_source_product_link_id"],
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
      serviceName: GOODS_SOURCE_MODULE,
      entity: "SourceProductLink",
      primaryKey: "id",
      foreignKey: "goods_source_product_link_id",
      alias: "source_link",
      args: {
        methodSuffix: "SourceLinks",
      },
      hasMany: false,
    },
  ],
  extends: [
    {
      serviceName: Modules.PRODUCT,
      entity: "Product",
      fieldAlias: {
        source_link: {
          path: "source_link_link.source_link",
          isList: false,
        },
      },
      relationship: {
        serviceName: LINK_PRODUCT_GOODS_SOURCE,
        primaryKey: "product_id",
        foreignKey: "id",
        alias: "source_link_link",
        isList: false,
      },
    },
  ],
}

