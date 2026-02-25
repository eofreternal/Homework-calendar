import { Hono } from 'hono'
import { authentication, zValidator, type SessionVariables } from './../middleware';
import * as schema from "../db/schema"
import { eq } from "drizzle-orm"
import { db } from "../db/index"
import * as z from "zod"

export const authRoutes = new Hono<{ Variables: SessionVariables }>()
    .get("/valid", authentication, async (c) => {
        const userData = c.get("userData")

        return c.json({
            success: true, data: userData
        } as const, 200)
    })

    .post("/register", zValidator("json", z.object({
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
        return c.json({ success: true, data: user! } as const)
    })

    .post("/login", zValidator("json", z.object({
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

    .get("/logout", authentication, (c) => {
        const session = c.get("session")
        session.forget("id")
        return c.redirect("/")
    })