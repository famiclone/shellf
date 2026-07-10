CREATE TABLE `platforms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`emulator_core` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_short_name_unique` ON `platforms` (`short_name`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`platform_id` integer NOT NULL,
	`region` text,
	`purchase_price` real,
	`currency` text DEFAULT 'UAH',
	`condition` text,
	`notes` text,
	`custom_meta` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rom_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`crc32` text NOT NULL,
	`md5` text NOT NULL,
	`sha1` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rom_files_game_id_unique` ON `rom_files` (`game_id`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`type` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_filename` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scraped_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`source` text DEFAULT 'screenscraper' NOT NULL,
	`external_id` text,
	`title` text,
	`description` text,
	`cover_url` text,
	`market_price` real,
	`market_price_synced_at` text,
	`raw_payload` text,
	`synced_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scraped_metadata_game_id_unique` ON `scraped_metadata` (`game_id`);
