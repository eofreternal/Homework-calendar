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
import { eq, lt, gt, and, isNull, isNotNull } from "drizzle-orm"

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
            return c.json({ success: false, data: "Username in use" } as const, 404)
        }

        const hashedPassword = await Bun.password.hash(body.password)

        const [user] = await db.insert(schema.usersTable).values({
            username: body.username,
            password: hashedPassword,
            creationDate: Date.now()
        }).returning()

        session.set("id", user!.id)
        return c.json({ success: true, data: user } as const)
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

    .get("/assignment/:year/:month", zValidator("query", z.object({
        getCompletedOnly: z.string().optional()
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const year = parseInt(c.req.param("year"))
        const month = parseInt(c.req.param("month"))

        if (isNaN(year) || isNaN(month)) {
            return c.json({ success: false, data: "Why is year or month NaN?" } as const, 400)
        }

        const beginningOfMonth = new Date(year, month, 1).getTime()
        const endOfMonth = new Date(year, month + 1, 0).getTime()
        const assignments = await db.select().from(schema.assignmentsTable).where(
            and(
                and(
                    lt(schema.assignmentsTable.dueDate, endOfMonth),
                    gt(schema.assignmentsTable.dueDate, beginningOfMonth)
                ),
                eq(schema.assignmentsTable.owner, userData.id)
            )
        )

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
        const user = c.get("userData")
        const body = c.req.valid("json")

        const [assignment] = await db.insert(schema.assignmentsTable).values({
            title: body.title,
            description: body.description,
            type: body.type,
            owner: user.id,

            startDate: body.startDate,
            dueDate: body.dueDate,

            creationDate: Date.now()
        }).returning()

        return c.json({ success: true, data: assignment } as const, 201)
    })

    .patch("/assignment/:id", zValidator("json", z.object({
        title: z.string().optional(),
        description: z.string().optional(),

        startDate: z.number().optional(),
        dueDate: z.number().optional(),

        completionDate: z.number().optional().nullable()
    })), authentication, async (c) => {
        const id = parseInt(c.req.param("id"))
        const userData = c.get("userData")
        const body = c.req.valid("json")
        if (isNaN(id)) {
            return c.json({ success: false, data: "Why is 'id' NaN?" } as const, 400)
        }

        const update: Partial<typeof body> = {}
        if (body.title) {
            update["title"] = body.title
        }

        if (body.description) {
            update["description"] = body.description
        }
        if (body.startDate) {
            update["startDate"] = body.startDate
        }
        if (body.dueDate) {
            update["dueDate"] = body.dueDate
        }
        if (body.completionDate) {
            update["completionDate"] = body.completionDate
        }

        if (Object.keys(update).length == 0) {
            return c.json({ success: true, data: "Nothing changed" } as const)
        }

        const modified = await db.update(schema.assignmentsTable).set(update).where(
            and(
                eq(schema.assignmentsTable.id, id),
                eq(schema.assignmentsTable.owner, userData.id)
            )
        )

        return c.json({ success: true } as const)
    })

export default {
    port: 5000,
    fetch: app.fetch,
}
export type AppType = typeof app