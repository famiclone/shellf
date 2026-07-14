import type { AppSettingsData, KindFeatures, PriceChartingData } from "@shellf/shared";
import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  data: text("data", { mode: "json" }).$type<AppSettingsData>().notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const kinds = sqliteTable("kinds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  features: text("features", { mode: "json" })
    .$type<KindFeatures>()
    .notNull()
    .default({}),
});

export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  kindId: integer("kind_id").references(() => kinds.id, { onDelete: "set null" }),
  emulatorCore: text("emulator_core"),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  kindId: integer("kind_id")
    .notNull()
    .references(() => kinds.id, { onDelete: "restrict" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  region: text("region"),
  purchasePrice: real("purchase_price"),
  currency: text("currency").default("UAH"),
  condition: text("condition"),
  isPirate: integer("is_pirate", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  customMeta: text("custom_meta", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.itemId, t.tagId] }),
  }),
);

export const romFiles = sqliteTable("rom_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .unique()
    .references(() => items.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  crc32: text("crc32").notNull(),
  md5: text("md5").notNull(),
  sha1: text("sha1").notNull(),
  size: integer("size").notNull(),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename").notNull(),
});

export const patches = sqliteTable("patches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").notNull(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
});

export const saves = sqliteTable("saves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").notNull().default("sram"),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  size: integer("size").notNull(),
});

export const scrapedMetadata = sqliteTable("scraped_metadata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .unique()
    .references(() => items.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("screenscraper"),
  externalId: text("external_id"),
  title: text("title"),
  description: text("description"),
  coverUrl: text("cover_url"),
  marketPrice: real("market_price"),
  marketPriceSyncedAt: text("market_price_synced_at"),
  pricecharting: text("pricecharting", { mode: "json" }).$type<PriceChartingData | null>(),
  rawPayload: text("raw_payload", { mode: "json" }).$type<Record<string, unknown>>(),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const kindsRelations = relations(kinds, ({ many }) => ({
  groups: many(groups),
  items: many(items),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  kind: one(kinds, {
    fields: [groups.kindId],
    references: [kinds.id],
  }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  kind: one(kinds, {
    fields: [items.kindId],
    references: [kinds.id],
  }),
  group: one(groups, {
    fields: [items.groupId],
    references: [groups.id],
  }),
  itemTags: many(itemTags),
  romFile: one(romFiles, {
    fields: [items.id],
    references: [romFiles.itemId],
  }),
  mediaAssets: many(mediaAssets),
  patches: many(patches),
  saves: many(saves),
  scrapedMetadata: one(scrapedMetadata, {
    fields: [items.id],
    references: [scrapedMetadata.itemId],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  itemTags: many(itemTags),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
  tag: one(tags, {
    fields: [itemTags.tagId],
    references: [tags.id],
  }),
}));

export const romFilesRelations = relations(romFiles, ({ one }) => ({
  item: one(items, {
    fields: [romFiles.itemId],
    references: [items.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  item: one(items, {
    fields: [mediaAssets.itemId],
    references: [items.id],
  }),
}));

export const patchesRelations = relations(patches, ({ one }) => ({
  item: one(items, {
    fields: [patches.itemId],
    references: [items.id],
  }),
}));

export const savesRelations = relations(saves, ({ one }) => ({
  item: one(items, {
    fields: [saves.itemId],
    references: [items.id],
  }),
}));

export const scrapedMetadataRelations = relations(scrapedMetadata, ({ one }) => ({
  item: one(items, {
    fields: [scrapedMetadata.itemId],
    references: [items.id],
  }),
}));
