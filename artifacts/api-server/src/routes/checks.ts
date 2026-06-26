import { Router } from "express";
import { db, checksTable, sessionsTable, setupPlansTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitCheckBodyWithPlanMatch, ListChecksQueryParams } from "@workspace/api-zod";

const router = Router();

function computeConfidenceScore(data: {
  setupGrade: string;
  psychState: string;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
}): number {
  let score = 50;
  if (data.urgeLevel >= 8) score += 30;
  if (data.focusLevel <= 3) score += 25;
  if (data.psychState === "FEAR" || data.psychState === "OVERCONFIDENT") score += 20;
  if (data.setupGrade === "C") score += 10;
  if (data.urgeLevel <= 2) score += 20;
  if (data.focusLevel >= 8) score += 15;
  if (data.psychState === "CALM" || data.psychState === "FOCUSED") score += 15;
  if (data.setupGrade === "A_PLUS") score += 15;
  if (data.decisionClarity >= 8) score += 10;
  if (data.decisionClarity <= 3) score += 10;
  if (data.psychState === "URGE" || data.psychState === "PRESSURE") score -= 10;
  if (data.urgeLevel >= 4 && data.urgeLevel <= 6) score -= 15;
  if (data.focusLevel >= 4 && data.focusLevel <= 6) score -= 10;
  return Math.min(99, Math.max(42, score));
}

function downgradeVerdict(verdict: string): string {
  if (verdict === "TRADE") return "REDUCE_RISK";
  if (verdict === "REDUCE_RISK") return "NO_TRADE";
  return verdict;
}

