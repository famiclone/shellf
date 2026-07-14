CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Migrate genres JSON → tags + item_tags (slug ≈ lower(spaces→hyphens))
INSERT INTO `tags` (`name`, `slug`)
SELECT
	trim(j.value) AS name,
	lower(
		replace(
			replace(
				replace(trim(j.value), ' ', '-'),
				'''',
				''
			),
			'"',
			''
		)
	) AS slug
FROM `items`, json_each(`items`.`genres`) AS j
WHERE typeof(`items`.`genres`) = 'text'
	AND length(trim(COALESCE(j.value, ''))) > 0
GROUP BY slug
HAVING slug != '';
--> statement-breakpoint
INSERT OR IGNORE INTO `item_tags` (`item_id`, `tag_id`)
SELECT
	i.id,
	t.id
FROM `items` i, json_each(i.`genres`) AS j
INNER JOIN `tags` t ON t.`slug` = lower(
	replace(
		replace(
			replace(trim(j.value), ' ', '-'),
			'''',
			''
		),
		'"',
		''
	)
)
WHERE typeof(i.`genres`) = 'text'
	AND length(trim(COALESCE(j.value, ''))) > 0;
--> statement-breakpoint
ALTER TABLE `items` DROP COLUMN `genres`;
