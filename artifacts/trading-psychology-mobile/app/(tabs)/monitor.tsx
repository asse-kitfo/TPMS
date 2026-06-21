import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
  Animated,
  TouchableOpacity,
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

const PAUSE_QUESTIONS = [
  "Is this truly an A+ setup — or am I rationalizing?",
  "Have I run the Gate check for this setup?",
  "Is my stop loss defined and non-negotiable?",
  "Would I take this trade if I hadn't just had a loss?",
  "Am I in a calm, analytical state right now?",
];

const EMOTIONAL_STATES = [
  { id: "CALM", label: "Calm", color: "#22c55e" },
  { id: "FOCUSED", label: "Focused", color: "#22d3ee" },
  { id: "ANXIOUS", label: "Anxious", color: "#f97316" },
  { id: "PRESSURED", label: "Pressured", color: "#f59e0b" },
  { id: "OVERCONFIDENT", label: "Overconfident", color: "#a855f7" },
  { id: "URGE", label: "Urge-Driven", color: "#ef4444" },
];

const POST_TRADE_EMOTIONS = [
  { id: "CALM", label: "Calm", color: "#22c55e" },
  { id: "RELIEVED", label: "Relieved", color: "#22d3ee" },
  { id: "DISAPPOINTED", label: "Disappointed", color: "#6366f1" },
  { id: "ANGRY", label: "Angry", color: "#ef4444" },
  { id: "EXCITED", label: "Excited", color: "#eab308" },
  { id: "NEUTRAL", label: "Neutral", color: "#71717a" },
  { id: "URGE_REVENGE", label: "Urge to Revenge", color: "#ef4444" },
];