function computeVerdict(data: {
  setupGrade: string;
  psychState: string;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
  sessionLossCount?: number;
  submissionDurationMs?: number;
  baselineAvgFocus?: number;
  baselineAvgUrge?: number;
  baselineAvgClarity?: number;
  hasBaseline?: boolean;
}): { verdict: string; verdictReason: string; confidenceScore: number } {
  const { setupGrade, psychState, focusLevel, urgeLevel, decisionClarity } = data;
  const lossCount = data.sessionLossCount ?? 0;
  const confidenceScore = computeConfidenceScore({ setupGrade, psychState, focusLevel, urgeLevel, decisionClarity });

  const flags: string[] = [];

  // ── Speed-to-Submit detection ──────────────────────────────────────────────
  const isRush = typeof data.submissionDurationMs === "number" && data.submissionDurationMs < 4000;
  if (isRush) {
    flags.push("Speed-to-submit alert: form completed in under 4 seconds. Rapid submission indicates the analytical checklist was not genuinely engaged — only the emotional brain moves this fast.");
  }

  // ── Baseline Delta incongruence detection ──────────────────────────────────
  let baselineMismatch = false;
  if (data.hasBaseline && data.baselineAvgFocus !== undefined && data.baselineAvgClarity !== undefined) {
    const focusDelta = focusLevel - data.baselineAvgFocus;
    const clarityDelta = decisionClarity - data.baselineAvgClarity;
    if (focusDelta > 2.5 && clarityDelta > 2.5 && lossCount >= 1) {
      baselineMismatch = true;
      flags.push(
        `Baseline incongruence: your reported focus (${focusLevel}) and clarity (${decisionClarity}) are significantly above your historical average (focus avg: ${data.baselineAvgFocus.toFixed(1)}, clarity avg: ${data.baselineAvgClarity.toFixed(1)}). After losses, inflated self-reporting is a documented bias. The system is adjusting accordingly.`
      );
    }
  }

  // ── HARD BLOCK ─────────────────────────────────────────────────────────────
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

  // ── RISK CONTEXT: 3+ losses ────────────────────────────────────────────────
  if (lossCount >= 3) {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: `Behavioral pattern detected: ${lossCount} losses in this session. After back-to-back losses, cortisol elevation impairs decision-making even when self-reported state appears normal. The system is applying a protective block. This is not a punishment — it is data.` };
  }

  // ── REDUCE RISK ────────────────────────────────────────────────────────────
  if (urgeLevel >= 6) {
    const reason = "Urge to execute is elevated. The survival brain is pushing for action. Trade at 50% of normal size to limit damage if the emotional brain hijacks execution.";
    return { verdict: "REDUCE_RISK", confidenceScore, verdictReason: flags.length ? `${flags.join(" ")} — ${reason}` : reason };
  }
  if (psychState === "PRESSURE") {
    const reason = "You are under pressure — this means you NEED this trade to work, which means you won't let it work. Reduce size by 50% or do not trade.";
    return { verdict: "REDUCE_RISK", confidenceScore, verdictReason: flags.length ? `${flags.join(" ")} — ${reason}` : reason };
  }
  if (decisionClarity < 5) {
    const reason = "Decision clarity is below threshold. If you cannot articulate clearly why this is an edge, reduce size drastically.";
    return { verdict: "REDUCE_RISK", confidenceScore, verdictReason: flags.length ? `${flags.join(" ")} — ${reason}` : reason };
  }
  if (focusLevel < 6) {
    const reason = "Focus is sub-optimal. You may miss signals during the trade. Reduce size and set alerts so you do not need to monitor actively.";
    return { verdict: "REDUCE_RISK", confidenceScore, verdictReason: flags.length ? `${flags.join(" ")} — ${reason}` : reason };
  }
  if (lossCount >= 2) {
    return { verdict: "REDUCE_RISK", confidenceScore,
      verdictReason: `Two losses detected in this session. Setup qualifies, but the system is capping position size at 50% — back-to-back losses create emotional contamination that is statistically invisible to self-reporting.` };
  }

  // ── NO TRADE ───────────────────────────────────────────────────────────────
  if (psychState === "URGE") {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: "You reported an urge to trade. The urge IS the signal to stand aside — it means the survival brain is pushing for action, not the cortex seeing an edge. Wait until the urge passes before reassessing." };
  }
  if (urgeLevel >= 5 && decisionClarity < 8) {
    return { verdict: "NO_TRADE", confidenceScore,
      verdictReason: "Moderate urge combined with below-peak decision clarity. Your mind is constructing a narrative to justify trading. This trade idea is coming from the emotional brain, not the analytical brain." };
  }

  // ── TRADE APPROVED — apply speed/baseline downgrades if flagged ────────────
  let baseVerdict = "TRADE";
  let baseReason = setupGrade === "A_PLUS" && (psychState === "CALM" || psychState === "FOCUSED") && focusLevel >= 7 && urgeLevel <= 4 && decisionClarity >= 7
    ? "All systems green. A+ setup, cortex online, urge is low and decision is clear. Execute your plan with full discipline — then leave the trade alone."
    : "Setup meets minimum criteria. Execute your predefined plan exactly. The moment you deviate, the statistical edge is gone.";

  if (isRush) baseVerdict = downgradeVerdict(baseVerdict);
  if (baselineMismatch) baseVerdict = downgradeVerdict(baseVerdict);

  const allReasons = flags.length ? `${flags.join(" ")} — ${baseReason}` : baseReason;
  return { verdict: baseVerdict, confidenceScore, verdictReason: allReasons };
}

