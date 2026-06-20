import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Session, Trade, SetupGrade, TradeOutcome, InterferenceType } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, OptionChip, EmptyState, webTop, webBottom } from "@/components/UI";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", "XAU/USD", "Other"];
const GRADES: SetupGrade[] = ["A_PLUS", "B", "C"];
const GRADE_LABELS: Record<SetupGrade, string> = { A_PLUS: "A+", B: "B", C: "C" };

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [pair, setPair] = useState("EUR/USD");
  const [grade, setGrade] = useState<SetupGrade>("A_PLUS");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);

  const [outcome, setOutcome] = useState<TradeOutcome>("WIN");
  const [followedPlan, setFollowedPlan] = useState(true);
  const [interfered, setInterfered] = useState(false);
  const [interferenceType, setInterferenceType] = useState<InterferenceType>("CLOSED_EARLY");
  const [debriefNotes, setDebriefNotes] = useState("");

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No session");
      return api.createTrade({ sessionId: session.id, pair, setupGrade: grade, direction });
    },
    onSuccess: (trade) => {
      setActiveTrade(trade);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
  });

  const debriefMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrade) throw new Error("No active trade");
      return api.updateTrade(activeTrade.id, {
        outcome,
        followedPlan,
        interfered,
        interferenceType: interfered ? interferenceType : undefined,
        notes: debriefNotes || undefined,
        closedAt: new Date().toISOString(),
      });
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(
        data.outcome === "WIN"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["session"] });
      setActiveTrade(null);
      setDebriefNotes("");
      setInterfered(false);
      setFollowedPlan(true);
    },
  });

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  if (!session || session.endedAt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Icon name="crosshair" size={40} color={colors.border} />}
          title="No active session"
          subtitle="Start a session on the Hub tab first"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>
          Active Monitor
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          Lock in, then debrief after close
        </Text>
      </View>

      {!activeTrade ? (
        /* ── Lock-in form ── */
        <Card style={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
            Lock In Trade
          </Text>

          <View>
            <SectionLabel text="Pair" />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {PAIRS.map(p => (
                <OptionChip key={p} label={p} selected={pair === p} onPress={() => setPair(p)} />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel text="Grade" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {GRADES.map(g => (
                <OptionChip
                  key={g}
                  label={GRADE_LABELS[g]}
                  selected={grade === g}
                  onPress={() => setGrade(g)}
                />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel text="Direction" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <OptionChip label="LONG ↑" selected={direction === "LONG"} onPress={() => setDirection("LONG")} color={colors.success} />
              <OptionChip label="SHORT ↓" selected={direction === "SHORT"} onPress={() => setDirection("SHORT")} color={colors.destructive} />
            </View>
          </View>

          <Button
            label="Lock In Trade"
            onPress={() => lockMutation.mutate()}
            loading={lockMutation.isPending}
            icon={<Icon name="lock" size={14} color={colors.primaryForeground} />}
            fullWidth
          />
        </Card>
      ) : (
        /* ── Active trade banner + debrief ── */
        <View style={{ gap: 12 }}>
          <View style={[styles.activeBanner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: 16, fontFamily: "Inter_700Bold" }}>
                {activeTrade.pair} — {GRADE_LABELS[activeTrade.setupGrade]} — {activeTrade.direction}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                Locked in at {new Date(activeTrade.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          {/* Debrief */}
          <Card style={{ gap: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
              Debrief
            </Text>

            <View>
              <SectionLabel text="Outcome" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <OptionChip label="WIN" selected={outcome === "WIN"} onPress={() => setOutcome("WIN")} color={colors.success} />
                <OptionChip label="LOSS" selected={outcome === "LOSS"} onPress={() => setOutcome("LOSS")} color={colors.destructive} />
                <OptionChip label="BREAKEVEN" selected={outcome === "BREAKEVEN"} onPress={() => setOutcome("BREAKEVEN")} color={colors.mutedForeground} />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }}>Followed the plan?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Did you execute exactly as planned?</Text>
              </View>
              <Switch
                value={followedPlan}
                onValueChange={setFollowedPlan}
                trackColor={{ false: colors.border, true: `${colors.success}80` }}
                thumbColor={followedPlan ? colors.success : colors.mutedForeground}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }}>Interfered?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Moved SL, closed early, etc.</Text>
              </View>
              <Switch
                value={interfered}
                onValueChange={setInterfered}
                trackColor={{ false: colors.border, true: `${colors.warning}80` }}
                thumbColor={interfered ? colors.warning : colors.mutedForeground}
              />
            </View>

            {interfered && (
              <View>
                <SectionLabel text="Interference Type" />
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(["CLOSED_EARLY", "MOVED_SL", "REVENGE", "OVERSIZE"] as InterferenceType[]).map(t => (
                    <OptionChip
                      key={t}
                      label={t.replace("_", " ")}
                      selected={interferenceType === t}
                      onPress={() => setInterferenceType(t)}
                      color={colors.warning}
                    />
                  ))}
                </View>
              </View>
            )}

            <View>
              <SectionLabel text="Post-trade notes" />
              <TextInput
                value={debriefNotes}
                onChangeText={setDebriefNotes}
                placeholder="What happened? What did you feel?"
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
            </View>

            <Button
              label="Submit Debrief"
              onPress={() => debriefMutation.mutate()}
              loading={debriefMutation.isPending}
              icon={<Icon name="check" size={14} color={colors.primaryForeground} />}
              fullWidth
            />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
});
