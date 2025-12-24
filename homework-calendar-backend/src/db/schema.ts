import { int, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    password: text().notNull(),

    creationDate: integer({ mode: "number" }).notNull()
});

export const assignmentsTable = sqliteTable("assignments", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    description: text().notNull(),
    type: text({ enum: ["assignment", "test/quiz"] }).notNull(),

    startDate: integer({ mode: "number" }).notNull(),
    dueDate: integer({ mode: "number" }).notNull(),

    creationDate: integer({ mode: "number" }).notNull()
})