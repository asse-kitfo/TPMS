import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Session, CheckResult, SetupGrade, PsychState } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SliderRow, SectionLabel, OptionChip, EmptyState, webTop, webBottom } from "@/components/UI";

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
  { id: "NONE", label: "None", icon: "check-circle" as const },
  { id: "CHEST", label: "Chest", icon: "shield" as const },
  { id: "STOMACH", label: "Stomach", icon: "alert-triangle" as const },
  { id: "JAW", label: "Jaw", icon: "alert-triangle" as const },
  { id: "SHOULDERS", label: "Shoulders", icon: "alert-triangle" as const },
];

type BreathQuality = "SHALLOW" | "NORMAL" | "DEEP";

const BREATH_OPTIONS: { key: BreathQuality; label: string; color: string; note: string }[] = [
  { key: "SHALLOW", label: "Shallow", color: "#ef4444", note: "Sympathetic activation — fight or flight is engaged" },
  { key: "NORMAL", label: "Normal", color: "#f59e0b", note: "Baseline — manageable" },
  { key: "DEEP", label: "Deep", color: "#22c55e", note: "Parasympathetic — calm, optimal for trading" },
];

const RANDE_VERDICT_COACHING: Record<string, Record<string, string>> = {
  HARD_BLOCK: {
    default: "Your survival brain has overridden the trader brain. This state has a near-zero edge expectancy. The market will still be here after you regulate.",
    URGE: "The compulsive urge to trade is the amygdala seeking stimulation — not the prefrontal cortex seeing an edge. There is no setup — there is only a state.",
    FEAR: "Trading from fear guarantees poor execution. Fear contracts your decision-making and makes you close winners too early and hold losers too long.",
    OVERCONFIDENT: "Overconfidence is the result of a dopamine surge — it feels like clarity but is actually noise. The certainty you feel is neurochemical, not analytical.",
  },
  NO_TRADE: {
    default: "Your edge is present on the chart but your psychological edge is below threshold. Come back when your state resets.",
    PRESSURE: "The need to recover is the enemy of good trading. The market cannot feel your urgency — it only responds to setups. Wait.",
  },
  REDUCE_RISK: {
    default: "Your setup is valid but your state creates execution risk. Reduce size so that this trade cannot matter to your emotional brain.",
  },
  TRADE: {
    default: "Green light. Trade your plan, set your stop, and trust your system. Outcome is irrelevant — process is everything.",
  },
};

function getRandeCoaching(verdict: string, state: string): string {
  const byVerdict = RANDE_VERDICT_COACHING[verdict] ?? {};
  return byVerdict[state] ?? byVerdict["default"] ?? "";
}

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
        <View style={{ width: `${score}%`, height: "100%", backgroundColor: scoreColor, borderRadius: 3 }} />
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

function VerdictCard({ result, psychState, onDismiss }: { result: CheckResult; psychState: PsychState; onDismiss: () => void }) {
  const colors = useColors();
  const verdictMeta: Record<string, { label: string; color: string; icon: string; bg: string }> = {
    TRADE: { label: "TRADE", color: "#22c55e", icon: "check-circle", bg: "#22c55e18" },
    REDUCE_RISK: { label: "REDUCE RISK", color: "#f59e0b", icon: "alert-triangle", bg: "#f59e0b18" },
    NO_TRADE: { label: "NO TRADE", color: "#f59e0b", icon: "pause-circle", bg: "#f59e0b18" },
    HARD_BLOCK: { label: "HARD BLOCK", color: "#ef4444", icon: "x-circle", bg: "#ef444418" },
  };
  const meta = verdictMeta[result.verdict];
  const coaching = getRandeCoaching(result.verdict, psychState);

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.verdictCard, { backgroundColor: meta.bg, borderColor: meta.color }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icon name={meta.icon} size={24} color={meta.color} />
          <Text style={{ color: meta.color, fontSize: 22, fontFamily: "Inter_700Bold" }}>{meta.label}</Text>
        </View>
        {result.verdictReason && (
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 }}>
            {result.verdictReason}
          </Text>
        )}
        {coaching ? (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${meta.color}10`, borderWidth: 1, borderColor: `${meta.color}20`, marginBottom: 14 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" }}>
              "{coaching}"
            </Text>
          </View>
        ) : null}
        <Button label="New Check" onPress={onDismiss} variant="ghost" />
      </View>

      {(result.verdict === "HARD_BLOCK" || result.verdict === "NO_TRADE") && (
        <View style={{ padding: 14, borderRadius: 12, backgroundColor: "#3b82f610", borderWidth: 1, borderColor: "#3b82f630" }}>
          <Text style={{ color: "#3b82f6", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Recommended Protocol
          </Text>
          <View style={{ gap: 8 }}>
            {[
              "Do 3 cycles of 4-7-8 breathing on the Hub tab",
              "Step away from the screen for at least 10 minutes",
              "Re-read your trading rules before returning",
              "Run another Gate check when you feel calm",
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

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active session");
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
      });
    },
    onSuccess: (data) => {
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

  if (!session || session.endedAt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Icon name="shield" size={40} color={colors.border} />}
          title="No active session"
          subtitle="Start a session on the Hub tab first"
        />
      </View>
    );
  }

  if (result) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      >
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Trade Gate</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>Psychological clearance check</Text>
        </View>
        <VerdictCard result={result} psychState={psychState} onDismiss={() => setResult(null)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Trade Gate</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          Pre-trade psychological clearance — be honest
        </Text>
      </View>

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
                {isSelected && <Icon name="check" size={12} color={colors.primaryForeground} />}
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

      {/* Body Assessment — Rande Howell's somatic check */}
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
                  {isSelected && <Icon name="check" size={14} color={b.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(bodyTension !== "NONE" || breathQuality === "SHALLOW") && (
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: "#f59e0b08", borderWidth: 1, borderColor: "#f59e0b20" }}>
            <Text style={{ color: "#f59e0b", fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 4 }}>
              ⚡ Somatic activation detected
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

      <Button
        label="Run Gate Check"
        onPress={() => checkMutation.mutate()}
        loading={checkMutation.isPending}
        icon={<Icon name="shield" size={14} color={colors.primaryForeground} />}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verdictCard: { padding: 20, borderRadius: 16, borderWidth: 1.5 },
  gradeRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 8, gap: 12 },
  gradeCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
