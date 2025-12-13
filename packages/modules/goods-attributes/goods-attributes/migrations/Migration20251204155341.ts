import { Migration } from "@switchyard/framework/mikro-orm/migrations";

export class Migration20251204155341 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "goods_product_attributes" add column if not exists "inventory_type" text null, add column if not exists "warehouse_aisle" text null, add column if not exists "warehouse_shelf_group" text null, add column if not exists "warehouse_shelf" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "goods_product_attributes" drop column if exists "inventory_type", drop column if exists "warehouse_aisle", drop column if exists "warehouse_shelf_group", drop column if exists "warehouse_shelf";`);
  }

}
