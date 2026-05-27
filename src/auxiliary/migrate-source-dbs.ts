import { createClient } from "@libsql/client";

const TARGET_URL = new URL("../../data/devices.db", import.meta.url).href;
const DATA_DIR = new URL("../../data/", import.meta.url).href;

const SOURCE_DBS = [
  { path: new URL("devices_gsm_devices.db", DATA_DIR).href, label: "GSMarena" },
  { path: new URL("devices_lpm_devices.db", DATA_DIR).href, label: "LaptopMedia" },
];

const KNOWN_CATEGORIES: Array<{ name: string; slug: string }> = [
  { name: "Phone", slug: "phone" },
  { name: "Tablet", slug: "tablet" },
  { name: "Watch", slug: "watch" },
  { name: "Band", slug: "band" },
  { name: "Laptop", slug: "laptop" },
];

function getR2Key(slug: string, imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  try {
    const ext = new URL(imageUrl).pathname.split(".").pop() || "jpg";
    return `devices/models/${slug}.${ext}`;
  } catch {
    return `devices/models/${slug}.jpg`;
  }
}

const MODEL_COLS = [
  "maker_id",
  "name",
  "slug",
  "url",
  "image_url",
  "image_local_path",
  "category",
  "category_id",
  "announced",
  "status",
  "dimensions",
  "weight",
  "build",
  "sim",
  "display_type",
  "display_size",
  "display_resolution",
  "display_protection",
  "os",
  "chipset",
  "cpu",
  "gpu",
  "card_slot",
  "internal_memory",
  "main_camera",
  "main_camera_features",
  "main_camera_video",
  "selfie_camera",
  "selfie_features",
  "selfie_video",
  "battery",
  "battery_charging",
  "network_tech",
  "sensors",
  "colors",
  "colors_hex",
  "models_text",
  "price",
  "dimensions_width",
  "dimensions_height",
  "dimensions_thickness",
  "weight_grams",
  "display_size_inches",
  "display_size_ratio",
  "display_res_width",
  "display_res_height",
  "display_res_ppi",
  "released",
  "meta",
  "scraped",
  "created_at",
];

const MODEL_PLACEHOLDERS = MODEL_COLS.map(() => "?").join(", ");
const MODEL_UPDATE_SQL = MODEL_COLS.map((c) => `"${c}" = ?`).join(", ");

function rowToValues(
  row: Record<string, unknown>,
  targetMakerId: number,
  categoryId: number | null,
) {
  return [
    targetMakerId,
    row.name as string,
    row.slug as string,
    row.url as string,
    row.image_url ?? null,
    row.image_local_path ?? null,
    row.category ?? null,
    categoryId,
    row.announced ?? null,
    row.status ?? null,
    row.dimensions ?? null,
    row.weight ?? null,
    row.build ?? null,
    row.sim ?? null,
    row.display_type ?? null,
    row.display_size ?? null,
    row.display_resolution ?? null,
    row.display_protection ?? null,
    row.os ?? null,
    row.chipset ?? null,
    row.cpu ?? null,
    row.gpu ?? null,
    row.card_slot ?? null,
    row.internal_memory ?? null,
    row.main_camera ?? null,
    row.main_camera_features ?? null,
    row.main_camera_video ?? null,
    row.selfie_camera ?? null,
    row.selfie_features ?? null,
    row.selfie_video ?? null,
    row.battery ?? null,
    row.battery_charging ?? null,
    row.network_tech ?? null,
    row.sensors ?? null,
    row.colors ?? null,
    row.colors_hex ?? null,
    row.models_text ?? null,
    row.price ?? null,
    row.dimensions_width ?? null,
    row.dimensions_height ?? null,
    row.dimensions_thickness ?? null,
    row.weight_grams ?? null,
    row.display_size_inches ?? null,
    row.display_size_ratio ?? null,
    row.display_res_width ?? null,
    row.display_res_height ?? null,
    row.display_res_ppi ?? null,
    row.released ?? null,
    row.meta ?? null,
    row.scraped ?? 0,
    row.created_at ?? new Date().toISOString(),
  ];
}

