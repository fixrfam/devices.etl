import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: new URL("../../data/devices.db", import.meta.url).href,
});

export const db = drizzle(client, { schema });
