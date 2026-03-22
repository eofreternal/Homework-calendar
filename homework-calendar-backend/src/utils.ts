import data from "../config.json" with { type: "json" }
import { z } from "zod"

export const envSchema = z.object({
    DB_FILE_NAME: z.string(),

    MULTIPLE_ACCOUNTS: z.boolean(),
    ALLOW_LOGINS: z.boolean(),
    ALLOW_REGISTRATION: z.boolean(),
})

export type Env = z.infer<typeof envSchema>

export function parseConfig() {
    const config = envSchema.safeParse(data)
    if (config.success == false) {
        console.log(`Invalid config. Config should look like 
{
    DB_FILE_NAME: z.string(),

    MULTIPLE_ACCOUNTS: z.boolean(),
    ALLOW_LOGINS: z.boolean(),
    ALLOW_REGISTRATION: z.boolean(),
}`)
        process.exit(1)
    }

    return config.data
}