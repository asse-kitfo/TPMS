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
  {
    id: "default-1",
    title: "A+ Setups Only",
    body: "I only enter trades that meet every single criterion of my A+ setup. If any element is missing, I do not enter. A B or C setup is not a trade — it is gambling with extra steps.",
    category: "ENTRY",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    title: "Stop Loss is Non-Negotiable",
    body: "My stop loss is set at entry and never moved against me. If price hits my stop, I accept the loss and move on. Moving a stop converts small losses into account-ending ones.",
    category: "EXIT",
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    title: "The Urge to Trade Is the Signal to Wait",
    body: "If I feel a strong urge to find a trade, I close the charts for at least 10 minutes. The urge is the emotional brain seeking stimulation — not the analytical brain seeing an edge.",
    category: "PSYCHOLOGY",
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-4",
    title: "Daily Loss Limit is an Iron Rule",
    body: "I set my loss limit before the market opens. When reached, I close all charts immediately and do not return that day. This rule cannot be overridden mid-session.",
    category: "RISK",
    sortOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-5",
    title: "Never Add to a Losing Position",
    body: "A trade moving against me means my analysis was wrong. Adding size when wrong is the ego refusing to accept error. I honor my original risk and nothing more.",
    category: "RISK",
    sortOrder: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-6",
    title: "20-Minute Recovery After a Loss",
    body: "After a stop is hit, I wait at least 20 minutes before considering another trade. This gives the amygdala time to subside and the prefrontal cortex to come back online.",
    category: "PSYCHOLOGY",
    sortOrder: 5,
    createdAt: new Date().toISOString(),
  },
];

const RULES_KEY = "apexterm:rules";
const MAX_LOSSES_KEY = "apexterm:maxLosses";

export async function loadRules(): Promise<Rule[]> {
  try {
    const stored = await AsyncStorage.getItem(RULES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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
