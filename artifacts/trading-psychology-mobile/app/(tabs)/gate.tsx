import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
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
const PSYCH_STATES: { key: PsychState; label: string; color: string }[] = [
  { key: "CALM", label: "Calm", color: "#22c55e" },
  { key: "FOCUSED", label: "Focused", color: "#22d3ee" },
  { key: "PRESSURE", label: "Pressure", color: "#f59e0b" },
  { key: "FEAR", label: "Fear", color: "#f59e0b" },
  { key: "OVERCONFIDENT", label: "Overconfident", color: "#ef4444" },
  { key: "URGE", label: "Urge", color: "#ef4444" },
];

function VerdictCard({ result, onDismiss }: { result: CheckResult; onDismiss: () => void }) {
  const colors = useColors();
  const verdictMeta: Record<string, { label: string; color: string; icon: string; bg: string }> = {
    TRADE: { label: "TRADE", color: "#22c55e", icon: "check-circle", bg: "#22c55e18" },
    REDUCE_RISK: { label: "REDUCE RISK", color: "#f59e0b", icon: "alert-triangle", bg: "#f59e0b18" },
    NO_TRADE: { label: "NO TRADE", color: "#f59e0b", icon: "pause-circle", bg: "#f59e0b18" },
    HARD_BLOCK: { label: "HARD BLOCK", color: "#ef4444", icon: "x-circle", bg: "#ef444418" },
  };
  const meta = verdictMeta[result.verdict];

  return (
    <View style={[styles.verdictCard, { backgroundColor: meta.bg, borderColor: meta.color }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Feather name={meta.icon as any} size={24} color={meta.color} />
        <Text style={{ color: meta.color, fontSize: 22, fontFamily: "Inter_700Bold" }}>{meta.label}</Text>
      </View>
      {result.verdictReason && (
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 16 }}>
          {result.verdictReason}
        </Text>
      )}
      <Button label="New Check" onPress={onDismiss} variant="ghost" />
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
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); }
      catch { return null; }
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
        notes: notes || undefined,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      const feedback =
        data.verdict === "TRADE"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning;
      Haptics.notificationAsync(feedback);
    },
  });

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  if (!session || session.endedAt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Feather name="shield" size={40} color={colors.border} />}
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
        contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
      >
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 20 }}>
          Trade Gate
        </Text>
        <VerdictCard result={result} onDismiss={() => setResult(null)} />
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
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>
          Trade Gate
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          Pre-trade psychological check
        </Text>
      </View>

      <Card style={{ gap: 16 }}>
        <SectionLabel text="Pair" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {PAIRS.map(p => (
            <OptionChip key={p} label={p} selected={pair === p} onPress={() => setPair(p)} />
          ))}
        </View>

        <SectionLabel text="Setup Grade" />
        {GRADES.map(g => {
          const isSelected = grade === g.key;
          return (
            <View
              key={g.key}
              style={[styles.gradeRow, {
                backgroundColor: isSelected ? `${colors.primary}12` : colors.secondary,
                borderColor: isSelected ? colors.primary : colors.border,
              }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: isSelected ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold" }}>
                  {g.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  {g.desc}
                </Text>
              </View>
              <View
                onStartShouldSetResponder={() => true}
                onResponderGrant={() => setGrade(g.key)}
                style={[styles.gradeCheck, {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary : "transparent",
                }]}
              >
                {isSelected && <Feather name="check" size={12} color={colors.primaryForeground} />}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 4 }}>
        <SectionLabel text="Psychological State" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {PSYCH_STATES.map(s => (
            <OptionChip
              key={s.key}
              label={s.label}
              selected={psychState === s.key}
              onPress={() => setPsychState(s.key)}
              color={s.color}
            />
          ))}
        </View>

        <View style={{ marginTop: 8 }}>
          <SliderRow label="Focus" value={focusLevel} onChange={setFocusLevel} color={colors.primary} />
          <SliderRow label="Urge" value={urgeLevel} onChange={setUrgeLevel} color="#ef4444" />
          <SliderRow label="Clarity" value={clarity} onChange={setClarity} color={colors.success} />
        </View>
      </Card>

      <Card>
        <SectionLabel text="Notes (optional)" />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="What's drawing you to this trade?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 10,
            minHeight: 72,
            textAlignVertical: "top",
            backgroundColor: colors.secondary,
          }}
        />
      </Card>

      {checkMutation.isError && (
        <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" }}>
          {(checkMutation.error as Error).message}
        </Text>
      )}

      <Button
        label="Run Check"
        onPress={() => checkMutation.mutate()}
        loading={checkMutation.isPending}
        icon={<Feather name="shield" size={14} color={colors.primaryForeground} />}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verdictCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  gradeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
