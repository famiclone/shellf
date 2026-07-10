UPDATE `games` SET `region` = 'NTSC-J' WHERE `region` = 'JP';
--> statement-breakpoint
UPDATE `games` SET `region` = 'NTSC-U' WHERE `region` = 'US';
--> statement-breakpoint
UPDATE `games` SET `region` = 'PAL' WHERE `region` IN ('EU', 'AU');
--> statement-breakpoint
UPDATE `games` SET `region` = 'OTHER' WHERE `region` IN ('KR', 'CN');
