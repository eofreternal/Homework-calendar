
import { Hono } from 'hono'
import { authentication, zValidator, type SessionVariables } from './../middleware';
import { eq, and, isNull } from "drizzle-orm"
import { db } from "../db/index"
import * as schema from "../db/schema"
import * as z from "zod"

export const classesRoutes = new Hono<{ Variables: SessionVariables }>()
    .get("/", async (c) => {
        const classes = await db.select({ id: schema.classesTable.id, name: schema.classesTable.name }).from(schema.classesTable)
            .where(isNull(schema.classesTable.archiveDate))
        return c.json({ success: true, data: classes } as const, 200)
    })

    .post("/", zValidator("json", z.object({
        name: z.string(),
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const body = c.req.valid("json")

        const [data] = await db.insert(schema.classesTable).values({
            name: body.name,
            owner: userData.id,

            creationDate: Date.now()
        }).returning({ id: schema.classesTable.id, name: schema.classesTable.name })

        return c.json({ success: true, data: data! } as const, 200)
    })

    .patch("/:id", zValidator("query", z.object({
        id: z.number()
    })), zValidator("json", z.object({
        name: z.string().optional(),

        archiveDate: z.number().optional(),
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const body = c.req.valid("json")
        const url = c.req.valid("query")

        const [updatedClass] = await db.update(schema.classesTable).set(body).where(and(
            eq(schema.usersTable.id, userData.id),
            eq(schema.classesTable.id, url.id)
        )).returning()

        return c.json({ success: true, data: updatedClass } as const)
    })

    .delete("/:id", zValidator("query", z.object({
        id: z.number()
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const url = c.req.valid("query")

        const [deletedClass] = await db.delete(schema.classesTable).where(and(
            eq(schema.usersTable.id, userData.id),
            eq(schema.classesTable.id, url.id)
        )).returning()

        return c.json({ success: true, data: deletedClass } as const)
    })