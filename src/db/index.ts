import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: `file://${import.meta.dir}/../../data/devices.db`,
});

export const db = drizzle(client, { schema });
