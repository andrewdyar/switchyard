import { model } from "@switchyard/framework/utils";

export default model.define("translation", {
  id: model.id({ prefix: "i18n" }).primaryKey(),
  key: model.text().unique(),
  value: model.json().default({}),
});
