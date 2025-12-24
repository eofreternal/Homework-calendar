import { Hono } from 'hono'

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from "./db/schema"

const sqlite = new Database(process.env.DB_FILE_NAME!);
const db = drizzle({ client: sqlite });

const defaultUser = await db.select().from(schema.usersTable).execute()
if (defaultUser.length == 0) {
  await db.insert(schema.usersTable).values({
    name: "Default User",
    password: await Bun.password.hash("default"),

    creationDate: Date.now()
  })
}

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default {
  port: 5000,
  fetch: app.fetch,
} 
