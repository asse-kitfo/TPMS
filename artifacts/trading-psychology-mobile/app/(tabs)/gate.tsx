import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, Session, CheckResult, SetupGrade, PsychState, Verdict } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SliderRow, SectionLabel, OptionChip, EmptyState, webTop, webBottom } from "@/components/UI";

const DISCLAIMER_KEY = "apexterm-disclaimer-accepted";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", "XAU/USD", "Other"];

const GRADES: { key: SetupGrade; label: string; desc: string }[] = [
  { key: "A_PLUS", label: "A+", desc: "Perfect setup — all criteria met" },
  { key: "B", label: "B", desc: "Good setup — most criteria met" },
  { key: "C", label: "C", desc: "Weak setup — just testing" },
];

const PSYCH_STATES: { key: PsychState; label: string; color: string; randeNote: string }[] = [
  { key: "CALM", label: "Calm", color: "#22c55e", randeNote: "Trader state. Prefrontal cortex online. Execute with precision." },
  { key: "FOCUSED", label: "Focused", color: "#22d3ee", randeNote: "Optimal. Clear observation, no emotional interference." },
  { key: "PRESSURE", label: "Pressure", color: "#f59e0b", randeNote: "Survival brain signalling threat. Need to recover distorts perception of risk." },
  { key: "FEAR", label: "Fear", color: "#f97316", randeNote: "Amygdala activation. Fear of loss is more painful than loss itself to the emotional brain." },
  { key: "OVERCONFIDENT", label: "Overconfident", color: "#ef4444", randeNote: "Dopamine surge. Reward circuit rationalising edges that don't exist." },
  { key: "URGE", label: "Urge", color: "#ef4444", randeNote: "Compulsive state. The urge to trade IS the signal to not trade." },
];

const BODY_TENSION_LOCATIONS = [
  { id: "NONE", label: "None" },
  { id: "CHEST", label: "Chest" },
  { id: "STOMACH", label: "Stomach" },
  { id: "JAW", label: "Jaw" },
  { id: "SHOULDERS", label: "Shoulders" },
];

type BreathQuality = "SHALLOW" | "NORMAL" | "DEEP";

const BREATH_OPTIONS: { key: BreathQuality; label: string; color: string; note: string }[] = [
  { key: "SHALLOW", label: "Shallow", color: "#ef4444", note: "Sympathetic activation — fight or flight engaged" },
  { key: "NORMAL", label: "Normal", color: "#f59e0b", note: "Baseline — manageable" },
  { key: "DEEP", label: "Deep", color: "#22c55e", note: "Parasympathetic — calm, optimal for trading" },
];

// ── Confidence Engine ─────────────────────────────────────────────────────────
interface ConfidenceResult {
  score: number; // 0–100
  label: string;
  color: string;
  factors: { text: string; impact: "positive" | "negative" | "neutral" }[];
}