router.post("/", async (req, res) => {
  const parsed = SubmitCheckBodyWithPlanMatch.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error });
  }

  let sessionLossCount = 0;
  try {
    const [session] = await db
      .select({ lossCount: sessionsTable.lossCount })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, parsed.data.sessionId));
    if (session) sessionLossCount = session.lossCount;
  } catch {
    // Non-fatal
  }

  // Fetch historical baseline for incongruence detection
  let baselineAvgFocus: number | undefined;
  let baselineAvgUrge: number | undefined;
  let baselineAvgClarity: number | undefined;
  let hasBaseline = false;
  try {
    const recent = await db
      .select({ focusLevel: checksTable.focusLevel, urgeLevel: checksTable.urgeLevel, decisionClarity: checksTable.decisionClarity })
      .from(checksTable)
      .orderBy(desc(checksTable.createdAt))
      .limit(15);
    if (recent.length >= 5) {
      baselineAvgFocus = recent.reduce((s, c) => s + c.focusLevel, 0) / recent.length;
      baselineAvgUrge = recent.reduce((s, c) => s + c.urgeLevel, 0) / recent.length;
      baselineAvgClarity = recent.reduce((s, c) => s + c.decisionClarity, 0) / recent.length;
      hasBaseline = true;
    }
  } catch {
    // Non-fatal
  }

  // ── Plan-match signal (server enforces invariants; client values are validated here) ─
  let rawStatus = parsed.data.planMatchStatus ?? "NO_PLAN";
  let planId = parsed.data.planId ?? null;
  let planFlags: string[] = [];
  let planForcedDowngrade: "REDUCE_RISK" | "NO_TRADE" | null = null;

  // Enforce: MATCHED requires a valid, non-expired planId; coerce anything else to NO_PLAN
  if (rawStatus === "MATCHED") {
    if (!planId) {
      rawStatus = "NO_PLAN"; // No planId supplied with MATCHED — treat as unplanned
    } else {
      try {
        const [matchedPlan] = await db
          .select({ createdAt: setupPlansTable.createdAt, expiresAt: setupPlansTable.expiresAt })
          .from(setupPlansTable)
          .where(eq(setupPlansTable.id, planId));

        if (!matchedPlan) {
          rawStatus = "NO_PLAN"; // Plan not found — coerce
          planId = null;
        } else if (matchedPlan.expiresAt < new Date()) {
          rawStatus = "NO_PLAN"; // Plan is expired — coerce
          planId = null;
          planFlags.push("The referenced plan has expired. An expired plan is stale market analysis. It does not count as pre-commitment.");
        } else {
          // Plan is valid — run chase detection
          const planAgeMs = Date.now() - matchedPlan.createdAt.getTime();
          const planAgeMin = planAgeMs / 60000;
          if (planAgeMin < 5 && sessionLossCount >= 1) {
            planFlags.push(
              `Chase signal: plan created only ${Math.round(planAgeMin)} minute(s) ago during an active losing streak. A plan created minutes after a loss — during emotional activation — is not calm pre-commitment. This is structural chase, regardless of what every slider says.`
            );
            planForcedDowngrade = "REDUCE_RISK";
          }
        }
      } catch {
        // DB error — fail safe: treat as NO_PLAN
        rawStatus = "NO_PLAN";
        planId = null;
      }
    }
  }

  const planMatchStatus = rawStatus;

  // NO_PLAN and SKIPPED both enforce 50% risk cap
  if (planMatchStatus === "NO_PLAN") {
    planForcedDowngrade = "REDUCE_RISK";
    planFlags.push(
      "No pre-committed plan for this setup. This is the moment the amygdala invents a reason. Impulsive trades by definition weren't planned five minutes ago. Risk is automatically capped at 50%."
    );
  } else if (planMatchStatus === "SKIPPED") {
    planForcedDowngrade = "REDUCE_RISK";
    planFlags.push(
      "Plan step skipped — no matching plan selected. Same structural constraint as an unplanned trade: risk is automatically capped at 50%."
    );
  }

  const { verdict: baseVerdictFromPsych, verdictReason, confidenceScore } = computeVerdict({
    ...parsed.data,
    sessionLossCount,
    baselineAvgFocus,
    baselineAvgUrge,
    baselineAvgClarity,
    hasBaseline,
  });

  // Apply plan-match downgrade on top of psych verdict
  let finalVerdict = baseVerdictFromPsych;
  if (planForcedDowngrade) {
    const ORDER = ["TRADE", "REDUCE_RISK", "NO_TRADE", "HARD_BLOCK"];
    const currentIdx = ORDER.indexOf(finalVerdict);
    const forceIdx = ORDER.indexOf(planForcedDowngrade);
    if (forceIdx > currentIdx) finalVerdict = planForcedDowngrade;
  }

  const planReason = planFlags.length ? planFlags.join(" ") : null;
  const combinedReason = [planReason, verdictReason].filter(Boolean).join(" — ");

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
      verdict: finalVerdict,
      verdictReason: combinedReason || verdictReason,
      notes: parsed.data.notes ?? null,
      planId,
      planMatchStatus,
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
