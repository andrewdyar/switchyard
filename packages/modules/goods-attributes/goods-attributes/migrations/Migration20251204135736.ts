import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251204135736 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "goods_product_attributes" ("id" text not null, "brand" text null, "unit_of_measure" text not null default 'each', "priced_by_weight" boolean not null default false, "is_organic" boolean not null default false, "is_gluten_free" boolean not null default false, "is_vegan" boolean not null default false, "is_non_gmo" boolean not null default false, "is_new" boolean not null default false, "on_ad" boolean not null default false, "best_available" boolean not null default false, "show_coupon_flag" boolean not null default false, "in_assortment" boolean not null default true, "full_category_hierarchy" text null, "product_page_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goods_product_attributes_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goods_product_attributes_deleted_at" ON "goods_product_attributes" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "goods_product_attributes" cascade;`);
  }

}
