import { Hono } from 'hono'
import {
  sessionMiddleware,
  CookieStore
} from "hono-sessions"
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import * as schema from "./db/schema"
import * as z from "zod"
import { authentication, zValidator } from './middleware';

import { db } from "./db/index"

const store = new CookieStore()

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
