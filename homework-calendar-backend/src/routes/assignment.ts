import { Hono } from 'hono'
import { authentication, zValidator, type SessionVariables } from './../middleware';
import { eq, lt, gt, and, isNull } from "drizzle-orm"
import { db } from "../db/index"
import * as schema from "../db/schema"
import * as z from "zod"

export const assignmentRoutes = new Hono<{ Variables: SessionVariables }>()
    .get("/classes", async (c) => {
        const classes = await db.select({ id: schema.classesTable.id, name: schema.classesTable.name }).from(schema.classesTable)
            .where(isNull(schema.classesTable.archiveDate))
        return c.json({ success: true, data: classes } as const, 200)
    })
    .post("/classes", zValidator("json", z.object({
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

    .get("/:year/:month", zValidator("query", z.object({
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
    .post("/", zValidator("json", z.object({
        title: z.string(),
        description: z.string().optional(),
        type: z.enum(["assignment", "test/quiz"]),
        class: z.number().optional(),
        estimatedCompletionMinutes: z.number(),

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
            class: body.class,
            estimatedCompletionMinutes: body.estimatedCompletionMinutes,

            startDate: body.startDate,
            dueDate: body.dueDate,

            creationDate: Date.now()
        }).returning()

        return c.json({ success: true, data: assignment! } as const, 201)
    })

    .patch("/:id", zValidator("json", z.object({
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