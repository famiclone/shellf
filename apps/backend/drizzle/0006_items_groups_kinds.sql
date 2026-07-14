-- Item kinds (system + custom)
CREATE TABLE `kinds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`features` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `kinds` (`id`, `slug`, `name`, `is_system`, `features`) VALUES
	(1, 'game', 'Game', 1, '{"emulator":true,"rom":true,"patches":true,"saves":true,"scrape":true}'),
	(2, 'figure', 'Figure', 1, '{}'),
	(3, 'lego', 'LEGO', 1, '{}'),
	(4, 'book', 'Book', 1, '{}'),
	(5, 'disc', 'Disc', 1, '{}'),
	(6, 'cassette', 'Cassette', 1, '{}'),
	(7, 'other', 'Other', 1, '{}');
--> statement-breakpoint

-- Groups replace platforms
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`description` text,
	`kind_id` integer REFERENCES `kinds`(`id`) ON DELETE SET NULL,
	`emulator_core` text
);
--> statement-breakpoint
INSERT INTO `groups` (`id`, `name`, `slug`, `description`, `kind_id`, `emulator_core`)
SELECT `id`, `name`, `short_name`, `description`, 1, `emulator_core` FROM `platforms`;
--> statement-breakpoint

-- Items replace games
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`kind_id` integer NOT NULL REFERENCES `kinds`(`id`) ON DELETE RESTRICT,
	`group_id` integer NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
	`region` text,
	`purchase_price` real,
	`currency` text DEFAULT 'UAH',
	`condition` text,
	`is_pirate` integer DEFAULT false NOT NULL,
	`notes` text,
	`genres` text DEFAULT '[]' NOT NULL,
	`custom_meta` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `items` (
	`id`, `title`, `kind_id`, `group_id`, `region`, `purchase_price`, `currency`,
	`condition`, `is_pirate`, `notes`, `genres`, `custom_meta`, `created_at`, `updated_at`
)
SELECT
	`id`, `title`, 1, `platform_id`, `region`, `purchase_price`, `currency`,
	`condition`, `is_pirate`, `notes`, `genres`, `custom_meta`, `created_at`, `updated_at`
FROM `games`;
--> statement-breakpoint

-- Rebuild child tables with item_id
CREATE TABLE `rom_files_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL UNIQUE REFERENCES `items`(`id`) ON DELETE CASCADE,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`crc32` text NOT NULL,
	`md5` text NOT NULL,
	`sha1` text NOT NULL,
	`size` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `rom_files_new` SELECT `id`, `game_id`, `storage_path`, `original_filename`, `crc32`, `md5`, `sha1`, `size` FROM `rom_files`;
--> statement-breakpoint
DROP TABLE `rom_files`;
--> statement-breakpoint
ALTER TABLE `rom_files_new` RENAME TO `rom_files`;
--> statement-breakpoint

CREATE TABLE `media_assets_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL REFERENCES `items`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_filename` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `media_assets_new` SELECT `id`, `game_id`, `type`, `storage_path`, `mime_type`, `original_filename` FROM `media_assets`;
--> statement-breakpoint
DROP TABLE `media_assets`;
--> statement-breakpoint
ALTER TABLE `media_assets_new` RENAME TO `media_assets`;
--> statement-breakpoint

CREATE TABLE `patches_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL REFERENCES `items`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `patches_new` SELECT `id`, `game_id`, `name`, `format`, `storage_path`, `original_filename` FROM `patches`;
--> statement-breakpoint
DROP TABLE `patches`;
--> statement-breakpoint
ALTER TABLE `patches_new` RENAME TO `patches`;
--> statement-breakpoint

CREATE TABLE `saves_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL REFERENCES `items`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`format` text DEFAULT 'sram' NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`size` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `saves_new` SELECT `id`, `game_id`, `name`, `format`, `storage_path`, `original_filename`, `size` FROM `saves`;
--> statement-breakpoint
DROP TABLE `saves`;
--> statement-breakpoint
ALTER TABLE `saves_new` RENAME TO `saves`;
--> statement-breakpoint

CREATE TABLE `scraped_metadata_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL UNIQUE REFERENCES `items`(`id`) ON DELETE CASCADE,
	`source` text DEFAULT 'screenscraper' NOT NULL,
	`external_id` text,
	`title` text,
	`description` text,
	`cover_url` text,
	`market_price` real,
	`market_price_synced_at` text,
	`raw_payload` text,
	`synced_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `scraped_metadata_new` SELECT
	`id`, `game_id`, `source`, `external_id`, `title`, `description`, `cover_url`,
	`market_price`, `market_price_synced_at`, `raw_payload`, `synced_at`
FROM `scraped_metadata`;
--> statement-breakpoint
DROP TABLE `scraped_metadata`;
--> statement-breakpoint
ALTER TABLE `scraped_metadata_new` RENAME TO `scraped_metadata`;
--> statement-breakpoint

DROP TABLE `games`;
--> statement-breakpoint
DROP TABLE `platforms`;
