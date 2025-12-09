import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251204142435 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "goods_retailer_mapping" ("id" text not null, "product_id" text not null, "store_name" text not null, "store_item_id" text not null, "store_item_name" text null, "store_image_url" text null, "brand_logo_url" text null, "stock_status" text null, "store_location_text" text null, "product_availability" jsonb null, "unavailability_reasons" jsonb null, "minimum_order_quantity" integer null, "maximum_order_quantity" integer null, "availability_schedule" jsonb null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goods_retailer_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goods_retailer_mapping_deleted_at" ON "goods_retailer_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "goods_retailer_pricing" ("id" text not null, "product_id" text not null, "store_name" text not null, "location_id" text null, "list_price" numeric not null, "sale_price" numeric null, "is_on_sale" boolean not null default false, "is_price_cut" boolean not null default false, "price_per_unit" numeric null, "price_per_unit_uom" text null, "price_type" text null, "effective_from" timestamptz not null default now(), "effective_to" timestamptz null, "pricing_context" text null, "raw_list_price" jsonb not null, "raw_sale_price" jsonb null, "raw_price_per_unit" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goods_retailer_pricing_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goods_retailer_pricing_deleted_at" ON "goods_retailer_pricing" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "goods_retailer_mapping" cascade;`);

    this.addSql(`drop table if exists "goods_retailer_pricing" cascade;`);
  }

}
