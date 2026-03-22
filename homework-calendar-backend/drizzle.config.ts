import { parseConfig } from "./src/utils"
const config = parseConfig()
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'sqlite',
    dbCredentials: {
        url: config.DB_FILE_NAME,
    },
});
