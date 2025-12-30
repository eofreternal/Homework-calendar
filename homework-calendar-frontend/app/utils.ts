import { hc } from 'hono/client'
import type { AppType } from "../../homework-calendar-backend/src/index.ts"

export const client = hc<AppType>('http://localhost:5000/', {
    init: {
        credentials: 'include',
    },
})

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const