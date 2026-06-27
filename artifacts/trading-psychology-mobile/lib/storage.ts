import AsyncStorage from "@react-native-async-storage/async-storage";

export type RuleCategory = "ENTRY" | "EXIT" | "RISK" | "PSYCHOLOGY" | "GENERAL";

export interface Rule {
  id: string;
  title: string;
  body: string;
  category: RuleCategory;
  sortOrder: number;
  createdAt: string;
}

const DEFAULT_RULES: Rule[] = [
  { id: "d1", title: "A+ Setups Only", body: "I only enter trades that meet every single criterion of my A+ setup.", category: "ENTRY", sortOrder: 0, createdAt: new Date().toISOString() },
  { id: "d2", title: "Stop Loss is Non-Negotiable", body: "My stop loss is set at entry and never moved against me.", category: "EXIT", sortOrder: 1, createdAt: new Date().toISOString() },
  { id: "d3", title: "The Urge to Trade Is the Signal to Wait", body: "If I feel a strong urge to find a trade, I close the charts for at least 10 minutes.", category: "PSYCHOLOGY", sortOrder: 2, createdAt: new Date().toISOString() },
  { id: "d4", title: "Daily Loss Limit is an Iron Rule", body: "When reached, I close all charts immediately and do not return that day.", category: "RISK", sortOrder: 3, createdAt: new Date().toISOString() },
];

const RULES_KEY = "apexterm:rules";
const MAX_LOSSES_KEY = "apexterm:maxLosses";
const EMOTION_LOG_KEY = "apexterm:emotionLog";
const ARCHETYPE_KEY = "apexterm:archetype";
const ACTIVE_TRADE_KEY = "apexterm:activeTrade";
const COMPLETED_TRADES_KEY = "apexterm:completedTrades";

export async function loadRules(): Promise<Rule[]> {
  try {
    const stored = await AsyncStorage.getItem(RULES_KEY);
    if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
  } catch {}
  return DEFAULT_RULES;
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export async function loadMaxLosses(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(MAX_LOSSES_KEY);
    if (stored) return parseInt(stored, 10);
  } catch {}
  return 2;
}

export async function saveMaxLosses(n: number): Promise<void> {
  await AsyncStorage.setItem(MAX_LOSSES_KEY, String(n));
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export interface EmotionLogEntry {
  id: string;
  timestamp: string;
  state: string;
  sessionId: number;
}

export async function loadEmotionLog(sessionId: number): Promise<EmotionLogEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(EMOTION_LOG_KEY);
    if (stored) { const all: EmotionLogEntry[] = JSON.parse(stored); return all.filter(e => e.sessionId === sessionId); }
  } catch {}
  return [];
}

export type TraderArchetype = "WARRIOR" | "RULER" | "CAREGIVER" | "SAGE";

export async function loadArchetype(): Promise<TraderArchetype> {
  try { const s = await AsyncStorage.getItem(ARCHETYPE_KEY); if (s) return s as TraderArchetype; } catch {}
  return "SAGE";
}

export async function saveArchetype(a: TraderArchetype): Promise<void> {
  await AsyncStorage.setItem(ARCHETYPE_KEY, a);
}

export async function addEmotionEntry(sessionId: number, state: string): Promise<EmotionLogEntry[]> {
  const newEntry: EmotionLogEntry = { id: generateId(), timestamp: new Date().toISOString(), state, sessionId };
  try {
    const stored = await AsyncStorage.getItem(EMOTION_LOG_KEY);
    const all: EmotionLogEntry[] = stored ? JSON.parse(stored) : [];
    const updated = [newEntry, ...all].slice(0, 200);
    await AsyncStorage.setItem(EMOTION_LOG_KEY, JSON.stringify(updated));
    return updated.filter(e => e.sessionId === sessionId);
  } catch {}
  return [newEntry];
}

/* ── In-Trade Check-In System ─────────────────────────────────────────────── */

export type CheckInState = "CALM" | "WATCHING" | "URGE" | "ANXIOUS";

export interface TradeCheckIn {
  id: string;
  timestamp: string;
  state: CheckInState;
}

export interface ActiveTrade {
  id: string;
  startedAt: string;
  pair: string;
  direction: "LONG" | "SHORT";
  invalidation: string;
  nextCheckInAt: string;
  checkIns: TradeCheckIn[];
}

export type TradeOutcomeLocal = "WIN" | "LOSS" | "BE";

export interface CompletedTrade {
  id: string;
  startedAt: string;
  closedAt: string;
  pair: string;
  direction: "LONG" | "SHORT";
  invalidation: string;
  outcome: TradeOutcomeLocal;
  checkIns: TradeCheckIn[];
  note?: string;
}

export async function loadActiveTrade(): Promise<ActiveTrade | null> {
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_TRADE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export async function saveActiveTrade(trade: ActiveTrade | null): Promise<void> {
  if (trade === null) {
    await AsyncStorage.removeItem(ACTIVE_TRADE_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_TRADE_KEY, JSON.stringify(trade));
  }
}

export async function loadCompletedTrades(): Promise<CompletedTrade[]> {
  try {
    const stored = await AsyncStorage.getItem(COMPLETED_TRADES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export async function saveCompletedTrade(trade: CompletedTrade): Promise<void> {
  const existing = await loadCompletedTrades();
  const updated = [trade, ...existing].slice(0, 500);
  await AsyncStorage.setItem(COMPLETED_TRADES_KEY, JSON.stringify(updated));
}

/* ── Check-In interval logic ──────────────────────────────────────────────── */
export function nextCheckInMinutes(state: CheckInState): number {
  if (state === "CALM") return 10;
  if (state === "WATCHING") return 5;
  return 2; // URGE or ANXIOUS
}

export function nextCheckInTimestamp(state: CheckInState): string {
  const mins = nextCheckInMinutes(state);
  return new Date(Date.now() + mins * 60 * 1000).toISOString();
}