function PauseProtocol({ onComplete, onCancel }: { onComplete: (emotionState: string) => void; onCancel: () => void }) {
  const colors = useColors();
  const [countdown, setCountdown] = useState(20);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [emotionState, setEmotionState] = useState("CALM");
  const [pauseComplete, setPauseComplete] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: 1, duration: 20000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setPauseComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        if ((20 - c + 1) % 4 === 0) {
          setQuestionIdx(q => (q + 1) % PAUSE_QUESTIONS.length);
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: countdown > 0 ? "#f59e0b" : "#22c55e" }} />
        <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
          {countdown > 0 ? `Mandatory Pause — ${countdown}s` : "Pause Complete"}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: colors.secondary, borderRadius: 2, overflow: "hidden" }}>
        <Animated.View style={{ height: "100%", width: progressWidth, backgroundColor: pauseComplete ? "#22c55e" : "#f59e0b", borderRadius: 2 }} />
      </View>

      {/* Rotating question */}
      {!pauseComplete && (
        <View style={{ padding: 14, borderRadius: 10, backgroundColor: "#f59e0b08", borderWidth: 1, borderColor: "#f59e0b20", minHeight: 72, justifyContent: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Reflect on this
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22 }}>
            {PAUSE_QUESTIONS[questionIdx]}
          </Text>
        </View>
      )}

      {/* Emotion state after pause */}
      {pauseComplete && (
        <View style={{ gap: 10 }}>
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: "#22c55e10", borderWidth: 1, borderColor: "#22c55e30" }}>
            <Text style={{ color: "#22c55e", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
              Pause complete. How is your emotional state right now?
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EMOTIONAL_STATES.map(e => (
              <TouchableOpacity
                key={e.id} activeOpacity={0.8} onPress={() => { setEmotionState(e.id); Haptics.selectionAsync(); }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: emotionState === e.id ? e.color : colors.border, backgroundColor: emotionState === e.id ? `${e.color}18` : colors.secondary }}
              >
                <Text style={{ color: emotionState === e.id ? e.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(emotionState === "URGE" || emotionState === "ANXIOUS") && (
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: "#ef444410", borderWidth: 1, borderColor: "#ef444430" }}>
              <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 }}>
                High-risk state detected
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                You are in a {emotionState === "URGE" ? "compulsive urge" : "anxious"} state. Run the Gate check first. Consider 4-7-8 breathing before this trade.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <Button label="Lock In Trade →" onPress={() => onComplete(emotionState)} style={{ flex: 2 }} />
          </View>
        </View>
      )}

      {!pauseComplete && (
        <TouchableOpacity onPress={onCancel} style={{ alignItems: "center", paddingVertical: 4 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>Cancel</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [pair, setPair] = useState("EUR/USD");
  const [grade, setGrade] = useState<SetupGrade>("A_PLUS");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [showPause, setShowPause] = useState(false);
  const [entryEmotionState, setEntryEmotionState] = useState("");

  const [outcome, setOutcome] = useState<TradeOutcome>("WIN");
  const [followedPlan, setFollowedPlan] = useState(true);
  const [interfered, setInterfered] = useState(false);
  const [interferenceType, setInterferenceType] = useState<InterferenceType>("CLOSED_EARLY");
  const [postTradeEmotion, setPostTradeEmotion] = useState("NEUTRAL");
  const [debriefNotes, setDebriefNotes] = useState("");

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (emotionAtEntry: string) => {
      if (!session) throw new Error("No session");
      return api.createTrade({
        sessionId: session.id, pair, setupGrade: grade, direction,
        notes: emotionAtEntry ? `Entry state: ${emotionAtEntry}` : undefined,
      });
    },
    onSuccess: (trade) => {
      setActiveTrade(trade);
      setShowPause(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
  });

  const debriefMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrade) throw new Error("No active trade");
      return api.updateTrade(activeTrade.id, {
        outcome, followedPlan, interfered,
        interferenceType: interfered ? interferenceType : undefined,
        emotionalState: postTradeEmotion,
        notes: [debriefNotes, postTradeEmotion ? `Post-trade state: ${postTradeEmotion}` : ""].filter(Boolean).join(" | ") || undefined,
        closedAt: new Date().toISOString(),
      });
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(data.outcome === "WIN" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["session"] });
      setActiveTrade(null);
      setDebriefNotes(""); setInterfered(false); setFollowedPlan(true);
      setPostTradeEmotion("NEUTRAL"); setEntryEmotionState("");
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
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Active Monitor</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          Lock in before entry · debrief after close
        </Text>
      </View>

      {!activeTrade ? (
        showPause ? (
          <PauseProtocol
            onComplete={(emotionState) => { setEntryEmotionState(emotionState); lockMutation.mutate(emotionState); }}
            onCancel={() => setShowPause(false)}
          />
        ) : (
          <View style={{ gap: 16 }}>
            {/* Pre-trade info banner */}
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20`, flexDirection: "row", gap: 10 }}>
              <Icon name="info" size={14} color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 }}>
                Lock in your trade BEFORE entry. This creates accountability and a pre-commitment record. A 20-second pause will follow to prevent impulsive execution.
              </Text>
            </View>

            <Card style={{ gap: 16 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Lock In Trade</Text>

              <View>
                <SectionLabel text="Pair" />
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {PAIRS.map(p => <OptionChip key={p} label={p} selected={pair === p} onPress={() => setPair(p)} />)}
                </View>
              </View>

              <View>
                <SectionLabel text="Grade" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {GRADES.map(g => <OptionChip key={g} label={GRADE_LABELS[g]} selected={grade === g} onPress={() => setGrade(g)} />)}
                </View>
              </View>

              <View>
                <SectionLabel text="Direction" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <OptionChip label="LONG ↑" selected={direction === "LONG"} onPress={() => setDirection("LONG")} color={colors.success} />
                  <OptionChip label="SHORT ↓" selected={direction === "SHORT"} onPress={() => setDirection("SHORT")} color={colors.destructive} />
                </View>
              </View>

              {grade === "C" && (
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: "#ef444410", borderWidth: 1, borderColor: "#ef444430" }}>
                  <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>C-grade setup</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
                    Are you sure? C-grade setups have poor expectancy over time. Run the Gate check first.
                  </Text>
                </View>
              )}

              <Button
                label="Begin Pre-Trade Pause"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPause(true); }}
                loading={lockMutation.isPending}
                icon={<Icon name="pause-circle" size={14} color={colors.primaryForeground} />}
                fullWidth
              />
            </Card>
          </View>
        )
      ) : (
        <View style={{ gap: 12 }}>
          {/* Active trade banner */}
          <View style={[styles.activeBanner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: 16, fontFamily: "Inter_700Bold" }}>
                {activeTrade.pair} — {GRADE_LABELS[activeTrade.setupGrade]} — {activeTrade.direction}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                Locked {new Date(activeTrade.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {entryEmotionState ? ` · Entry: ${entryEmotionState}` : ""}
              </Text>
            </View>
          </View>

          <View style={{ padding: 10, borderRadius: 8, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 10 }}>
            <Icon name="eye" size={13} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 }}>
              Trade is live. Do not interfere. When it closes, return here to debrief.
            </Text>
          </View>

          {/* Debrief */}
          <Card style={{ gap: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Debrief</Text>

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
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Executed exactly as planned?</Text>
              </View>
              <Switch
                value={followedPlan} onValueChange={setFollowedPlan}
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
                value={interfered} onValueChange={setInterfered}
                trackColor={{ false: colors.border, true: `${colors.warning}80` }}
                thumbColor={interfered ? colors.warning : colors.mutedForeground}
              />
            </View>

            {interfered && (
              <View>
                <SectionLabel text="Interference Type" />
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(["CLOSED_EARLY", "MOVED_SL", "REVENGE", "OVERSIZE"] as InterferenceType[]).map(t => (
                    <OptionChip key={t} label={t.replace("_", " ")} selected={interferenceType === t} onPress={() => setInterferenceType(t)} color={colors.warning} />
                  ))}
                </View>
              </View>
            )}

            {/* Post-trade emotional state — key Rande Howell data point */}
            <View>
              <SectionLabel text="Post-Trade Emotional State" />
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 16 }}>
                Tracking post-trade emotion reveals emotional patterns. Revenge urge after a loss = amygdala hijack risk.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {POST_TRADE_EMOTIONS.map(e => (
                  <TouchableOpacity
                    key={e.id} activeOpacity={0.8} onPress={() => { setPostTradeEmotion(e.id); Haptics.selectionAsync(); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: postTradeEmotion === e.id ? e.color : colors.border, backgroundColor: postTradeEmotion === e.id ? `${e.color}18` : colors.secondary }}
                  >
                    <Text style={{ color: postTradeEmotion === e.id ? e.color : colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{e.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {postTradeEmotion === "URGE_REVENGE" && (
                <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "#ef444410", borderWidth: 1, borderColor: "#ef444430" }}>
                  <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Revenge urge detected</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
                    Do not open another trade. Go to Hub → SOS protocol, or do 3 cycles of 4-7-8 breathing. Wait at least 20 minutes.
                  </Text>
                </View>
              )}
            </View>

            <View>
              <SectionLabel text="Post-trade notes" />
              <TextInput
                value={debriefNotes} onChangeText={setDebriefNotes}
                placeholder="What happened? What did you feel during this trade?"
                placeholderTextColor={colors.mutedForeground}
                multiline numberOfLines={3}
                style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, minHeight: 72, textAlignVertical: "top", backgroundColor: colors.secondary }}
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
  activeBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
});
