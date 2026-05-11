import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { makers } from "./makers";

export const models = sqliteTable("models", {
	id: integer().primaryKey({ autoIncrement: true }),
	makerId: integer("maker_id")
		.notNull()
		.references(() => makers.id),
	name: text().notNull(),
	slug: text().notNull().unique(),
	url: text().notNull(),
	imageUrl: text("image_url"),
	imageLocalPath: text("image_local_path"),
	category: text(),

	announced: text(),
	status: text(),
	dimensions: text(),
	weight: text(),
	build: text(),
	sim: text(),
	displayType: text("display_type"),
	displaySize: text("display_size"),
	displayResolution: text("display_resolution"),
	displayProtection: text("display_protection"),
	os: text(),
	chipset: text(),
	cpu: text(),
	gpu: text(),
	cardSlot: text("card_slot"),
	internalMemory: text("internal_memory"),
	mainCamera: text("main_camera"),
	mainCameraFeatures: text("main_camera_features"),
	mainCameraVideo: text("main_camera_video"),
	selfieCamera: text("selfie_camera"),
	selfieFeatures: text("selfie_features"),
	selfieVideo: text("selfie_video"),
	battery: text(),
	batteryCharging: text("battery_charging"),
	networkTech: text("network_tech"),
	sensors: text(),
	colors: text(),
	colorsHex: text("colors_hex"),
	modelsText: text("models_text"),
	price: text(),
	dimensionsWidth: real("dimensions_width"),
	dimensionsHeight: real("dimensions_height"),
	dimensionsThickness: real("dimensions_thickness"),
	weightGrams: real("weight_grams"),
	displaySizeInches: real("display_size_inches"),
	displaySizeRatio: text("display_size_ratio"),
	displayResWidth: integer("display_res_width"),
	displayResHeight: integer("display_res_height"),
	displayResPpi: integer("display_res_ppi"),
	released: text(),

	meta: text(),

	scraped: integer().notNull().default(0),
	createdAt: text("created_at")
		.notNull()
		.$default(() => new Date().toISOString()),
});

export type ModelInsert = typeof models.$inferInsert;
export type ModelSelect = typeof models.$inferSelect;