async function main() {
  const target = createClient({ url: TARGET_URL });
  await target.execute("PRAGMA journal_mode = WAL");
  await target.execute("PRAGMA busy_timeout = 10000");

  /* ---- Categories ---- */
  console.log("=== Seeding categories ===");
  const categoryMap = new Map<string, number>();
  for (const cat of KNOWN_CATEGORIES) {
    const existing = await target.execute("SELECT id FROM categories WHERE slug = ?", [cat.slug]);
    if (existing.rows.length > 0) {
      categoryMap.set(cat.slug, existing.rows[0]?.id as number);
    } else {
      const result = await target.execute("INSERT INTO categories (name, slug) VALUES (?, ?)", [
        cat.name,
        cat.slug,
      ]);
      categoryMap.set(cat.slug, Number(result.lastInsertRowid));
      console.log(`  Created category: ${cat.slug}`);
    }
  }

  let totalMakers = 0;
  let totalModels = 0;
  let totalImages = 0;
  let totalSkipped = 0;

  for (const source of SOURCE_DBS) {
    console.log(`\n=== Importing ${source.label} ===`);
    const src = createClient({ url: source.path });

    /* ---- Makers (dedup by normalized name, keep original slug) ---- */
    const srcMakerRows = (await src.execute("SELECT * FROM makers")).rows;
    const srcMakerIdToTargetId = new Map<number, number>();

    for (const row of srcMakerRows) {
      const existing = await target.execute(
        "SELECT id, slug FROM makers WHERE LOWER(name) = LOWER(?)", [row.name as string],
      );

      if (existing.rows.length > 0) {
        /* Update all fields except slug (keep the original) */
        const targetId = existing.rows[0]?.id as number;
        srcMakerIdToTargetId.set(row.id as number, targetId);
        await target.execute(
          "UPDATE makers SET name = ?, url = ?, device_count = ?, page_count = ?, created_at = ? WHERE id = ?",
          [row.name as string, row.url as string, (row.device_count as number) ?? 0, row.page_count as number | null, row.created_at as string, targetId],
        );
      } else {
        const result = await target.execute(
          "INSERT INTO makers (name, slug, url, device_count, page_count, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [row.name as string, row.slug as string, row.url as string, (row.device_count as number) ?? 0, row.page_count as number | null, row.created_at as string],
        );
        srcMakerIdToTargetId.set(row.id as number, Number(result.lastInsertRowid));
      }
    }
    totalMakers += srcMakerRows.length;
    console.log(`  Makers: ${srcMakerRows.length}`);

    /* ---- Models ---- */
    const srcModelRows = (await src.execute("SELECT * FROM models")).rows;

    for (const row of srcModelRows) {
      const targetMakerId = srcMakerIdToTargetId.get(row.maker_id as number);
      if (!targetMakerId) continue;

      const catSlug = row.category as string | null;
      const categoryId = catSlug ? (categoryMap.get(catSlug) ?? null) : null;
      const slug = row.slug as string;

			const values = rowToValues(row, targetMakerId, categoryId) as Array<string | number | null>;

			const existing = await target.execute("SELECT id FROM models WHERE slug = ?", [slug]);
      let targetModelId: number;

      if (existing.rows.length > 0) {
        targetModelId = existing.rows[0]?.id as number;
        values.push(slug);
        await target.execute(`UPDATE models SET ${MODEL_UPDATE_SQL} WHERE slug = ?`, values);
      } else {
        const result = await target.execute(
          `INSERT INTO models (${MODEL_COLS.map((c) => `"${c}"`).join(", ")}) VALUES (${MODEL_PLACEHOLDERS})`,
          values,
        );
        targetModelId = Number(result.lastInsertRowid);
      }

      /* Insert image into model_images */
      if (row.image_url) {
        const r2Key = getR2Key(slug, row.image_url as string);
        const existingImg = await target.execute("SELECT id FROM model_images WHERE model_id = ?", [
          targetModelId,
        ]);
        if (existingImg.rows.length > 0) {
          totalSkipped++;
        } else {
          await target.execute(
            "INSERT INTO model_images (model_id, original_url, r2_key, is_primary, position, created_at) VALUES (?, ?, ?, 1, 0, ?)",
            [targetModelId, row.image_url as string, r2Key, new Date().toISOString()],
          );
          totalImages++;
        }
      }

      totalModels++;
    }

    src.close();
  }

  target.close();

  console.log("\n=== Migration complete ===");
  console.log(`  Categories: ${KNOWN_CATEGORIES.length}`);
  console.log(`  Makers:     ${totalMakers}`);
  console.log(`  Models:     ${totalModels}`);
  console.log(`  Images:     ${totalImages} inserted, ${totalSkipped} skipped (duplicates)`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
