import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const setupPlansTable = pgTable("setup_plans", {
  id: serial("id").primaryKey(),
  asset: text("asset").notNull(),
  direction: text("direction").notNull(), // LONG | SHORT | NEUTRAL
  entryZone: text("entry_zone").notNull(),
  stopLoss: text("stop_loss").notNull(),
  takeProfit: text("take_profit").notNull(),
  setupGrade: text("setup_grade").notNull().default("A_PLUS"),
  thesis: text("thesis").notNull(),
  invalidationCondition: text("invalidation_condition").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertSetupPlanSchema = createInsertSchema(setupPlansTable).omit({ id: true, createdAt: true });
export type InsertSetupPlan = z.infer<typeof insertSetupPlanSchema>;
export type SetupPlan = typeof setupPlansTable.$inferSelect;
