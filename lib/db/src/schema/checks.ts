import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const checksTable = pgTable("checks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  pair: text("pair").notNull(),
  setupGrade: text("setup_grade").notNull(),
  psychState: text("psych_state").notNull(),
  focusLevel: integer("focus_level").notNull(),
  urgeLevel: integer("urge_level").notNull(),
  decisionClarity: integer("decision_clarity").notNull(),
  patience: integer("patience"),
  verdict: text("verdict").notNull(),
  verdictReason: text("verdict_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCheckSchema = createInsertSchema(checksTable).omit({ id: true, createdAt: true });
export type InsertCheck = z.infer<typeof insertCheckSchema>;
export type Check = typeof checksTable.$inferSelect;
