
import { Hono } from 'hono'
import { authentication, zValidator, type SessionVariables } from './../middleware';
import { eq, and, desc } from "drizzle-orm"
import { db } from "../db/index"
import * as schema from "../db/schema"
import * as z from "zod"

export const classesRoutes = new Hono<{ Variables: SessionVariables }>()
    .get("/", async (c) => {
        const classes = await db.select().from(schema.classesTable)
        const classesCombinedWithNumberOfAssignments = []
        for (const cls of classes) {
            const number = await db.$count(schema.assignmentsTable, eq(schema.assignmentsTable.class, cls.id))

            classesCombinedWithNumberOfAssignments.push({
                ...cls,
                numberOfAssignments: number
            })
        }

        return c.json({
            success: true, data: classesCombinedWithNumberOfAssignments
        } as const, 200)
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
        }).returning()

        return c.json({
            success: true, data: {
                ...data!,
                numberOfAssignments: 0
            }
        } as const, 200)
    })

    .get("/:id", zValidator("query", z.object({
        page: z.coerce.number()
    })), async (c) => {
        const queryParams = c.req.valid("query")
        const id = parseInt(c.req.param('id'))
        if (isNaN(id)) {
            return c.json({ success: false, data: "ID must be a number" } as const)
        }

        const [fetchedClass] = await db.select().from(schema.classesTable).where(eq(schema.classesTable.id, id))
        if (fetchedClass == undefined) {
            return c.json({
                success: false, data: `No class exists under the id ${id}`
            } as const, 200)
        }
        const assignments = await db.select().from(schema.assignmentsTable).where(eq(schema.assignmentsTable.class, id)).orderBy(desc(schema.assignmentsTable.dueDate)).offset((queryParams.page - 1) * 10).limit(10)
        const numberOfAssignments = await db.$count(schema.assignmentsTable, eq(schema.assignmentsTable.class, id))

        return c.json({
            success: true as const,
            data: {
                ...fetchedClass,
                assignments: assignments,
                numberOfAssignments: numberOfAssignments
            }
        }, 200)
    })

    .patch("/:id", zValidator("json", z.object({
        name: z.string().optional(),

        archiveDate: z.number().nullable().optional(),
    })), authentication, async (c) => {
        const userData = c.get("userData")
        const body = c.req.valid("json")
        const id = parseInt(c.req.param('id'))
        if (isNaN(id)) {
            return c.json({ success: true, data: "ID must be a number" } as const)
        }

        const [updatedClass] = await db.update(schema.classesTable).set(body).where(and(
            eq(schema.classesTable.owner, userData.id),
            eq(schema.classesTable.id, id)
        )).returning()

        if (updatedClass === undefined) {
            return c.json({ success: false, data: "Class not found or it doesn't belong to you" })
        }

        return c.json({ success: true, data: updatedClass } as const)
    })

    .delete("/:id", authentication, async (c) => {
        const userData = c.get("userData")
        const id = parseInt(c.req.param('id'))
        if (isNaN(id)) {
            return c.json({ success: true, data: "ID must be a number" } as const)
        }

        const [deletedClass] = await db.delete(schema.classesTable).where(and(
            eq(schema.classesTable.owner, userData.id),
            eq(schema.classesTable.id, id)
        )).returning()

        if (deletedClass === undefined) {
            return c.json({ success: false, data: "Class not found or it doesn't belong to you" })
        }

        return c.json({ success: true, data: deletedClass } as const)
    })