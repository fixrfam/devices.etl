PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`maker_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`url` text NOT NULL,
	`image_url` text,
	`image_local_path` text,
	`announced` text,
	`status` text,
	`dimensions` text,
	`weight` text,
	`build` text,
	`sim` text,
	`display_type` text,
	`display_size` text,
	`display_resolution` text,
	`display_protection` text,
	`os` text,
	`chipset` text,
	`cpu` text,
	`gpu` text,
	`card_slot` text,
	`internal_memory` text,
	`main_camera` text,
	`main_camera_features` text,
	`main_camera_video` text,
	`selfie_camera` text,
	`selfie_features` text,
	`selfie_video` text,
	`battery` text,
	`battery_charging` text,
	`network_tech` text,
	`sensors` text,
	`colors` text,
	`models_text` text,
	`price` text,
	`meta` text,
	`scraped` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`maker_id`) REFERENCES `makers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_models`("id", "maker_id", "name", "slug", "url", "image_url", "image_local_path", "announced", "status", "dimensions", "weight", "build", "sim", "display_type", "display_size", "display_resolution", "display_protection", "os", "chipset", "cpu", "gpu", "card_slot", "internal_memory", "main_camera", "main_camera_features", "main_camera_video", "selfie_camera", "selfie_features", "selfie_video", "battery", "battery_charging", "network_tech", "sensors", "colors", "models_text", "price", "meta", "scraped", "created_at") SELECT "id", "maker_id", "name", "slug", "url", "image_url", "image_local_path", "announced", "status", "dimensions", "weight", "build", "sim", "display_type", "display_size", "display_resolution", "display_protection", "os", "chipset", "cpu", "gpu", "card_slot", "internal_memory", "main_camera", "main_camera_features", "main_camera_video", "selfie_camera", "selfie_features", "selfie_video", "battery", "battery_charging", "network_tech", "sensors", "colors", "models_text", "price", "meta", "scraped", "created_at" FROM `models`;--> statement-breakpoint
DROP TABLE `models`;--> statement-breakpoint
ALTER TABLE `__new_models` RENAME TO `models`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `models_slug_unique` ON `models` (`slug`);