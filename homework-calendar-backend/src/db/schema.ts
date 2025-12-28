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
    class: int(),
    owner: int().notNull(),

    startDate: integer({ mode: "number" }).notNull(),
    dueDate: integer({ mode: "number" }).notNull(),
    estimatedCompletionMinutes: int().notNull(),

    completionDate: integer({ mode: "number" }),
    creationDate: integer({ mode: "number" }).notNull()
})

export const assignmentsRelations = relations(assignmentsTable, ({ one }) => ({
    ownerInfo: one(usersTable, {
        fields: [assignmentsTable.owner],
        references: [usersTable.id],
    }),
    classInfo: one(classesTable, {
        fields: [assignmentsTable.class],
        references: [classesTable.id],
    }),
}));

export const classesTable = sqliteTable("class", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    owner: int().notNull(),

    archiveDate: integer({ mode: "number" }),
    creationDate: integer({ mode: "number" }).notNull()
});