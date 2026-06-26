const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type SessionMode = "ANALYSIS" | "PRE_TRADE" | "EXECUTION" | "LOCKED";

export type SetupPlanDirection = "LONG" | "SHORT" | "NEUTRAL";
export type SetupPlanGrade = "A_PLUS" | "B" | "C";

export interface SetupPlan {
  id: number;
  asset: string;
  direction: SetupPlanDirection;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  setupGrade: SetupPlanGrade;
  thesis: string;
  invalidationCondition: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreateSetupPlanInput {
  asset: string;
  direction: SetupPlanDirection;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  setupGrade?: SetupPlanGrade;
  thesis: string;
  invalidationCondition: string;
  expiresInHours?: number;
}
export interface Session {
  id: number;
  mode: SessionMode;
  lossCount: number;
  ruleBreaks: number;
  notes?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

export type SetupGrade = "A_PLUS" | "B" | "C";
export type PsychState = "CALM" | "FOCUSED" | "URGE" | "PRESSURE" | "FEAR" | "OVERCONFIDENT";
export type Verdict = "TRADE" | "REDUCE_RISK" | "NO_TRADE" | "HARD_BLOCK";

export interface CheckResult {
  id: number;
  sessionId: number;
  pair: string;
  setupGrade: SetupGrade;
  psychState: PsychState;
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
  patience?: number | null;
  verdict: Verdict;
  verdictReason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type TradeOutcome = "WIN" | "LOSS" | "BREAKEVEN";
export type InterferenceType = "CLOSED_EARLY" | "MOVED_SL" | "REVENGE" | "OVERSIZE";

export interface Trade {
  id: number;
  sessionId: number;
  pair: string;
  setupGrade: SetupGrade;
  direction: "LONG" | "SHORT";
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  outcome?: TradeOutcome | null;
  followedPlan?: boolean | null;
  interfered?: boolean | null;
  interferenceType?: InterferenceType | null;
  emotionalState?: string | null;
  notes?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface StatsSummary {
  totalTrades: number;
  winRate: number;
  planFollowRate: number;
  interferenceRate: number;
  hardBlockCount: number;
  totalSessions: number;
  avgFocusLevel?: number | null;
  avgUrgeLevel?: number | null;
}

export interface DisciplineStreak {
  currentStreak: number;
  bestStreak: number;
  totalFollowed: number;
  totalTrades: number;
}

export const api = {
  getCurrentSession: () => request<Session>("/sessions/current"),
  startSession: (notes?: string) =>
    request<Session>("/sessions", { method: "POST", body: JSON.stringify({ notes }) }),
  updateSession: (id: number, data: Partial<Session>) =>
    request<Session>(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listSessions: () => request<Session[]>("/sessions"),

  submitCheck: (data: {
    sessionId: number;
    pair: string;
    setupGrade: SetupGrade;
    psychState: PsychState;
    focusLevel: number;
    urgeLevel: number;
    decisionClarity: number;
    patience?: number;
    notes?: string;
  }) => request<CheckResult>("/checks", { method: "POST", body: JSON.stringify(data) }),
  listChecks: (sessionId?: number) =>
    request<CheckResult[]>(`/checks${sessionId ? `?sessionId=${sessionId}` : ""}`),

  listTrades: () => request<Trade[]>("/trades"),
  createTrade: (data: {
    sessionId: number;
    pair: string;
    setupGrade: SetupGrade;
    direction: "LONG" | "SHORT";
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
  }) => request<Trade>("/trades", { method: "POST", body: JSON.stringify(data) }),
  updateTrade: (id: number, data: {
    outcome?: TradeOutcome;
    followedPlan?: boolean;
    interfered?: boolean;
    interferenceType?: InterferenceType;
    emotionalState?: string;
    notes?: string;
    closedAt?: string;
  }) => request<Trade>(`/trades/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getStatsSummary: () => request<StatsSummary>("/stats/summary"),
  getDisciplineStreak: () => request<DisciplineStreak>("/stats/discipline-streak"),

  listSetupPlans: () => request<SetupPlan[]>("/plans"),
  createSetupPlan: (data: CreateSetupPlanInput) =>
    request<SetupPlan>("/plans", { method: "POST", body: JSON.stringify(data) }),
  deleteSetupPlan: (id: number) =>
    request<void>(`/plans/${id}`, { method: "DELETE" }),
};
