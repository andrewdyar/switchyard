import { Migration } from "@switchyard/framework/mikro-orm/migrations";

export class Migration20251204135728 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "goods_source_product_link" ("id" text not null, "source_product_id" text not null, "source_store_name" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goods_source_product_link_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goods_source_product_link_deleted_at" ON "goods_source_product_link" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "goods_source_product_link" cascade;`);
  }

}
