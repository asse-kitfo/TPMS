import { Router } from "express";
import { db, checksTable, sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitCheckBody, ListChecksQueryParams } from "@workspace/api-zod";

const router = Router();

function computeConfidenceScore(data: {
  setupGrade: string;
  psychState: string;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
}): number {
  let score = 50;
  // Clear blocking signals — high system confidence in verdict
  if (data.urgeLevel >= 8) score += 30;
  if (data.focusLevel <= 3) score += 25;
  if (data.psychState === "FEAR" || data.psychState === "OVERCONFIDENT") score += 20;
  if (data.setupGrade === "C") score += 10;
  // Clear green signals — high confidence in approving
  if (data.urgeLevel <= 2) score += 20;
  if (data.focusLevel >= 8) score += 15;
  if (data.psychState === "CALM" || data.psychState === "FOCUSED") score += 15;
  if (data.setupGrade === "A_PLUS") score += 15;
  if (data.decisionClarity >= 8) score += 10;
  if (data.decisionClarity <= 3) score += 10;
  // Mixed/ambiguous signals reduce confidence
  if (data.psychState === "URGE" || data.psychState === "PRESSURE") score -= 10;
  if (data.urgeLevel >= 4 && data.urgeLevel <= 6) score -= 15;
  if (data.focusLevel >= 4 && data.focusLevel <= 6) score -= 10;
  return Math.min(99, Math.max(42, score));
}

function computeVerdict(data: {
  setupGrade: string;
  psychState: string;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
  sessionLossCount?: number;
}): { verdict: string; verdictReason: string; confidenceScore: number } {
  const { setupGrade, psychState, focusLevel, urgeLevel, decisionClarity } = data;
  const lossCount = data.sessionLossCount ?? 0;
  const confidenceScore = computeConfidenceScore({ setupGrade, psychState, focusLevel, urgeLevel, decisionClarity });

  // ── HARD BLOCK ─────────────────────────────────────────────────────
  if (urgeLevel >= 8) {
    return { verdict: "HARD_BLOCK", confidenceScore,
      verdictReason: "Urge level is critically high. Your survival brain is in full control. No capital is safe when the amygdala is running the show. Step away now." };
  }
  if (focusLevel <= 3) {
    return { verdict: "HARD_BLOCK", confidenceScore,
      verdictReason: "Focus is critically low. You cannot execute with discipline if your attention is fragmented. Close the charts." };
  }
  if (setupGrade !== "A_PLUS") {
    return { verdict: "HARD_BLOCK", confidenceScore,
      verdictReason: "This is not an A+ setup. Your methodology requires A+ confluence only. Every non-A+ trade you take is a statistical bet against your edge." };
  }
  if (psychState === "FEAR") {
    return { verdict: "HARD_BLOCK", confidenceScore,
      verdictReason: "Fear state detected. The amygdala is scanning for threat and will distort price action interpretation. You cannot trade objectively from fear." };
  }
  if (psychState === "OVERCONFIDENT") {
    return { verdict: "HARD_BLOCK", confidenceScore,
      verdictReason: "Overconfidence detected. The ego has inflated your perceived edge. Overconfidence is the precursor to revenge trading and oversizing. Stand down." };
  }

  // ── RISK CONTEXT: 3+ losses in session → behavioral pattern detected ──
  if (lossCount >= 3) {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: `Behavioral pattern detected: ${lossCount} losses in this session. After back-to-back losses, cortisol elevation impairs decision-making even when self-reported state appears normal. The system is applying a protective block. This is not a punishment — it is data.` };
  }

  // ── REDUCE RISK ────────────────────────────────────────────────────
  if (urgeLevel >= 6) {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: "Urge to execute is elevated. The survival brain is pushing for action. Trade at 50% of normal size to limit damage if the emotional brain hijacks execution." };
  }
  if (psychState === "PRESSURE") {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: "You are under pressure — this means you NEED this trade to work, which means you won't let it work. Reduce size by 50% or do not trade." };
  }
  if (decisionClarity < 5) {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: "Decision clarity is below threshold. If you cannot articulate clearly why this is an edge, reduce size drastically." };
  }
  if (focusLevel < 6) {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: "Focus is sub-optimal. You may miss signals during the trade. Reduce size and set alerts so you do not need to monitor actively." };
  }

  // ── 2 losses = reduce risk even on green inputs ──────────────────
  if (lossCount >= 2) {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: `Two losses detected in this session. Setup qualifies, but the system is capping position size at 50% — back-to-back losses create emotional contamination that is statistically invisible to self-reporting.` };
  }

  // ── NO TRADE ───────────────────────────────────────────────────────
  if (psychState === "URGE") {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: "You reported an urge to trade. The urge IS the signal to stand aside — it means the survival brain is pushing for action, not the cortex seeing an edge. Wait until the urge passes before reassessing." };
  }
  if (urgeLevel >= 5 && decisionClarity < 8) {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: "Moderate urge combined with below-peak decision clarity. Your mind is constructing a narrative to justify trading. This trade idea is coming from the emotional brain, not the analytical brain." };
  }

  // ── TRADE APPROVED ─────────────────────────────────────────────────
  if (setupGrade === "A_PLUS" && (psychState === "CALM" || psychState === "FOCUSED")) {
    if (focusLevel >= 7 && urgeLevel <= 4 && decisionClarity >= 7) {
      return { verdict: "TRADE", confidenceScore,
        verdictReason: "All systems green. A+ setup, cortex online, urge is low and decision is clear. Execute your plan with full discipline — then leave the trade alone." };
    }
  }

  return { verdict: "TRADE", confidenceScore,
    verdictReason: "Setup meets minimum criteria. Execute your predefined plan exactly. The moment you deviate, the statistical edge is gone." };
}

router.post("/", async (req, res) => {
  const parsed = SubmitCheckBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error });
  }

  // Fetch session loss count for behavioral risk context
  let sessionLossCount = 0;
  try {
    const [session] = await db
      .select({ lossCount: sessionsTable.lossCount })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, parsed.data.sessionId));
    if (session) sessionLossCount = session.lossCount;
  } catch {
    // Non-fatal — proceed without loss context
  }

  const { verdict, verdictReason, confidenceScore } = computeVerdict({
    ...parsed.data,
    sessionLossCount,
  });

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
    confidenceScore,
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
