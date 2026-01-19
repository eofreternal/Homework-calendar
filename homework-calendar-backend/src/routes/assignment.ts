import { Hono } from 'hono'
import { authentication, zValidator, type SessionVariables } from './../middleware';
import { eq, lt, gt, and, isNull, isNotNull, desc } from "drizzle-orm"
import { db } from "../db/index"
import * as schema from "../db/schema"
import * as z from "zod"

export const assignmentRoutes = new Hono<{ Variables: SessionVariables }>()
    .get("/", zValidator("query", z.object({
        startDate: z.string().optional(),
        endDate: z.string()
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const startDate = c.req.query("startDate")
        const endDate = c.req.query("endDate")

        if (endDate === undefined) {
            return c.json({ success: false, data: "`endDate` is a required query param" } as const, 400)
        }

        const start = isNaN(Date.parse(startDate!)) ? Date.parse("1-1-1970") : Date.parse(startDate!)
        const end = Date.parse(endDate)
        const uncompletedAssignments = await db.select().from(schema.assignmentsTable).where(
            and(
                and(
                    and(
                        gt(schema.assignmentsTable.dueDate, start),
                        lt(schema.assignmentsTable.dueDate, end),
                    ),
                    isNull(schema.assignmentsTable.completionDate)
                ),
                eq(schema.assignmentsTable.owner, userData.id),
            )
        )

        const currentMonthStart = Date.parse(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString())
        const assignmentsInCurrentMonth = await db.select().from(schema.assignmentsTable).where(
            and(
                and(
                    and(
                        gt(schema.assignmentsTable.dueDate, currentMonthStart),
                        lt(schema.assignmentsTable.dueDate, end),
                    ),
                    isNotNull(schema.assignmentsTable.completionDate)
                ),
                eq(schema.assignmentsTable.owner, userData.id),
            )
        ).orderBy(desc(schema.assignmentsTable.completionDate));

        return c.json({
            success: true,
            data: [...uncompletedAssignments, ...assignmentsInCurrentMonth]
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
        // allows for null so that projects can be marked as uncompleted if it was previously marked as completed
        if (body.completionDate !== undefined) {
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