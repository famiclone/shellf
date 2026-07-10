CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`data` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `app_settings` (`id`, `data`) VALUES (1, '{"theme":"dark","locale":"en","screenscraper":{"softname":"shellf","devId":"","devPassword":""},"emulator":{}}');
