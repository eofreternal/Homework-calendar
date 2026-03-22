import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from "./schema"

import { parseConfig } from "../utils"
const config = parseConfig()

const sqlite = new Database(config.DB_FILE_NAME);
export const db = drizzle({ client: sqlite, schema: schema });