function computeConfidence(params: {
  psychState: PsychState;
  focusLevel: number;
  urgeLevel: number;
  clarity: number;
  patience: number;
  grade: SetupGrade;
  bodyTension: string;
  breathQuality: BreathQuality;
  lossCount: number;
}): ConfidenceResult {
  const { psychState, focusLevel, urgeLevel, clarity, patience, grade, bodyTension, breathQuality, lossCount } = params;

  let score = 50;
  const factors: ConfidenceResult["factors"] = [];

  // Psych state
  if (["CALM", "FOCUSED"].includes(psychState)) {
    score += 18;
    factors.push({ text: `${psychState === "CALM" ? "Calm" : "Focused"} state — prefrontal cortex active`, impact: "positive" });
  } else if (["PRESSURE", "FEAR"].includes(psychState)) {
    score -= 20;
    factors.push({ text: psychState === "PRESSURE" ? "Pressure state — recovery bias distorting risk" : "Fear state — amygdala online, perception impaired", impact: "negative" });
  } else {
    score -= 30;
    factors.push({ text: psychState === "URGE" ? "Urge detected — compulsion is not an edge" : "Overconfidence — dopamine masking real risk", impact: "negative" });
  }

  // Focus
  if (focusLevel >= 8) { score += 8; factors.push({ text: `Focus ${focusLevel}/10 — sharp and deliberate`, impact: "positive" }); }
  else if (focusLevel <= 4) { score -= 10; factors.push({ text: `Focus ${focusLevel}/10 — impaired concentration`, impact: "negative" }); }
  else { factors.push({ text: `Focus ${focusLevel}/10 — adequate`, impact: "neutral" }); }

  // Urge
  if (urgeLevel >= 7) { score -= 18; factors.push({ text: `Urge ${urgeLevel}/10 — high compulsion signal`, impact: "negative" }); }
  else if (urgeLevel <= 3) { score += 8; factors.push({ text: `Urge ${urgeLevel}/10 — low, analytical state`, impact: "positive" }); }
  else { factors.push({ text: `Urge ${urgeLevel}/10 — moderate`, impact: "neutral" }); }

  // Clarity
  if (clarity >= 8) { score += 6; factors.push({ text: `Clarity ${clarity}/10 — decision is clean`, impact: "positive" }); }
  else if (clarity <= 4) { score -= 8; factors.push({ text: `Clarity ${clarity}/10 — foggy decision-making`, impact: "negative" }); }

  // Patience
  if (patience >= 8) { score += 6; factors.push({ text: `Patience ${patience}/10 — not forcing`, impact: "positive" }); }
  else if (patience <= 4) { score -= 8; factors.push({ text: `Patience ${patience}/10 — rushing signal`, impact: "negative" }); }

  // Setup grade
  if (grade === "A_PLUS") { score += 8; factors.push({ text: "A+ setup — maximum technical edge", impact: "positive" }); }
  else if (grade === "B") { factors.push({ text: "B setup — acceptable, not optimal", impact: "neutral" }); }
  else { score -= 12; factors.push({ text: "C setup — weak technical edge", impact: "negative" }); }

  // Body / somatic
  if (bodyTension !== "NONE") { score -= 8; factors.push({ text: `Body tension in ${bodyTension.toLowerCase()} — somatic activation detected`, impact: "negative" }); }
  if (breathQuality === "SHALLOW") { score -= 10; factors.push({ text: "Shallow breathing — sympathetic nervous system active", impact: "negative" }); }
  else if (breathQuality === "DEEP") { score += 6; factors.push({ text: "Deep breathing — parasympathetic, optimal", impact: "positive" }); }

  // Loss count context
  if (lossCount >= 2) { score -= 15; factors.push({ text: `${lossCount} losses this session — revenge/recovery bias risk elevated`, impact: "negative" }); }
  else if (lossCount === 1) { score -= 5; factors.push({ text: "1 loss this session — watch for urge to recover", impact: "negative" }); }

  score = Math.min(100, Math.max(0, Math.round(score)));

  const label = score >= 75 ? "High Stability" : score >= 55 ? "Moderate Stability" : score >= 35 ? "Low Stability" : "Critical Risk";
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#f59e0b" : score >= 35 ? "#f97316" : "#ef4444";

  return { score, label, color, factors };
}

// ── Verdict with risk downgrade ───────────────────────────────────────────────
function applyRiskDowngrade(verdict: Verdict, lossCount: number): { verdict: Verdict; downgraded: boolean } {
  if (lossCount < 2) return { verdict, downgraded: false };
  if (verdict === "TRADE") return { verdict: "REDUCE_RISK", downgraded: true };
  if (verdict === "REDUCE_RISK") return { verdict: "NO_TRADE", downgraded: true };
  return { verdict, downgraded: false };
}

