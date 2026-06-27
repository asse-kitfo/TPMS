import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Animated, TextInput, AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, EmptyState, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import {
  loadActiveTrade, saveActiveTrade, saveCompletedTrade, generateId,
  ActiveTrade, TradeCheckIn, CheckInState, nextCheckInTimestamp, TradeOutcomeLocal,
} from "@/lib/storage";

/* ── Check-in state definitions ─────────────────────────────────────────── */
const CHECK_IN_STATES: { key: CheckInState; emoji: string; label: string; color: string }[] = [
  { key: "CALM", emoji: "🙂", label: "Calm", color: "#22c55e" },
  { key: "WATCHING", emoji: "😐", label: "Watching closely", color: "#f59e0b" },
  { key: "URGE", emoji: "😬", label: "Urge to act", color: "#f97316" },
  { key: "ANXIOUS", emoji: "😰", label: "Anxious", color: "#ef4444" },
];

/* ── Box breathing 4-4-4-4 (60 seconds) ─────────────────────────────────── */
function BoxBreathing({ onComplete }: { onComplete: () => void }) {
  const colors = useColors();
  type Phase = "INHALE" | "HOLD_IN" | "EXHALE" | "HOLD_OUT";
  const PHASES: { phase: Phase; label: string; duration: number }[] = [
    { phase: "INHALE", label: "Breathe In", duration: 4 },
    { phase: "HOLD_IN", label: "Hold", duration: 4 },
    { phase: "EXHALE", label: "Breathe Out", duration: 4 },
    { phase: "HOLD_OUT", label: "Hold", duration: 4 },
  ];
  const TOTAL_SECONDS = 60;

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseTimer, setPhaseTimer] = useState(4);
  const [totalLeft, setTotalLeft] = useState(TOTAL_SECONDS);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const phase = PHASES[phaseIdx];
  const ringColor = phase.phase === "INHALE" ? "#3b82f6" : phase.phase === "HOLD_IN" ? "#22d3ee" : phase.phase === "EXHALE" ? "#22c55e" : "#a855f7";

  useEffect(() => {
    if (phase.phase === "INHALE") {
      animRef.current = Animated.timing(scaleAnim, { toValue: 1, duration: 4000, useNativeDriver: true });
    } else if (phase.phase === "EXHALE") {
      animRef.current = Animated.timing(scaleAnim, { toValue: 0.65, duration: 4000, useNativeDriver: true });
    } else {
      animRef.current = null;
    }
    animRef.current?.start();
    return () => animRef.current?.stop();
  }, [phaseIdx]);

  useEffect(() => {
    let pTimer = PHASES[0].duration;
    let pIdx = 0;
    let total = TOTAL_SECONDS;

    const interval = setInterval(() => {
      total -= 1;
      setTotalLeft(total);

      if (total <= 0) {
        clearInterval(interval);
        onComplete();
        return;
      }

      pTimer -= 1;
      setPhaseTimer(pTimer);
      if (pTimer <= 0) {
        pIdx = (pIdx + 1) % PHASES.length;
        pTimer = PHASES[pIdx].duration;
        setPhaseIdx(pIdx);
        setPhaseTimer(pTimer);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const progress = (TOTAL_SECONDS - totalLeft) / TOTAL_SECONDS;

  return (
    <View style={{ alignItems: "center", gap: 20, paddingVertical: 8 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
        Box breathing · {totalLeft}s remaining
      </Text>

      {/* Progress bar */}
      <View style={{ width: "100%", height: 3, backgroundColor: colors.secondary, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${progress * 100}%` as any, height: "100%", backgroundColor: ringColor, borderRadius: 2 }} />
      </View>

      <Animated.View style={{
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 3, borderColor: ringColor,
        backgroundColor: `${ringColor}18`,
        alignItems: "center", justifyContent: "center",
        transform: [{ scale: scaleAnim }],
      }}>
        <Text style={{ color: ringColor, fontSize: 32, fontFamily: "Inter_700Bold" }}>{phaseTimer}</Text>
        <Text style={{ color: ringColor, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{phase.label}</Text>
      </Animated.View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {PHASES.map((p, i) => (
          <View key={p.phase} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: phaseIdx === i ? `${ringColor}60` : "transparent", backgroundColor: phaseIdx === i ? `${ringColor}15` : "transparent" }}>
            <Text style={{ color: phaseIdx === i ? ringColor : colors.mutedForeground + "60", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
              {p.phase === "INHALE" ? "IN·4" : p.phase === "HOLD_IN" ? "HOLD·4" : p.phase === "EXHALE" ? "OUT·4" : "HOLD·4"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Countdown display ───────────────────────────────────────────────────── */
function formatCountdown(ms: number): string {
  if (ms <= 0) return "Now";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatElapsed(startIso: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ── Emotional timeline strip ────────────────────────────────────────────── */
function TimelineStrip({ checkIns }: { checkIns: TradeCheckIn[] }) {
  if (checkIns.length === 0) return null;
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {checkIns.map(ci => {
        const meta = CHECK_IN_STATES.find(s => s.key === ci.state)!;
        return (
          <View key={ci.id} style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────── */
type ScreenMode =
  | "IDLE"
  | "CHECK_IN"           // showing the 4 buttons
  | "CALM_LOGGED"        // brief confirm for calm
  | "WATCHING_ADVICE"    // one-liner for watching
  | "BREATHING"          // box breathing for urge/anxious
  | "POST_BREATHING"     // message after breathing
  | "CLOSE_TRADE";       // outcome logging

export default function InTradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [trade, setTrade] = useState<ActiveTrade | null>(null);
  const [mode, setMode] = useState<ScreenMode>("IDLE");
  const [lastState, setLastState] = useState<CheckInState | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [countdown, setCountdown] = useState("");
  const [outcome, setOutcome] = useState<TradeOutcomeLocal>("WIN");
  const [closingNote, setClosingNote] = useState("");
  const [closing, setClosing] = useState(false);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const loadTrade = useCallback(async () => {
    const t = await loadActiveTrade();
    setTrade(t);
  }, []);

  useFocusEffect(useCallback(() => {
    loadTrade();
    setMode("IDLE");
  }, [loadTrade]));

  /* Elapsed + countdown ticker */
  useEffect(() => {
    if (!trade) return;
    const tick = () => {
      setElapsed(formatElapsed(trade.startedAt));
      const msLeft = new Date(trade.nextCheckInAt).getTime() - Date.now();
      setCountdown(formatCountdown(msLeft));
      if (msLeft <= 0 && mode === "IDLE") {
        setMode("CHECK_IN");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [trade, mode]);

  /* AppState — re-check when app comes to foreground */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadTrade();
    });
    return () => sub.remove();
  }, []);

  async function handleCheckIn(state: CheckInState) {
    if (!trade) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLastState(state);

    const checkIn: TradeCheckIn = { id: generateId(), timestamp: new Date().toISOString(), state };
    const updated: ActiveTrade = {
      ...trade,
      checkIns: [...trade.checkIns, checkIn],
      nextCheckInAt: nextCheckInTimestamp(state),
    };
    await saveActiveTrade(updated);
    setTrade(updated);

    if (state === "CALM") {
      setMode("CALM_LOGGED");
      setTimeout(() => setMode("IDLE"), 2000);
    } else if (state === "WATCHING") {
      setMode("WATCHING_ADVICE");
    } else {
      setMode("BREATHING");
    }
  }

  function handleSOSPress() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLastState("URGE");
    setMode("BREATHING");
    const checkIn: TradeCheckIn = { id: generateId(), timestamp: new Date().toISOString(), state: "URGE" };
    if (trade) {
      const updated: ActiveTrade = {
        ...trade,
        checkIns: [...trade.checkIns, checkIn],
        nextCheckInAt: nextCheckInTimestamp("URGE"),
      };
      saveActiveTrade(updated);
      setTrade(updated);
    }
  }

  async function handleBreathingComplete() {
    setMode("POST_BREATHING");
  }

  async function handleCloseTrade() {
    if (!trade) return;
    setClosing(true);
    Haptics.notificationAsync(outcome === "WIN" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);

    await saveCompletedTrade({
      id: trade.id,
      startedAt: trade.startedAt,
      closedAt: new Date().toISOString(),
      pair: trade.pair,
      direction: trade.direction,
      invalidation: trade.invalidation,
      outcome,
      checkIns: trade.checkIns,
      note: closingNote.trim() || undefined,
    });

    await saveActiveTrade(null);
    setTrade(null);
    setMode("IDLE");
    setClosing(false);
    setClosingNote("");
    router.push("/(tabs)/journal");
  }

  /* ── Render ── */
  if (!trade) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Icon name="activity" size={40} color={colors.border} />}
          title="No trade open"
          subtitle="Use the Plan tab to log a trade before entering MT5"
        />
      </View>
    );
  }

  const lastCheckIn = trade.checkIns.length > 0 ? trade.checkIns[trade.checkIns.length - 1] : null;
  const lastStateMeta = lastCheckIn ? CHECK_IN_STATES.find(s => s.key === lastCheckIn.state) : null;
  const msLeft = new Date(trade.nextCheckInAt).getTime() - Date.now();
  const isDue = msLeft <= 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>In Trade</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            {trade.pair} · {trade.direction} · {elapsed}
          </Text>
        </View>
        {lastStateMeta && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: `${lastStateMeta.color}18`, borderWidth: 1, borderColor: `${lastStateMeta.color}40` }}>
            <Text style={{ fontSize: 18 }}>{lastStateMeta.emoji}</Text>
          </View>
        )}
      </View>

      {/* Invalidation condition */}
      <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20` }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
          Invalidation condition
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
          {trade.invalidation}
        </Text>
      </View>

      {/* Check-in overlay */}
      {mode === "CHECK_IN" && (
        <Card style={{ gap: 16 }}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" }}>
              Right now, how are you?
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" }}>
              One tap · two seconds
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {CHECK_IN_STATES.map(s => (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.8}
                onPress={() => handleCheckIn(s.key)}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: `${s.color}50`, backgroundColor: `${s.color}10` }}
              >
                <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                <Text style={{ color: s.color, fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* Calm logged */}
      {mode === "CALM_LOGGED" && (
        <View style={{ padding: 18, borderRadius: 12, backgroundColor: "#22c55e12", borderWidth: 1, borderColor: "#22c55e30", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 28 }}>🙂</Text>
          <Text style={{ color: "#22c55e", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Calm logged</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
            Next check-in in 10 minutes
          </Text>
        </View>
      )}

      {/* Watching advice */}
      {mode === "WATCHING_ADVICE" && (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 22 }}>😐</Text>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: "#f59e0b", fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 }}>
                Watching = wanting it to move.
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
                Let the plan work. Check again in 5.
              </Text>
            </View>
          </View>
          <Button label="Got it" onPress={() => setMode("IDLE")} fullWidth />
        </Card>
      )}

      {/* Box breathing */}
      {mode === "BREATHING" && (
        <Card style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 22 }}>{lastState === "ANXIOUS" ? "😰" : "😬"}</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 }}>
              60-second reset
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
            Box breathing (4-4-4-4). Don't touch MT5 until this completes.
          </Text>
          <BoxBreathing onComplete={handleBreathingComplete} />
        </Card>
      )}

      {/* Post-breathing message */}
      {mode === "POST_BREATHING" && (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 22 }}>{lastState === "ANXIOUS" ? "😰" : "😬"}</Text>
            <View style={{ flex: 1, gap: 8 }}>
              {lastState === "ANXIOUS" ? (
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22 }}>
                  Is this fear about{" "}
                  <Text style={{ fontFamily: "Inter_700Bold", color: "#ef4444" }}>this trade</Text>
                  {" "}— or about{" "}
                  <Text style={{ fontFamily: "Inter_700Bold", color: "#f97316" }}>money in general</Text>
                  {" "}right now?
                </Text>
              ) : (
                <>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22 }}>
                    What does your plan say?
                  </Text>
                  <View style={{ padding: 12, borderRadius: 8, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20` }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                      Your invalidation
                    </Text>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
                      {trade.invalidation}
                    </Text>
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                    Re-read it before touching anything in MT5.
                  </Text>
                </>
              )}
            </View>
          </View>
          <Button label="Back to monitoring" onPress={() => setMode("IDLE")} fullWidth />
        </Card>
      )}

      {/* Trade close form */}
      {mode === "CLOSE_TRADE" && (
        <Card style={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>Close Trade</Text>

          {/* Check-in timeline */}
          {trade.checkIns.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                Your emotional journey
              </Text>
              <TimelineStrip checkIns={trade.checkIns} />
            </View>
          )}

          <View>
            <SectionLabel text="Outcome" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([
                { key: "WIN" as TradeOutcomeLocal, label: "WIN", color: "#22c55e" },
                { key: "LOSS" as TradeOutcomeLocal, label: "LOSS", color: "#ef4444" },
                { key: "BE" as TradeOutcomeLocal, label: "B/E", color: "#71717a" },
              ]).map(o => (
                <TouchableOpacity
                  key={o.key}
                  activeOpacity={0.8}
                  onPress={() => { setOutcome(o.key); Haptics.selectionAsync(); }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: outcome === o.key ? o.color : colors.border, backgroundColor: outcome === o.key ? `${o.color}18` : colors.secondary }}
                >
                  <Text style={{ color: outcome === o.key ? o.color : colors.mutedForeground, fontSize: 15, fontFamily: "Inter_700Bold" }}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <SectionLabel text="Note (optional)" />
            <TextInput
              value={closingNote}
              onChangeText={setClosingNote}
              placeholder="What happened? What do you notice?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, minHeight: 72, textAlignVertical: "top", backgroundColor: colors.secondary }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Cancel" variant="ghost" onPress={() => setMode("IDLE")} style={{ flex: 1 }} />
            <Button label="Log & Close" onPress={handleCloseTrade} loading={closing} style={{ flex: 2 }} />
          </View>
        </Card>
      )}

      {/* Main idle panel — only when not in a special mode */}
      {(mode === "IDLE" || mode === "CALM_LOGGED") && (
        <View style={{ gap: 12 }}>
          {/* Next check-in countdown */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                  Next check-in
                </Text>
                <Text style={{ color: isDue ? colors.destructive : colors.foreground, fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 2 }}>
                  {isDue ? "Now" : countdown}
                </Text>
              </View>
              {trade.checkIns.length > 0 && (
                <TimelineStrip checkIns={trade.checkIns} />
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setMode("CHECK_IN"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}10` }}
            >
              <Icon name="check-square" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Check In Now</Text>
            </TouchableOpacity>
          </Card>

          {/* SOS button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSOSPress}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#f9731650", backgroundColor: "#f9731610" }}
          >
            <Icon name="alert-octagon" size={18} color="#f97316" />
            <View>
              <Text style={{ color: "#f97316", fontSize: 14, fontFamily: "Inter_700Bold" }}>I want to act</Text>
              <Text style={{ color: "#f97316" + "80", fontSize: 11, fontFamily: "Inter_400Regular" }}>
                Triggers breathing + plan review
              </Text>
            </View>
          </TouchableOpacity>

          {/* Trade closed */}
          {mode !== "CALM_LOGGED" && (
            <Button
              label="Trade Closed →"
              variant="ghost"
              onPress={() => setMode("CLOSE_TRADE")}
              icon={<Icon name="x-circle" size={14} color={colors.mutedForeground} />}
              fullWidth
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
