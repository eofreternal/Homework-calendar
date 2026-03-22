import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from "./schema"
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

import { parseConfig } from "../utils"
const config = parseConfig()

const sqlite = new Database(config.DB_FILE_NAME);
const db = drizzle({ client: sqlite, schema: schema });
migrate(db, { migrationsFolder: './drizzle' });

export { db };