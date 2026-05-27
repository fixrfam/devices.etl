CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `model_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`original_url` text,
	`r2_key` text,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`variant` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `models` ADD `category` text;--> statement-breakpoint
ALTER TABLE `models` ADD `category_id` integer REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `models` ADD `colors_hex` text;--> statement-breakpoint
ALTER TABLE `models` ADD `dimensions_width` real;--> statement-breakpoint
ALTER TABLE `models` ADD `dimensions_height` real;--> statement-breakpoint
ALTER TABLE `models` ADD `dimensions_thickness` real;--> statement-breakpoint
ALTER TABLE `models` ADD `weight_grams` real;--> statement-breakpoint
ALTER TABLE `models` ADD `display_size_inches` real;--> statement-breakpoint
ALTER TABLE `models` ADD `display_size_ratio` text;--> statement-breakpoint
ALTER TABLE `models` ADD `display_res_width` integer;--> statement-breakpoint
ALTER TABLE `models` ADD `display_res_height` integer;--> statement-breakpoint
ALTER TABLE `models` ADD `display_res_ppi` integer;--> statement-breakpoint
ALTER TABLE `models` ADD `released` text;