import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull().unique(),
  emulatorCore: text("emulator_core"),
  description: text("description"),
});

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  region: text("region"),
  purchasePrice: real("purchase_price"),
  currency: text("currency").default("UAH"),
  condition: text("condition"),
  notes: text("notes"),
  genres: text("genres", { mode: "json" }).$type<string[]>().notNull().default([]),
  customMeta: text("custom_meta", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const romFiles = sqliteTable("rom_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .unique()
    .references(() => games.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  crc32: text("crc32").notNull(),
  md5: text("md5").notNull(),
  sha1: text("sha1").notNull(),
  size: integer("size").notNull(),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename").notNull(),
});

export const patches = sqliteTable("patches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").notNull(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
});

export const saves = sqliteTable("saves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").notNull().default("sram"),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  size: integer("size").notNull(),
});

export const scrapedMetadata = sqliteTable("scraped_metadata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .unique()
    .references(() => games.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("screenscraper"),
  externalId: text("external_id"),
  title: text("title"),
  description: text("description"),
  coverUrl: text("cover_url"),
  marketPrice: real("market_price"),
  marketPriceSyncedAt: text("market_price_synced_at"),
  rawPayload: text("raw_payload", { mode: "json" }).$type<Record<string, unknown>>(),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const platformsRelations = relations(platforms, ({ many }) => ({
  games: many(games),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [games.platformId],
    references: [platforms.id],
  }),
  romFile: one(romFiles, {
    fields: [games.id],
    references: [romFiles.gameId],
  }),
  mediaAssets: many(mediaAssets),
  patches: many(patches),
  saves: many(saves),
  scrapedMetadata: one(scrapedMetadata, {
    fields: [games.id],
    references: [scrapedMetadata.gameId],
  }),
}));

export const romFilesRelations = relations(romFiles, ({ one }) => ({
  game: one(games, {
    fields: [romFiles.gameId],
    references: [games.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  game: one(games, {
    fields: [mediaAssets.gameId],
    references: [games.id],
  }),
}));

export const patchesRelations = relations(patches, ({ one }) => ({
  game: one(games, {
    fields: [patches.gameId],
    references: [games.id],
  }),
}));

export const savesRelations = relations(saves, ({ one }) => ({
  game: one(games, {
    fields: [saves.gameId],
    references: [games.id],
  }),
}));

export const scrapedMetadataRelations = relations(scrapedMetadata, ({ one }) => ({
  game: one(games, {
    fields: [scrapedMetadata.gameId],
    references: [games.id],
  }),
}));
