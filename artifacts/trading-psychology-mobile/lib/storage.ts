import AsyncStorage from "@react-native-async-storage/async-storage";

/* ── Keys ─────────────────────────────────────────────────────────────────── */
const MAX_LOSSES_KEY = "apexterm:maxLosses";
const LOCAL_SESSION_KEY = "apexterm:localSession";
const ACTIVE_TRADE_KEY = "apexterm:activeTrade";
const COMPLETED_TRADES_KEY = "apexterm:completedTrades";
const CHECK_IN_INTERVAL_KEY = "apexterm:checkInInterval";
const DISCLAIMER_KEY = "apexterm:disclaimerAccepted";
const RULES_KEY = "apexterm:rules2";

/* ── Utilities ────────────────────────────────────────────────────────────── */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/* ── Disclaimer ───────────────────────────────────────────────────────────── */
export async function hasAcceptedDisclaimer(): Promise<boolean> {
  try { return !!(await AsyncStorage.getItem(DISCLAIMER_KEY)); } catch { return false; }
}
export async function acceptDisclaimer(): Promise<void> {
  await AsyncStorage.setItem(DISCLAIMER_KEY, "1");
}

/* ── Local Session ────────────────────────────────────────────────────────── */
export interface LocalSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  maxLosses: number;
  lossCount: number;
}

export async function loadLocalSession(): Promise<LocalSession | null> {
  try {
    const s = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
    if (s) { const p: LocalSession = JSON.parse(s); if (!p.endedAt) return p; }
  } catch {}
  return null;
}

export async function startLocalSession(maxLosses: number): Promise<LocalSession> {
  const session: LocalSession = { id: generateId(), startedAt: new Date().toISOString(), maxLosses, lossCount: 0 };
  await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function endLocalSession(): Promise<void> {
  try {
    const s = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
    if (s) { const p: LocalSession = JSON.parse(s); p.endedAt = new Date().toISOString(); await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(p)); }
  } catch {}
}

export async function incrementLossCount(): Promise<LocalSession | null> {
  try {
    const s = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
    if (s) { const p: LocalSession = JSON.parse(s); p.lossCount = (p.lossCount ?? 0) + 1; await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(p)); return p; }
  } catch {}
  return null;
}

export async function loadMaxLosses(): Promise<number> {
  try { const s = await AsyncStorage.getItem(MAX_LOSSES_KEY); if (s) return parseInt(s, 10); } catch {}
  return 2;
}
export async function saveMaxLosses(n: number): Promise<void> {
  await AsyncStorage.setItem(MAX_LOSSES_KEY, String(n));
}

/* ── Check-In Interval ────────────────────────────────────────────────────── */
export type CheckInIntervalBase = 3 | 5 | 10; // minutes

export async function loadCheckInInterval(): Promise<CheckInIntervalBase> {
  try { const s = await AsyncStorage.getItem(CHECK_IN_INTERVAL_KEY); if (s) return parseInt(s, 10) as CheckInIntervalBase; } catch {}
  return 5;
}
export async function saveCheckInInterval(n: CheckInIntervalBase): Promise<void> {
  await AsyncStorage.setItem(CHECK_IN_INTERVAL_KEY, String(n));
}

/* ── Check-In State Machine ───────────────────────────────────────────────── */
export type CheckInState = "CALM" | "WATCHING" | "URGE" | "ANXIOUS";

export function nextCheckInMinutes(state: CheckInState, base: CheckInIntervalBase = 5): number {
  if (state === "CALM") return base * 2;
  if (state === "WATCHING") return base;
  return 2; // URGE or ANXIOUS — always 2 min
}

export function nextCheckInTimestamp(state: CheckInState, base: CheckInIntervalBase = 5): string {
  return new Date(Date.now() + nextCheckInMinutes(state, base) * 60 * 1000).toISOString();
}

/* ── Check-In (stored per trade) ─────────────────────────────────────────── */
export type CheckInTrigger = "scheduled" | "manual_sos";

export interface TradeCheckIn {
  id: string;
  occurredAt: string;
  state: CheckInState;
  triggeredBy: CheckInTrigger;
  breathingCompleted: boolean;
}

/* ── Active Trade ─────────────────────────────────────────────────────────── */
export interface ActiveTrade {
  id: string;
  startedAt: string;
  asset: string;
  direction: "long" | "short";
  entryPrice?: string;
  stopLoss?: string;
  invalidationCondition: string;
  nextCheckInAt: string;
  checkIns: TradeCheckIn[];
  sosTapCount: number;
}

export async function loadActiveTrade(): Promise<ActiveTrade | null> {
  try { const s = await AsyncStorage.getItem(ACTIVE_TRADE_KEY); if (s) return JSON.parse(s); } catch {}
  return null;
}
export async function saveActiveTrade(trade: ActiveTrade | null): Promise<void> {
  if (trade === null) await AsyncStorage.removeItem(ACTIVE_TRADE_KEY);
  else await AsyncStorage.setItem(ACTIVE_TRADE_KEY, JSON.stringify(trade));
}

/* ── Completed Trade ──────────────────────────────────────────────────────── */
export type TradeOutcome = "win" | "loss" | "breakeven";

export interface CompletedTrade {
  id: string;
  startedAt: string;
  closedAt: string;
  asset: string;
  direction: "long" | "short";
  entryPrice?: string;
  stopLoss?: string;
  invalidationCondition: string;
  outcome: TradeOutcome;
  worstStateDuringTrade: CheckInState | null;
  sosTapCount: number;
  checkIns: TradeCheckIn[];
  postTradeNote?: string;
}

export function computeWorstState(checkIns: TradeCheckIn[]): CheckInState | null {
  if (checkIns.length === 0) return null;
  const rank: CheckInState[] = ["ANXIOUS", "URGE", "WATCHING", "CALM"];
  return rank.find(s => checkIns.some(c => c.state === s)) ?? null;
}

export async function loadCompletedTrades(): Promise<CompletedTrade[]> {
  try { const s = await AsyncStorage.getItem(COMPLETED_TRADES_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
export async function saveCompletedTrade(trade: CompletedTrade): Promise<void> {
  const existing = await loadCompletedTrades();
  await AsyncStorage.setItem(COMPLETED_TRADES_KEY, JSON.stringify([trade, ...existing].slice(0, 500)));
}

/* ── Rules ────────────────────────────────────────────────────────────────── */
export interface Rule {
  id: string;
  text: string;
  active: boolean;
  createdAt: string;
}

const DEFAULT_RULES: Rule[] = [
  { id: "d1", text: "I only enter trades that meet every single criterion of my A+ setup.", active: true, createdAt: new Date().toISOString() },
  { id: "d2", text: "My stop loss is set at entry and never moved against me.", active: true, createdAt: new Date().toISOString() },
  { id: "d3", text: "If I feel a strong urge to trade, I wait 10 minutes and re-assess.", active: true, createdAt: new Date().toISOString() },
  { id: "d4", text: "When the daily loss limit is hit, I close all charts and stop.", active: true, createdAt: new Date().toISOString() },
];

export async function loadRules(): Promise<Rule[]> {
  try { const s = await AsyncStorage.getItem(RULES_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; } } catch {}
  return DEFAULT_RULES;
}
export async function saveRules(rules: Rule[]): Promise<void> {
  await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
}
