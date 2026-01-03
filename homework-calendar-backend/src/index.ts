import { Hono } from 'hono'
import {
    sessionMiddleware,
    CookieStore
} from "hono-sessions"
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import * as schema from "./db/schema"
import { type SessionVariables } from './middleware';

import { db } from "./db/index"

import { assignmentRoutes } from './routes/assignment'
import { authRoutes } from './routes/auth'

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
        encryptionKey: 'zo5afLDEw@OvikeCRUDu-rUpr88h+4hl', // Required for CookieStore, recommended for others
        expireAfterSeconds: 60 * 60 * 14, // Expire session after 14 days
        cookieOptions: {
            sameSite: 'None', // Recommended for basic CSRF protection in modern browsers
            path: '/', // Required for this library to work properly
            httpOnly: true, // Recommended to avoid XSS attacks,
            secure: true
        },
    }))
    .route("/auth", authRoutes)
    .route("/assignment", assignmentRoutes)

export default {
    port: 5000,
    fetch: app.fetch,
}
export type AppType = typeof app