// ── Why-This-Verdict reasons ──────────────────────────────────────────────────
function buildVerdictReason(
  verdict: Verdict,
  psychState: PsychState,
  focusLevel: number,
  urgeLevel: number,
  patience: number,
  lossCount: number,
  downgraded: boolean,
): string {
  const parts: string[] = [];

  if (downgraded) parts.push(`${lossCount} losses this session → risk tolerance automatically tightened`);

  if (verdict === "HARD_BLOCK" || verdict === "NO_TRADE") {
    if (["URGE", "OVERCONFIDENT"].includes(psychState)) parts.push(`${psychState === "URGE" ? "Compulsive urge" : "Overconfidence"} detected — survival brain dominant`);
    if (urgeLevel >= 7) parts.push(`Urge ${urgeLevel}/10 — compulsion not edge`);
    if (patience <= 3) parts.push(`Patience ${patience}/10 — rushing, not waiting`);
    if (lossCount >= 1 && ["PRESSURE", "FEAR"].includes(psychState)) parts.push("Post-loss pressure state → revenge pattern risk");
    if (focusLevel <= 4) parts.push(`Focus ${focusLevel}/10 — impaired analytical capacity`);
  } else if (verdict === "REDUCE_RISK") {
    if (lossCount >= 1) parts.push(`Loss count ${lossCount} → reduce size so trade outcome cannot affect emotion`);
    if (["PRESSURE", "FEAR"].includes(psychState)) parts.push(`${psychState} state → execution risk elevated`);
    if (urgeLevel >= 5) parts.push(`Urge ${urgeLevel}/10 → smaller size lowers emotional stake`);
  } else {
    parts.push("Psychological edge threshold met");
    if (["CALM", "FOCUSED"].includes(psychState)) parts.push(`${psychState} state — prefrontal cortex online`);
  }

  return parts.length > 0 ? parts.join(" · ") : "";
}

