import { Router } from "express";
import { db, tradesTable, checksTable, sessionsTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";

const router = Router();

router.get("/summary", async (_req, res) => {
  const trades = await db.select().from(tradesTable);
  const sessions = await db.select().from(sessionsTable);
  const checks = await db.select().from(checksTable);

  const totalTrades = trades.length;
  const closedTrades = trades.filter((t) => t.outcome !== null);
  const wins = closedTrades.filter((t) => t.outcome === "WIN").length;
  const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

  const tradesWithPlanData = trades.filter((t) => t.followedPlan !== null);
  const planFollowed = tradesWithPlanData.filter((t) => t.followedPlan === true).length;
  const planFollowRate = tradesWithPlanData.length > 0 ? planFollowed / tradesWithPlanData.length : 0;

  const tradesWithInterference = trades.filter((t) => t.interfered !== null);
  const interfered = tradesWithInterference.filter((t) => t.interfered === true).length;
  const interferenceRate = tradesWithInterference.length > 0 ? interfered / tradesWithInterference.length : 0;

  const hardBlockCount = checks.filter((c) => c.verdict === "HARD_BLOCK").length;

  const focusLevels = checks.map((c) => c.focusLevel);
  const urgeLevels = checks.map((c) => c.urgeLevel);
  const avgFocusLevel = focusLevels.length > 0 ? focusLevels.reduce((a, b) => a + b, 0) / focusLevels.length : null;
  const avgUrgeLevel = urgeLevels.length > 0 ? urgeLevels.reduce((a, b) => a + b, 0) / urgeLevels.length : null;

  return res.json({
    totalTrades,
    winRate,
    planFollowRate,
    interferenceRate,
    hardBlockCount,
    totalSessions: sessions.length,
    avgFocusLevel,
    avgUrgeLevel,
  });
});

router.get("/patterns", async (_req, res) => {
  const trades = await db.select().from(tradesTable);
  const checks = await db.select().from(checksTable);

  const patterns: Array<{
    type: string;
    label: string;
    severity: string;
    count: number;
    insight: string;
  }> = [];

  // Check for non-A+ trades taken
  const weakSetupTrades = trades.filter((t) => t.setupGrade !== "A_PLUS");
  if (weakSetupTrades.length > 0) {
    patterns.push({
      type: "WEAK_SETUP",
      label: "Weak Setup Entries",
      severity: weakSetupTrades.length >= 5 ? "HIGH" : weakSetupTrades.length >= 2 ? "MEDIUM" : "LOW",
      count: weakSetupTrades.length,
      insight: "You traded non-A+ setups. Your edge only exists on A+ setups — every other trade is random noise.",
    });
  }

  // Interference (SL moving, early close, etc.)
  const interferenceTrades = trades.filter((t) => t.interfered === true);
  if (interferenceTrades.length > 0) {
    patterns.push({
      type: "INTERFERENCE",
      label: "Trade Interference",
      severity: interferenceTrades.length >= 5 ? "HIGH" : interferenceTrades.length >= 2 ? "MEDIUM" : "LOW",
      count: interferenceTrades.length,
      insight: "You interfered with your trades after entry. Every interference breaks your expected value — your system only works when you leave it alone.",
    });
  }

  // Revenge trading (REVENGE interference type)
  const revengeTrades = trades.filter((t) => t.interferenceType === "REVENGE");
  if (revengeTrades.length > 0) {
    patterns.push({
      type: "REVENGE_TRADING",
      label: "Revenge Trading",
      severity: "HIGH",
      count: revengeTrades.length,
      insight: "Revenge trading detected. This is the most dangerous pattern — losses trigger more losses. After a loss, you must stop.",
    });
  }

  // Emotional state issues (high urge checks)
  const highUrgeChecks = checks.filter((c) => c.urgeLevel >= 7);
  if (highUrgeChecks.length > 0) {
    patterns.push({
      type: "EMOTIONAL_ENTRY",
      label: "High-Urge Check-Ins",
      severity: highUrgeChecks.length >= 5 ? "HIGH" : highUrgeChecks.length >= 2 ? "MEDIUM" : "LOW",
      count: highUrgeChecks.length,
      insight: "You attempted to trade with high urge levels. Urge is your brain's signal to take action — in trading, it means stop.",
    });
  }

  // Check if many trades logged per session (overtrading)
  const sessionTradeCounts: Record<number, number> = {};
  for (const t of trades) {
    sessionTradeCounts[t.sessionId] = (sessionTradeCounts[t.sessionId] ?? 0) + 1;
  }
  const overtradeSessions = Object.values(sessionTradeCounts).filter((c) => c >= 5);
  if (overtradeSessions.length > 0) {
    patterns.push({
      type: "OVERTRADING",
      label: "Overtrading Sessions",
      severity: overtradeSessions.length >= 3 ? "HIGH" : "MEDIUM",
      count: overtradeSessions.reduce((a, b) => a + b, 0),
      insight: "You took too many trades in a single session. Quality over quantity — 1 perfect A+ trade beats 10 mediocre ones.",
    });
  }

  // Impulse trade detection (trades taken after hard block checks)
  const hardBlockSessions = new Set(checks.filter((c) => c.verdict === "HARD_BLOCK").map((c) => c.sessionId));
  const tradesAfterBlock = trades.filter((t) => hardBlockSessions.has(t.sessionId));
  if (tradesAfterBlock.length > 0) {
    patterns.push({
      type: "IMPULSE_TRADE",
      label: "Trades After Hard Block",
      severity: "HIGH",
      count: tradesAfterBlock.length,
      insight: "You traded in sessions where a HARD BLOCK was issued. This means you overrode your own system — the most dangerous behavior pattern.",
    });
  }

  return res.json(patterns);
});

router.get("/grade-breakdown", async (_req, res) => {
  const trades = await db.select().from(tradesTable);

  const grades = ["A_PLUS", "B", "C"] as const;
  const result = grades.map((grade) => {
    const gradeTrades = trades.filter((t) => t.setupGrade === grade);
    const closed = gradeTrades.filter((t) => t.outcome !== null);
    const wins = closed.filter((t) => t.outcome === "WIN").length;
    const withPlan = gradeTrades.filter((t) => t.followedPlan !== null);
    const followed = withPlan.filter((t) => t.followedPlan === true).length;

    return {
      grade,
      count: gradeTrades.length,
      winRate: closed.length > 0 ? wins / closed.length : 0,
      planFollowRate: withPlan.length > 0 ? followed / withPlan.length : 0,
    };
  });

  return res.json(result);
});

router.get("/discipline-streak", async (_req, res) => {
  const trades = await db.select().from(tradesTable).orderBy(tradesTable.createdAt);

  const tradesWithPlan = trades.filter((t) => t.followedPlan !== null);
  let currentStreak = 0;
  let bestStreak = 0;
  let temp = 0;
  let totalFollowed = 0;

  for (const t of tradesWithPlan) {
    if (t.followedPlan === true) {
      temp++;
      totalFollowed++;
      if (temp > bestStreak) bestStreak = temp;
    } else {
      temp = 0;
    }
  }
  currentStreak = temp;

  return res.json({
    currentStreak,
    bestStreak,
    totalFollowed,
    totalTrades: tradesWithPlan.length,
  });
});

export default router;
