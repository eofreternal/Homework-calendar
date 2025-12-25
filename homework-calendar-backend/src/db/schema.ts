import { int, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from 'drizzle-orm';

export const usersTable = sqliteTable("users", {
    id: int().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    password: text().notNull(),

    creationDate: integer({ mode: "number" }).notNull()
});

export const assignmentsTable = sqliteTable("assignments", {
    id: int().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    description: text().notNull(),
    type: text({ enum: ["assignment", "test/quiz"] }).notNull(),
    owner: int(),

    startDate: integer({ mode: "number" }).notNull(),
    dueDate: integer({ mode: "number" }).notNull(),

    completedDate: integer({ mode: "number" }),
    creationDate: integer({ mode: "number" }).notNull()
})

export const assignmentsRelations = relations(assignmentsTable, ({ one }) => ({
    owner: one(usersTable, {
        fields: [assignmentsTable.owner],
        references: [usersTable.id],
    }),
}));