// ── VerdictCard ───────────────────────────────────────────────────────────────
function VerdictCard({
  result,
  psychState,
  confidence,
  lossCount,
  onDismiss,
}: {
  result: CheckResult;
  psychState: PsychState;
  confidence: ConfidenceResult;
  lossCount: number;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const [showFactors, setShowFactors] = useState(false);

  const { verdict: displayVerdict, downgraded } = applyRiskDowngrade(result.verdict, lossCount);

  const verdictMeta: Record<string, { label: string; color: string; icon: string; bg: string }> = {
    TRADE: { label: "STATE ALIGNED", color: "#22c55e", icon: "check-circle", bg: "#22c55e18" },
    REDUCE_RISK: { label: "REDUCE RISK", color: "#f59e0b", icon: "alert-triangle", bg: "#f59e0b18" },
    NO_TRADE: { label: "STATE COMPROMISED", color: "#f97316", icon: "pause-circle", bg: "#f9731618" },
    HARD_BLOCK: { label: "HARD BLOCK", color: "#ef4444", icon: "x-circle", bg: "#ef444418" },
  };
  const meta = verdictMeta[displayVerdict];

  const whyReason = buildVerdictReason(
    displayVerdict, psychState,
    confidence.factors.find(f => f.text.includes("Focus"))?.text.includes("/10") ? parseInt(confidence.factors.find(f => f.text.includes("Focus"))!.text) : 7,
    confidence.factors.find(f => f.text.includes("Urge"))?.text.includes("/10") ? parseInt(confidence.factors.find(f => f.text.includes("Urge"))!.text) : 3,
    confidence.factors.find(f => f.text.includes("Patience"))?.text.includes("/10") ? parseInt(confidence.factors.find(f => f.text.includes("Patience"))!.text) : 7,
    lossCount, downgraded,
  );

  const coachingByVerdict: Record<string, string> = {
    HARD_BLOCK: psychState === "URGE"
      ? "The compulsive urge to trade is the amygdala seeking stimulation — not the prefrontal cortex seeing an edge. There is no setup — there is only a state."
      : psychState === "FEAR"
      ? "Trading from fear guarantees poor execution. Fear contracts your decision-making and makes you close winners early and hold losers too long."
      : "Your survival brain has overridden the trader brain. This state has a near-zero edge expectancy. The market will still be here after you regulate.",
    NO_TRADE: psychState === "PRESSURE"
      ? "The need to recover is the enemy of good trading. The market cannot feel your urgency — it only responds to setups. Wait."
      : "Your edge is present on the chart but your psychological edge is below threshold. Come back when your state resets.",
    REDUCE_RISK: "Your setup is valid but your state creates execution risk. Reduce size so that this trade cannot matter to your emotional brain.",
    TRADE: "Green light. Trade your plan, set your stop, and trust your system. Outcome is irrelevant — process is everything.",
  };
  const coaching = coachingByVerdict[displayVerdict] ?? "";

  return (
    <View style={{ gap: 14 }}>
      {/* Main verdict card */}
      <View style={[styles.verdictCard, { backgroundColor: `${meta.color}10`, borderColor: `${meta.color}50` }]}>
        {/* Verdict header with confidence */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name={meta.icon as any} size={24} color={meta.color} />
            <View>
              <Text style={{ color: meta.color, fontSize: 22, fontFamily: "Inter_700Bold" }}>{meta.label}</Text>
              <Text style={{ color: `${meta.color}90`, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                {confidence.score}% {confidence.label}
              </Text>
            </View>
          </View>
          {/* Confidence ring */}
          <View style={{ alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: confidence.color, backgroundColor: `${confidence.color}12` }}>
            <Text style={{ color: confidence.color, fontSize: 14, fontFamily: "Inter_700Bold" }}>{confidence.score}</Text>
          </View>
        </View>

        {/* Confidence bar */}
        <View style={{ height: 4, backgroundColor: colors.secondary, borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
          <View style={{ width: `${confidence.score}%` as any, height: "100%", backgroundColor: confidence.color, borderRadius: 2 }} />
        </View>

        {/* Downgrade notice */}
        {downgraded && (
          <View style={{ flexDirection: "row", gap: 8, padding: 10, borderRadius: 8, backgroundColor: "#ef444412", borderWidth: 1, borderColor: "#ef444430", marginBottom: 10 }}>
            <Feather name="trending-down" size={13} color="#ef4444" style={{ marginTop: 1 }} />
            <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 }}>
              Auto-downgraded: {result.verdict} → {displayVerdict} · {lossCount} losses this session
            </Text>
          </View>
        )}

        {/* Why this verdict */}
        {whyReason ? (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${meta.color}08`, borderWidth: 1, borderColor: `${meta.color}20`, marginBottom: 10 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
              Why this verdict
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
              {whyReason}
            </Text>
          </View>
        ) : null}

        {/* Coaching */}
        {coaching ? (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${meta.color}06`, borderWidth: 1, borderColor: `${meta.color}15`, marginBottom: 14 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" }}>
              "{coaching}"
            </Text>
          </View>
        ) : null}

        {/* Factor breakdown (expandable) */}
        <TouchableOpacity
          onPress={() => setShowFactors(v => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 12 }}
        >
          <Feather name={showFactors ? "chevron-up" : "chevron-down"} size={13} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
            {showFactors ? "Hide" : "Show"} scoring factors ({confidence.factors.length})
          </Text>
        </TouchableOpacity>

        {showFactors && (
          <View style={{ gap: 6, marginBottom: 12 }}>
            {confidence.factors.map((f, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Feather
                  name={f.impact === "positive" ? "arrow-up" : f.impact === "negative" ? "arrow-down" : "minus"}
                  size={11}
                  color={f.impact === "positive" ? "#22c55e" : f.impact === "negative" ? "#ef4444" : colors.mutedForeground}
                  style={{ marginTop: 2 }}
                />
                <Text style={{ color: f.impact === "positive" ? "#22c55e" : f.impact === "negative" ? "#ef4444" : colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 }}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Button label="New Check" onPress={onDismiss} variant="ghost" fullWidth />
      </View>

      {/* SOS protocol prompt for hard block / no trade */}
      {(displayVerdict === "HARD_BLOCK" || displayVerdict === "NO_TRADE") && (
        <View style={{ padding: 14, borderRadius: 12, backgroundColor: "#3b82f610", borderWidth: 1, borderColor: "#3b82f630" }}>
          <Text style={{ color: "#3b82f6", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Recommended: SOS Protocol
          </Text>
          <View style={{ gap: 8 }}>
            {[
              "Hub tab → Begin SOS Protocol (3-phase state reset)",
              "Phase 1: 30-second cold interrupt",
              "Phase 2: Body discharge + 4-7-8 breath",
              "Phase 3: Reframe — one truth statement",
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#3b82f620", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <Text style={{ color: "#3b82f6", fontSize: 10, fontFamily: "Inter_700Bold" }}>{i + 1}</Text>
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── TraderStateScore ──────────────────────────────────────────────────────────
function TraderStateScore({ focus, urge, clarity, patience, state }: { focus: number; urge: number; clarity: number; patience: number; state: PsychState }) {
  const colors = useColors();
  const stateRisk = ["CALM", "FOCUSED"].includes(state) ? 0 : ["PRESSURE", "FEAR"].includes(state) ? 1 : 2;
  const raw = focus + clarity + patience - urge - (stateRisk * 3);
  const normalized = Math.min(100, Math.max(0, Math.round(((raw + 10) / 50) * 100)));
  const score = normalized;
  const scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Trader State" : score >= 45 ? "Borderline" : "Survival State";

  return (
    <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: `${scoreColor}40`, backgroundColor: `${scoreColor}08`, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
          Psychological Edge Score
        </Text>
        <Text style={{ color: scoreColor, fontSize: 20, fontFamily: "Inter_700Bold" }}>{score}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ width: `${score}%` as any, height: "100%", backgroundColor: scoreColor, borderRadius: 3 }} />
      </View>
      <Text style={{ color: scoreColor, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
      {score < 45 && (
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, fontStyle: "italic" }}>
          "You cannot trade your way out of a psychological state. The trade will not fix how you feel — it will amplify it." — Rande Howell
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [pair, setPair] = useState("EUR/USD");
  const [grade, setGrade] = useState<SetupGrade>("A_PLUS");
  const [psychState, setPsychState] = useState<PsychState>("CALM");
  const [focusLevel, setFocusLevel] = useState(7);
  const [urgeLevel, setUrgeLevel] = useState(3);
  const [clarity, setClarity] = useState(7);
  const [patience, setPatience] = useState(7);
  const [bodyTension, setBodyTension] = useState("NONE");
  const [breathQuality, setBreathQuality] = useState<BreathQuality>("NORMAL");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);

  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [frictionUnlocked, setFrictionUnlocked] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
  });

  const lossCount = session?.lossCount ?? 0;
  const frictionRequired = lossCount >= 1;

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_KEY).then((val) => {
      if (!val) setDisclaimerVisible(true);
    }).catch(() => {});
    startTimeRef.current = Date.now();
  }, []);

  const acceptDisclaimer = () => {
    AsyncStorage.setItem(DISCLAIMER_KEY, "1").catch(() => {});
    setDisclaimerVisible(false);
  };

  const startHold = () => {
    if (holdIntervalRef.current) return;
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((p) => {
        const next = p + 1;
        if (next >= 100) {
          clearInterval(holdIntervalRef.current!);
          holdIntervalRef.current = null;
          setFrictionUnlocked(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress((p) => (p < 100 ? 0 : p));
  };

  const checkMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active session");
      const submissionDurationMs = Date.now() - startTimeRef.current;
      return api.submitCheck({
        sessionId: session.id,
        pair,
        setupGrade: grade,
        psychState,
        focusLevel,
        urgeLevel,
        decisionClarity: clarity,
        patience,
        notes: notes || undefined,
        submissionDurationMs,
      } as any);
    },
    onSuccess: (data) => {
      const conf = computeConfidence({
        psychState, focusLevel, urgeLevel, clarity, patience,
        grade, bodyTension, breathQuality: breathQuality as BreathQuality,
        lossCount,
      });
      setConfidence(conf);
      setResult(data);
      Haptics.notificationAsync(
        data.verdict === "TRADE" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    },
  });

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const selectedState = PSYCH_STATES.find(s => s.key === psychState);
  const selectedBreath = BREATH_OPTIONS.find(b => b.key === breathQuality);

  // Live confidence preview (before submit)
  const liveConfidence = computeConfidence({
    psychState, focusLevel, urgeLevel, clarity, patience,
    grade, bodyTension, breathQuality, lossCount,
  });

  if (!session || session.endedAt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Feather name="check-circle" size={40} color={colors.border} />}
          title="No active session"
          subtitle="Start a session on the Hub tab first"
        />
      </View>
    );
  }

  if (result && confidence) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      >
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Trade Gate</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>Psychological clearance check</Text>
        </View>
        <VerdictCard
          result={result}
          psychState={psychState}
          confidence={confidence}
          lossCount={lossCount}
          onDismiss={() => { setResult(null); setConfidence(null); }}
        />
      </ScrollView>
    );
  }

  return (
    <>
    <Modal visible={disclaimerVisible} transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, gap: 16, borderWidth: 1, borderColor: colors.border, maxWidth: 400, width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="shield" size={22} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: "Inter_700Bold" }}>Before You Begin</Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>ApexTerm is a psychological training tool</Text>, not a financial advisory service. Nothing here constitutes investment advice or a guarantee of trading performance.
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
            The Trade Gate examines your <Text style={{ fontStyle: "italic" }}>psychological state</Text> only. Trading involves substantial risk of loss. You are solely responsible for all trading decisions.
          </Text>
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}25` }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 }}>
              By continuing, you confirm this is a psychological exercise tool, not financial advice, and all risk remains with you.
            </Text>
          </View>
          <TouchableOpacity
            onPress={acceptDisclaimer}
            style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center" }}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_700Bold" }}>I Understand — Begin Training</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Trade Gate</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            Pre-trade psychological clearance — be honest
          </Text>
        </View>
        {/* Live confidence badge */}
        <View style={{ alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: liveConfidence.color, backgroundColor: `${liveConfidence.color}12` }}>
          <Text style={{ color: liveConfidence.color, fontSize: 13, fontFamily: "Inter_700Bold" }}>{liveConfidence.score}</Text>
        </View>
      </View>

      {/* Loss count context banner */}
      {lossCount >= 2 && (
        <View style={{ flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#ef444412", borderWidth: 1, borderColor: "#ef444330" }}>
          <Feather name="trending-down" size={14} color="#ef4444" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
              {lossCount} losses this session — risk context active
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 }}>
              Any TRADE verdict will auto-downgrade to REDUCE RISK. Any REDUCE RISK will become NO TRADE. This is automatic — not negotiable.
            </Text>
          </View>
        </View>
      )}
      {lossCount === 1 && (
        <View style={{ flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#f59e0b10", borderWidth: 1, borderColor: "#f59e0b25" }}>
          <Feather name="alert-triangle" size={14} color="#f59e0b" style={{ marginTop: 1 }} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 }}>
            1 loss this session — watch for recovery bias. Be extra honest about urge level and patience.
          </Text>
        </View>
      )}

      {/* Setup */}
      <Card style={{ gap: 16 }}>
        <SectionLabel text="Pair" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {PAIRS.map(p => <OptionChip key={p} label={p} selected={pair === p} onPress={() => setPair(p)} />)}
        </View>

        <SectionLabel text="Setup Grade" />
        {GRADES.map(g => {
          const isSelected = grade === g.key;
          return (
            <TouchableOpacity
              key={g.key} activeOpacity={0.8} onPress={() => setGrade(g.key)}
              style={[styles.gradeRow, { backgroundColor: isSelected ? `${colors.primary}12` : colors.secondary, borderColor: isSelected ? colors.primary : colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: isSelected ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold" }}>{g.label}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>{g.desc}</Text>
              </View>
              <View style={[styles.gradeCheck, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" }]}>
                {isSelected && <Feather name="check" size={12} color={colors.primaryForeground} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>

      {/* Psychological State */}
      <Card style={{ gap: 12 }}>
        <SectionLabel text="Psychological State" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {PSYCH_STATES.map(s => (
            <OptionChip key={s.key} label={s.label} selected={psychState === s.key} onPress={() => setPsychState(s.key)} color={s.color} />
          ))}
        </View>

        {selectedState && (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${selectedState.color}08`, borderWidth: 1, borderColor: `${selectedState.color}20` }}>
            <Text style={{ color: selectedState.color, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18, fontStyle: "italic" }}>
              "{selectedState.randeNote}"
            </Text>
          </View>
        )}

        <View style={{ marginTop: 4 }}>
          <SliderRow label="Focus" value={focusLevel} onChange={setFocusLevel} color={colors.primary} />
          <SliderRow label="Urge" value={urgeLevel} onChange={setUrgeLevel} color="#ef4444" />
          <SliderRow label="Clarity" value={clarity} onChange={setClarity} color={colors.success} />
          <SliderRow label="Patience" value={patience} onChange={setPatience} color="#22d3ee" />
        </View>

        <TraderStateScore focus={focusLevel} urge={urgeLevel} clarity={clarity} patience={patience} state={psychState} />
      </Card>

      {/* Body Assessment */}
      <Card style={{ gap: 12 }}>
        <View>
          <SectionLabel text="Body Assessment" />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 }}>
            Rande Howell: "The body holds emotional truth before the mind does." A tense body means an activated nervous system.
          </Text>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Where do you feel tension?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {BODY_TENSION_LOCATIONS.map(loc => {
              const isSelected = bodyTension === loc.id;
              const color = loc.id === "NONE" ? "#22c55e" : "#f59e0b";
              return (
                <TouchableOpacity
                  key={loc.id} activeOpacity={0.8} onPress={() => { setBodyTension(loc.id); Haptics.selectionAsync(); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? `${color}18` : colors.secondary }}
                >
                  <Text style={{ color: isSelected ? color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{loc.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Breathing quality right now</Text>
          <View style={{ gap: 8 }}>
            {BREATH_OPTIONS.map(b => {
              const isSelected = breathQuality === b.key;
              return (
                <TouchableOpacity
                  key={b.key} activeOpacity={0.8} onPress={() => { setBreathQuality(b.key); Haptics.selectionAsync(); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: isSelected ? b.color : colors.border, backgroundColor: isSelected ? `${b.color}15` : colors.secondary }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isSelected ? b.color : colors.border }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: isSelected ? b.color : colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{b.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{b.note}</Text>
                  </View>
                  {isSelected && <Feather name="check" size={14} color={b.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(bodyTension !== "NONE" || breathQuality === "SHALLOW") && (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: "#f59e0b08", borderWidth: 1, borderColor: "#f59e0b20" }}>
            <Text style={{ color: "#f59e0b", fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 4 }}>
              Somatic activation detected
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
              {bodyTension !== "NONE" ? `Tension in ${BODY_TENSION_LOCATIONS.find(l => l.id === bodyTension)?.label?.toLowerCase() ?? bodyTension.toLowerCase()}. ` : ""}
              {breathQuality === "SHALLOW" ? "Shallow breathing indicates sympathetic nervous system activation. " : ""}
              Consider 3 cycles of 4-7-8 breathing before running this check.
            </Text>
          </View>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <SectionLabel text="Notes (optional)" />
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="What's drawing you to this trade? Be honest."
          placeholderTextColor={colors.mutedForeground}
          multiline numberOfLines={3}
          style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, minHeight: 72, textAlignVertical: "top", backgroundColor: colors.secondary }}
        />
      </Card>

      {checkMutation.isError && (
        <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" }}>
          {(checkMutation.error as Error).message}
        </Text>
      )}

      {frictionRequired && !frictionUnlocked && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#f59e0b10", borderWidth: 1, borderColor: "#f59e0b30" }}>
            <Feather name="wind" size={14} color="#f59e0b" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#f59e0b", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Dynamic Friction — {lossCount} loss{lossCount > 1 ? "es" : ""} this session</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 }}>
                Hold the button below for 10 seconds. This deliberate pause keeps the cortex in control and prevents reactive re-entry after a loss.
              </Text>
            </View>
          </View>
          <Pressable
            onPressIn={startHold}
            onPressOut={endHold}
            style={{ height: 52, borderRadius: 10, borderWidth: 2, borderColor: "#f59e0b60", backgroundColor: "#f59e0b12", overflow: "hidden", justifyContent: "center", alignItems: "center" }}
          >
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${holdProgress}%` as any, backgroundColor: "#f59e0b30" }} />
            <Text style={{ color: "#f59e0b", fontSize: 13, fontFamily: "Inter_700Bold" }}>
              {holdProgress === 0 ? "Hold to Confirm Deliberate State" : `Hold… ${Math.ceil((100 - holdProgress) / 10)}s remaining`}
            </Text>
          </Pressable>
        </View>
      )}

      {frictionRequired && frictionUnlocked && (
        <View style={{ padding: 10, borderRadius: 8, backgroundColor: "#22c55e08", borderWidth: 1, borderColor: "#22c55e25" }}>
          <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>✓ 10-second hold complete — deliberate state confirmed</Text>
        </View>
      )}

      <Button
        label="Run Gate Check"
        onPress={() => checkMutation.mutate()}
        loading={checkMutation.isPending}
        disabled={frictionRequired && !frictionUnlocked}
        icon={<Feather name="check-circle" size={14} color={colors.primaryForeground} />}
        fullWidth
      />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  verdictCard: { padding: 20, borderRadius: 16, borderWidth: 1.5 },
  gradeRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 8, gap: 12 },
  gradeCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
