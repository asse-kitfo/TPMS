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

  // ── HARD BLOCK ─────────────────────────────────────────────────────
  if (urgeLevel >= 8) {
    return {
      verdict: "HARD_BLOCK",
      verdictReason:
        "Urge level is critically high. Your survival brain is in full control. No capital is safe when the amygdala is running the show. Step away now.",
    };
  }
  if (focusLevel <= 3) {
    return {
      verdict: "HARD_BLOCK",
      verdictReason:
        "Focus is critically low. You cannot execute with discipline if your attention is fragmented. Close the charts.",
    };
  }
  if (setupGrade !== "A_PLUS") {
    return {
      verdict: "HARD_BLOCK",
      verdictReason:
        "This is not an A+ setup. Your methodology requires A+ confluence only. Every non-A+ trade you take is a statistical bet against your edge.",
    };
  }
  if (psychState === "FEAR") {
    return {
      verdict: "HARD_BLOCK",
      verdictReason:
        "Fear state detected. The amygdala is scanning for threat and will distort price action interpretation. You cannot trade objectively from fear.",
    };
  }
  if (psychState === "OVERCONFIDENT") {
    return {
      verdict: "HARD_BLOCK",
      verdictReason:
        "Overconfidence detected. The ego has inflated your perceived edge. Overconfidence is the precursor to revenge trading and oversizing. Stand down.",
    };
  }

  // ── REDUCE RISK ────────────────────────────────────────────────────
  if (urgeLevel >= 6) {
    return {
      verdict: "REDUCE_RISK",
      verdictReason:
        "Urge to execute is elevated. The survival brain is pushing for action. Trade at 50% of normal size to limit damage if the emotional brain hijacks execution.",
    };
  }
  if (psychState === "PRESSURE") {
    return {
      verdict: "REDUCE_RISK",
      verdictReason:
        "You are under pressure — this means you NEED this trade to work, which means you won't let it work. Reduce size by 50% or do not trade.",
    };
  }
  if (decisionClarity < 5) {
    return {
      verdict: "REDUCE_RISK",
      verdictReason:
        "Decision clarity is below threshold. If you cannot articulate clearly why this is an edge, reduce size drastically.",
    };
  }
  if (focusLevel < 6) {
    return {
      verdict: "REDUCE_RISK",
      verdictReason:
        "Focus is sub-optimal. You may miss signals during the trade. Reduce size and set alerts so you do not need to monitor actively.",
    };
  }

  // ── NO TRADE ───────────────────────────────────────────────────────
  if (psychState === "URGE") {
    return {
      verdict: "NO_TRADE",
      verdictReason:
        "You reported an urge to trade. The urge IS the signal to stand aside — it means the survival brain is pushing for action, not the cortex seeing an edge. Wait until the urge passes before reassessing.",
    };
  }
  if (urgeLevel >= 5 && decisionClarity < 8) {
    return {
      verdict: "NO_TRADE",
      verdictReason:
        "Moderate urge combined with below-peak decision clarity. Your mind is constructing a narrative to justify trading. This trade idea is coming from the emotional brain, not the analytical brain.",
    };
  }

  // ── TRADE APPROVED ─────────────────────────────────────────────────
  // Fixed operator precedence: was `setupGrade === "A_PLUS" && psychState === "CALM" || psychState === "FOCUSED"`
  if (setupGrade === "A_PLUS" && (psychState === "CALM" || psychState === "FOCUSED")) {
    if (focusLevel >= 7 && urgeLevel <= 4 && decisionClarity >= 7) {
      return {
        verdict: "TRADE",
        verdictReason:
          "All systems green. A+ setup, cortex online, urge is low and decision is clear. Execute your plan with full discipline — then leave the trade alone.",
      };
    }
  }

  return {
    verdict: "TRADE",
    verdictReason:
      "Setup meets minimum criteria. Execute your predefined plan exactly. The moment you deviate, the statistical edge is gone.",
  };
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
