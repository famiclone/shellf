CREATE TABLE `saves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`name` text NOT NULL,
	`format` text DEFAULT 'sram' NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
