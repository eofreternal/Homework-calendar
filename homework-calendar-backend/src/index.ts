import { Hono } from 'hono'
import {
    sessionMiddleware,
    CookieStore
} from "hono-sessions"
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import * as schema from "./db/schema"
import * as z from "zod"
import { authentication, zValidator, type SessionVariables } from './middleware';

import { db } from "./db/index"
import { eq, lt, and, isNull } from "drizzle-orm"

const store = new CookieStore()

const defaultUser = await db.select().from(schema.usersTable).execute()
if (defaultUser.length == 0) {
    await db.insert(schema.usersTable).values({
        username: "Default User",
        password: await Bun.password.hash("default"),

        creationDate: Date.now()
    })
}

const app = new Hono<{ Variables: SessionVariables }>()
    .use(logger())
    .use('*', cors({
        origin: ["http://localhost:3000"],
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
    .post("/auth/register", zValidator("json", z.object({
        username: z.string(),
        password: z.string()
    })), async (c) => {
        const body = await c.req.valid("json")
        const session = c.get("session")

        const [usernameInUse] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.username, body.username))
        if (usernameInUse !== undefined) {
            return c.json({ success: false, data: "Username in use" }, 404)
        }

        const hashedPassword = await Bun.password.hash(body.password)

        const [user] = await db.insert(schema.usersTable).values({
            username: body.username,
            password: hashedPassword,
            creationDate: Date.now()
        }).returning()

        session.set("id", user!.id)
        return c.json({ success: true, data: user })
    })

    .post("/auth/login", zValidator("json", z.object({
        username: z.string(),
        password: z.string()
    })), async (c) => {
        const body = await c.req.valid("json")
        const session = c.get("session")

        const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.username, body.username))
        if (user == undefined) {
            return c.json({ success: false, data: "User not found" } as const, 404)
        }

        const validPassword = await Bun.password.verify(body.password, user.password)
        if (validPassword == false) {
            return c.json({ success: false, data: "User not found" } as const, 404)
        }

        session.set("id", user.id)
        return c.json({
            success: true,
            data: {
                username: user.username,
            }
        } as const)
    })

    .get("/assignment", authentication, async (c) => {
        const userData = c.get("userData")

        const oneWeekInTheFuture = Date.now() + (7 * 24 * 60 * 60)
        const assignments = await db.select().from(schema.assignmentsTable).where(and(and(lt(schema.assignmentsTable.dueDate, oneWeekInTheFuture), isNull(schema.assignmentsTable.completedDate)), eq(schema.usersTable.id, userData.id)))

        return c.json({
            success: true,
            data: assignments
        } as const)
    })
    .post("/assignment", zValidator("json", z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(["assignment", "test/quiz"]),

        startDate: z.number(),
        dueDate: z.number()
    })), authentication, async (c) => {
        const user = await c.get("userData")
        const body = await c.req.valid("json")

        const assignment = await db.insert(schema.assignmentsTable).values({
            title: body.title,
            description: body.description,
            type: body.type,
            owner: user.id,

            startDate: body.startDate,
            dueDate: body.dueDate,

            creationDate: Date.now()
        }).returning()

        return c.json({ success: true, data: assignment[0] }, 201)
    })

export default {
    port: 5000,
    fetch: app.fetch,
}
export type AppType = typeof app