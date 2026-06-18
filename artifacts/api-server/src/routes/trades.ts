import { Router } from "express";
import { db, tradesTable, sessionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateTradeBody,
  GetTradeParams,
  UpdateTradeParams,
  UpdateTradeBody,
  DeleteTradeParams,
} from "@workspace/api-zod";

const router = Router();

const serializeTrade = (t: typeof tradesTable.$inferSelect) => ({
  ...t,
  createdAt: t.createdAt.toISOString(),
  closedAt: t.closedAt ? t.closedAt.toISOString() : null,
});

router.get("/", async (_req, res) => {
  const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt));
  return res.json(trades.map(serializeTrade));
});

router.post("/", async (req, res) => {
  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [trade] = await db
    .insert(tradesTable)
    .values({
      sessionId: parsed.data.sessionId,
      pair: parsed.data.pair,
      setupGrade: parsed.data.setupGrade,
      direction: parsed.data.direction,
      entryPrice: parsed.data.entryPrice ?? null,
      stopLoss: parsed.data.stopLoss ?? null,
      takeProfit: parsed.data.takeProfit ?? null,
    })
    .returning();

  return res.status(201).json(serializeTrade(trade));
});

router.get("/:id", async (req, res) => {
  const params = GetTradeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [trade] = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.id, params.data.id));

  if (!trade) return res.status(404).json({ error: "Trade not found" });
  return res.json(serializeTrade(trade));
});

router.patch("/:id", async (req, res) => {
  const params = UpdateTradeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateTradeBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  // Get existing trade before update (to detect state changes, avoid double-counting)
  const [existing] = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.id, params.data.id));

  if (!existing) return res.status(404).json({ error: "Trade not found" });

  const updates: Record<string, unknown> = {};
  if (body.data.outcome !== undefined) updates.outcome = body.data.outcome;
  if (body.data.followedPlan !== undefined) updates.followedPlan = body.data.followedPlan;
  if (body.data.interfered !== undefined) updates.interfered = body.data.interfered;
  if (body.data.interferenceType !== undefined) updates.interferenceType = body.data.interferenceType;
  if (body.data.emotionalState !== undefined) updates.emotionalState = body.data.emotionalState;
  if (body.data.notes !== undefined) updates.notes = body.data.notes;
  if (body.data.closedAt !== undefined) updates.closedAt = new Date(body.data.closedAt);

  const [updated] = await db
    .update(tradesTable)
    .set(updates)
    .where(eq(tradesTable.id, params.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Trade not found" });

  // Auto-track session stats — only count NEW transitions to avoid double-counting
  const isNewLoss = body.data.outcome === "LOSS" && existing.outcome !== "LOSS";
  const isNewRuleBreak = body.data.followedPlan === false && existing.followedPlan !== false;

  if (isNewLoss || isNewRuleBreak) {
    const sessionIncrements: Record<string, unknown> = {};
    if (isNewLoss) sessionIncrements.lossCount = sql`loss_count + 1`;
    if (isNewRuleBreak) sessionIncrements.ruleBreaks = sql`rule_breaks + 1`;
    await db
      .update(sessionsTable)
      .set(sessionIncrements)
      .where(eq(sessionsTable.id, existing.sessionId));
  }

  return res.json(serializeTrade(updated));
});

router.delete("/:id", async (req, res) => {
  const params = DeleteTradeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(tradesTable).where(eq(tradesTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
