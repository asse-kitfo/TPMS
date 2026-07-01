import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, desc, isNull } from "drizzle-orm";
import {
  StartSessionBody,
  UpdateSessionParams,
  UpdateSessionBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/current", async (req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(isNull(sessionsTable.endedAt))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(1);

  if (sessions.length === 0) {
    return res.status(200).json(null);
  }

  const s = sessions[0];
  return res.json({
    ...s,
    createdAt: s.createdAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
  });
});

router.get("/", async (_req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));

  return res.json(
    sessions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      mode: "ANALYSIS",
      lossCount: 0,
      ruleBreaks: 0,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return res.status(201).json({
    ...session,
    createdAt: session.createdAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  });
});

router.patch("/:id", async (req, res) => {
  const params = UpdateSessionParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateSessionBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  const updates: Record<string, unknown> = {};
  if (body.data.mode !== undefined) updates.mode = body.data.mode;
  if (body.data.lossCount !== undefined) updates.lossCount = body.data.lossCount;
  if (body.data.ruleBreaks !== undefined) updates.ruleBreaks = body.data.ruleBreaks;
  if (body.data.notes !== undefined) updates.notes = body.data.notes;
  if (body.data.endedAt !== undefined) updates.endedAt = new Date(body.data.endedAt);

  const [updated] = await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Session not found" });

  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    endedAt: updated.endedAt ? updated.endedAt.toISOString() : null,
  });
});

export default router;
