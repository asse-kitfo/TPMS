import { Router } from "express";
import { db, checksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitCheckBody, ListChecksQueryParams } from "@workspace/api-zod";

const router = Router();

function computeVerdict(data: {
  setupGrade: string;
  psychState: string;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
}): { verdict: string; verdictReason: string } {
  const { setupGrade, psychState, focusLevel, urgeLevel, decisionClarity } = data;

  // Hard block conditions
  if (urgeLevel >= 8) {
    return { verdict: "HARD_BLOCK", verdictReason: "Urge level is critically high. Your brain is in survival mode. No trading allowed." };
  }
  if (focusLevel <= 3) {
    return { verdict: "HARD_BLOCK", verdictReason: "Focus is too low to execute safely. Step away from the charts." };
  }
  if (setupGrade !== "A_PLUS") {
    return { verdict: "HARD_BLOCK", verdictReason: "Not an A+ setup. Your rules require A+ only. This is not a trade." };
  }
  if (psychState === "FEAR" || psychState === "OVERCONFIDENT") {
    return { verdict: "HARD_BLOCK", verdictReason: `Detected ${psychState} state. Emotional hijack in progress — trading is blocked.` };
  }

  // Reduce risk conditions
  if (urgeLevel >= 6) {
    return { verdict: "REDUCE_RISK", verdictReason: "Urge is elevated. Trade with reduced position size to limit emotional exposure." };
  }
  if (psychState === "PRESSURE") {
    return { verdict: "REDUCE_RISK", verdictReason: "You are under pressure. Cut position size by 50% and follow your plan strictly." };
  }
  if (decisionClarity < 5) {
    return { verdict: "REDUCE_RISK", verdictReason: "Decision clarity is low. Reduce risk and only enter if you can clearly articulate the setup." };
  }
  if (focusLevel < 6) {
    return { verdict: "REDUCE_RISK", verdictReason: "Focus is below optimal. Reduce size and ensure you can monitor the trade." };
  }

  // Trade approved
  if (setupGrade === "A_PLUS" && psychState === "CALM" || psychState === "FOCUSED") {
    if (focusLevel >= 7 && urgeLevel <= 4 && decisionClarity >= 7) {
      return { verdict: "TRADE", verdictReason: "A+ setup with a calm, focused state and strong decision clarity. Execute your plan." };
    }
  }

  return { verdict: "TRADE", verdictReason: "Setup meets criteria. Follow your predefined plan with discipline." };
}

router.post("/", async (req, res) => {
  const parsed = SubmitCheckBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error });
  }

  const { verdict, verdictReason } = computeVerdict(parsed.data);

  const [check] = await db
    .insert(checksTable)
    .values({
      sessionId: parsed.data.sessionId,
      pair: parsed.data.pair,
      setupGrade: parsed.data.setupGrade,
      psychState: parsed.data.psychState,
      focusLevel: parsed.data.focusLevel,
      urgeLevel: parsed.data.urgeLevel,
      decisionClarity: parsed.data.decisionClarity,
      patience: parsed.data.patience ?? null,
      verdict,
      verdictReason,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return res.status(201).json({
    ...check,
    createdAt: check.createdAt.toISOString(),
  });
});

router.get("/", async (req, res) => {
  const params = ListChecksQueryParams.safeParse(req.query);

  let query = db.select().from(checksTable).orderBy(desc(checksTable.createdAt)).$dynamic();

  if (params.success && params.data.sessionId !== undefined) {
    query = query.where(eq(checksTable.sessionId, params.data.sessionId));
  }

  const checks = await query;
  return res.json(checks.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

export default router;
