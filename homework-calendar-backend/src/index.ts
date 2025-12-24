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
  .use(logger())
  .use('*', cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "https://unejective-donnette-linguistically.ngrok-free.dev"],
    credentials: true
  }))
  .use('*', sessionMiddleware({
    store,
    //TODO: add a proper password
    encryptionKey: 'password_at_least_32_characters_long', // Required for CookieStore, recommended for others
    expireAfterSeconds: 60 * 60 * 14, // Expire session after 14 days
    cookieOptions: {
      sameSite: 'None', // Recommended for basic CSRF protection in modern browsers
      path: '/', // Required for this library to work properly
      httpOnly: true, // Recommended to avoid XSS attacks,
      secure: true
    },
  }))

  .get('/', (c) => {
    return c.text('Hello Hono!')
  })
  .get("/assignment/", async (c) => {
    //TODO: return the assignments due in the next week
  })
  .post("/assignment", zValidator("json", z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(["assignment", "test/quiz"]),

    startDate: z.number(),
    dueDate: z.number()
  })), authentication, async (c) => {
    const user = await c.get("userData")
    const body = await c.req.valid("json")

    const assignment = await db.insert(schema.assignmentsTable).values({
      name: body.name,
      description: body.description,
      type: body.type,
      owner: user.id,

      startDate: body.startDate,
      dueDate: body.dueDate,

      creationDate: Date.now()
    }).returning()

    c.json({ success: true, data: assignment[0] }, 201)
  })

export default {
  port: 5000,
  fetch: app.fetch,
} 
