import type { ValidationTargets } from 'hono';
import { zValidator as baseZodValidator } from '@hono/zod-validator';
import { createMiddleware } from 'hono/factory'
import {
    Session,
} from "hono-sessions"
import { eq, type InferSelectModel } from "drizzle-orm"
import * as schema from "./db/schema"
import { db } from "./db/index"

import type * as v4 from 'zod/v4/core'
type ZodSchema = v4.$ZodType

/**
 * Creates a Hono middleware that validates request data against a Zod schema.
 * On validation failure, it returns a JSON response with a standardized error format:
 * { success: false, message: "path: error_message" }
 * Only the first validation error is reported.
 *
 * @param target The validation target (e.g., 'json', 'query', 'form', 'param').
 * @param schema The Zod schema to validate against.
 * @returns Hono middleware handler.
 */
export const zValidator = <
    T extends ZodSchema,
    Target extends keyof ValidationTargets
>(
    target: Target,
    schema: T
) => {
    return baseZodValidator(target, schema, (result, c) => {
        if (!result.success) {
            const firstIssue = result.error.issues[0];
            let formattedMessage;

            if (firstIssue) {
                // Join the path array into a string (e.g., ['user', 'address', 'street'] -> 'user.address.street')
                const pathString = firstIssue.path.join('.');
                if (pathString) {
                    formattedMessage = `${pathString}: ${firstIssue.message}`;
                } else {
                    formattedMessage = firstIssue.message;
                }
            }

            return c.json({ success: false, data: formattedMessage } as const, 400);
        }
    });
};

export interface AuthVariables {
    userData: InferSelectModel<typeof schema.usersTable>
}

// This stuff is just for the session
export interface SessionVariables {
    session: Session<{ id: number }>,
    session_key_rotation: boolean
}

export const authentication = createMiddleware<{ Variables: AuthVariables & SessionVariables }>(async (c, next) => {
    const session = c.get("session")
    const id = session.get("id")

    if (id == null) {
        return c.json({ success: false, data: "You must be logged in to perform this action" } as const, 401)
    }

    const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, id))
    if (user == undefined) {
        return c.json({ success: false, data: "Account doesn't exist. Wait, what?" } as const, 401)
    }

    c.set("userData", user)

    await next()
})