import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
  Animated, TextInput, AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import {
  loadActiveTrade, saveActiveTrade, saveCompletedTrade,
  incrementLossCount, generateId, nextCheckInTimestamp,
  loadCheckInInterval, computeWorstState,
  ActiveTrade, TradeCheckIn, CheckInState, TradeOutcome, CheckInIntervalBase,
} from "@/lib/storage";
import { scheduleCheckInNotification, cancelAllCheckInNotifications } from "@/lib/notifications";

/* ── Check-in states ─────────────────────────────────────────────────────── */
const STATES: { key: CheckInState; emoji: string; label: string; color: string }[] = [
  { key: "CALM",     emoji: "🙂", label: "Calm",            color: "#22c55e" },
  { key: "WATCHING", emoji: "😐", label: "Watching closely", color: "#f59e0b" },
  { key: "URGE",     emoji: "😬", label: "Urge to act",     color: "#f97316" },
  { key: "ANXIOUS",  emoji: "😰", label: "Anxious",         color: "#ef4444" },
];

/* ── Box Breathing 4-4-4-4, 60 seconds, haptic on each phase change ──────── */
type BreathPhase = "INHALE" | "HOLD_IN" | "EXHALE" | "HOLD_OUT";
const PHASES: { phase: BreathPhase; label: string; dur: number; toScale: number }[] = [
  { phase: "INHALE",   label: "Inhale",  dur: 4, toScale: 1 },
  { phase: "HOLD_IN",  label: "Hold",    dur: 4, toScale: 1 },
  { phase: "EXHALE",   label: "Exhale",  dur: 4, toScale: 0.65 },
  { phase: "HOLD_OUT", label: "Hold",    dur: 4, toScale: 0.65 },
];
const PHASE_COLORS: Record<BreathPhase, string> = {
  INHALE: "#3b82f6", HOLD_IN: "#22d3ee", EXHALE: "#22c55e", HOLD_OUT: "#a855f7",
};

function BoxBreathing({ onComplete }: { onComplete: () => void }) {
  const colors = useColors();
  const TOTAL = 60;
  const [pIdx, setPIdx] = useState(0);
  const [pTimer, setPTimer] = useState(PHASES[0].dur);
  const [totalLeft, setTotalLeft] = useState(TOTAL);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const phase = PHASES[pIdx];
  const color = PHASE_COLORS[phase.phase];

  // Animate circle on phase change + haptic
  useEffect(() => {
    animRef.current?.stop();
    animRef.current = Animated.timing(scaleAnim, {
      toValue: phase.toScale,
      duration: phase.dur * 1000,
      useNativeDriver: true,
    });
    animRef.current.start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return () => animRef.current?.stop();
  }, [pIdx]);

  // Master countdown
  useEffect(() => {
    let localTotal = TOTAL;
    let localPIdx = 0;
    let localPTimer = PHASES[0].dur;

    const id = setInterval(() => {
      localTotal -= 1;
      localPTimer -= 1;
      setTotalLeft(localTotal);
      if (localTotal <= 0) { clearInterval(id); onComplete(); return; }
      if (localPTimer <= 0) {
        localPIdx = (localPIdx + 1) % PHASES.length;
        localPTimer = PHASES[localPIdx].dur;
        setPIdx(localPIdx);
        setPTimer(PHASES[localPIdx].dur);
      } else {
        setPTimer(localPTimer);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const progress = (TOTAL - totalLeft) / TOTAL;

  return (
    <View style={{ alignItems: "center", gap: 16, paddingVertical: 4 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
        Box breathing (4-4-4-4) · {totalLeft}s
      </Text>
      <View style={{ width: "100%", height: 3, backgroundColor: colors.secondary, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${progress * 100}%` as any, height: "100%", backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Animated.View style={{
        width: 130, height: 130, borderRadius: 65,
        borderWidth: 3, borderColor: color, backgroundColor: `${color}18`,
        alignItems: "center", justifyContent: "center",
        transform: [{ scale: scaleAnim }],
      }}>
        <Text style={{ color, fontSize: 36, fontFamily: "Inter_700Bold" }}>{pTimer}</Text>
        <Text style={{ color, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 }}>{phase.label}</Text>
      </Animated.View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {PHASES.map((p, i) => (
          <View key={p.phase} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: pIdx === i ? `${PHASE_COLORS[p.phase]}60` : "transparent", backgroundColor: pIdx === i ? `${PHASE_COLORS[p.phase]}15` : "transparent" }}>
            <Text style={{ color: pIdx === i ? PHASE_COLORS[p.phase] : colors.mutedForeground + "50", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
              {p.label}·{p.dur}s
            </Text>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.mutedForeground + "80", fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>
        Do not touch MT5 until this completes
      </Text>
    </View>
  );
}

/* ── Countdown + elapsed helpers ─────────────────────────────────────────── */
function formatElapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
function formatCountdown(ms: number) {
  if (ms <= 0) return "Now";
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${(s % 60).toString().padStart(2, "0")}s`;
}

/* ── Emoji timeline strip ────────────────────────────────────────────────── */
function TimelineStrip({ checkIns }: { checkIns: TradeCheckIn[] }) {
  if (!checkIns.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
      {checkIns.map(ci => {
        const m = STATES.find(s => s.key === ci.state)!;
        return <Text key={ci.id} style={{ fontSize: 18 }}>{m.emoji}</Text>;
      })}
    </View>
  );
}

/* ── Screen mode type ────────────────────────────────────────────────────── */
type Mode = "IDLE" | "CHECK_IN" | "CALM_ACK" | "WATCHING_ADVICE" | "BREATHING" | "POST_BREATHING" | "CLOSE";

/* ── Main Screen ─────────────────────────────────────────────────────────── */
export default function InTradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [trade, setTrade] = useState<ActiveTrade | null>(null);
  const [mode, setMode] = useState<Mode>("IDLE");
  const [lastState, setLastState] = useState<CheckInState | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [countdown, setCountdown] = useState("");
  const [outcome, setOutcome] = useState<TradeOutcome>("win");
  const [closingNote, setClosingNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [baseInterval, setBaseInterval] = useState<CheckInIntervalBase>(5);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const reload = useCallback(async () => {
    const [t, b] = await Promise.all([loadActiveTrade(), loadCheckInInterval()]);
    setTrade(t);
    setBaseInterval(b);
    if (t && mode !== "IDLE") setMode("IDLE");
  }, []);

  useFocusEffect(useCallback(() => {
    reload();
    return () => {};
  }, [reload]));

  // Ticker: elapsed + countdown + auto-trigger check-in
  useEffect(() => {
    if (!trade) return;
    const tick = () => {
      setElapsed(formatElapsed(trade.startedAt));
      const ms = new Date(trade.nextCheckInAt).getTime() - Date.now();
      setCountdown(formatCountdown(ms));
      if (ms <= 0 && mode === "IDLE") {
        setMode("CHECK_IN");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trade, mode]);

  // Re-check when app foregrounds
  useEffect(() => {
    const sub = AppState.addEventListener("change", s => { if (s === "active") reload(); });
    return () => sub.remove();
  }, [reload]);

  /* ── Logging a check-in ── */
  async function logCheckIn(state: CheckInState, triggeredBy: "scheduled" | "manual_sos" = "scheduled") {
    if (!trade) return;

    const checkIn: TradeCheckIn = {
      id: generateId(),
      occurredAt: new Date().toISOString(),
      state,
      triggeredBy,
      breathingCompleted: false,
    };

    const updated: ActiveTrade = {
      ...trade,
      checkIns: [...trade.checkIns, checkIn],
      nextCheckInAt: nextCheckInTimestamp(state, baseInterval),
    };
    await saveActiveTrade(updated);
    setTrade(updated);

    // Schedule next notification
    await scheduleCheckInNotification(trade.id, state, baseInterval);

    return updated;
  }

  /* ── Mark last check-in's breathing as completed ── */
  async function markBreathingComplete(t: ActiveTrade) {
    if (!t.checkIns.length) return;
    const updated: ActiveTrade = {
      ...t,
      checkIns: t.checkIns.map((ci, i) =>
        i === t.checkIns.length - 1 ? { ...ci, breathingCompleted: true } : ci
      ),
    };
    await saveActiveTrade(updated);
    setTrade(updated);
    return updated;
  }

  /* ── Handle check-in tap ── */
  async function handleCheckIn(state: CheckInState) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLastState(state);
    const updated = await logCheckIn(state, "scheduled");

    if (state === "CALM") {
      setMode("CALM_ACK");
      setTimeout(() => setMode("IDLE"), 2000);
    } else if (state === "WATCHING") {
      setMode("WATCHING_ADVICE");
    } else {
      // URGE or ANXIOUS → breathing
      setMode("BREATHING");
    }
  }

  /* ── SOS button — goes straight to breathing, skips check-in modal ── */
  async function handleSOS() {
    if (!trade) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLastState("URGE");

    // Increment SOS tap count
    const updated: ActiveTrade = {
      ...trade,
      sosTapCount: (trade.sosTapCount ?? 0) + 1,
    };
    await saveActiveTrade(updated);
    setTrade(updated);

    // Log the check-in as manual SOS
    await logCheckIn("URGE", "manual_sos");
    setMode("BREATHING");
  }

  /* ── Breathing complete ── */
  async function handleBreathingComplete() {
    const current = trade;
    if (current) {
      const updated = await markBreathingComplete(current);
      if (updated) setTrade(updated);
    }
    setMode("POST_BREATHING");
  }

  /* ── Close trade ── */
  async function handleCloseTrade() {
    if (!trade) return;
    setClosing(true);
    Haptics.notificationAsync(outcome === "win" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);

    await cancelAllCheckInNotifications();

    const worstState = computeWorstState(trade.checkIns);

    await saveCompletedTrade({
      id: trade.id,
      startedAt: trade.startedAt,
      closedAt: new Date().toISOString(),
      asset: trade.asset,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
      invalidationCondition: trade.invalidationCondition,
      outcome,
      worstStateDuringTrade: worstState,
      sosTapCount: trade.sosTapCount,
      checkIns: trade.checkIns,
      postTradeNote: closingNote.trim() || undefined,
    });

    if (outcome === "loss") {
      await incrementLossCount();
    }

    await saveActiveTrade(null);
    setTrade(null);
    setMode("IDLE");
    setClosing(false);
    setClosingNote("");
    router.push("/(tabs)/journal");
  }

  /* ── No trade open ── */
  if (!trade) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }}>
        <Icon name="activity" size={40} color={colors.border} />
        <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" }}>No trade open</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 }}>
          Use the Plan tab to log a trade before entering MT5
        </Text>
        <Button label="Log a trade" onPress={() => router.push("/(tabs)/gate")} />
      </View>
    );
  }

  const isDue = new Date(trade.nextCheckInAt).getTime() - Date.now() <= 0;
  const lastCI = trade.checkIns[trade.checkIns.length - 1];
  const lastMeta = lastCI ? STATES.find(s => s.key === lastCI.state) : null;

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
            {trade.asset} · {trade.direction.toUpperCase()} · {elapsed}
          </Text>
        </View>
        {lastMeta && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: `${lastMeta.color}18`, borderWidth: 1, borderColor: `${lastMeta.color}40` }}>
            <Text style={{ fontSize: 20 }}>{lastMeta.emoji}</Text>
          </View>
        )}
      </View>

      {/* Invalidation — always visible */}
      <View style={{ padding: 14, borderRadius: 12, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}25` }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
          Invalidation condition
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 }}>
          {trade.invalidationCondition}
        </Text>
      </View>

      {/* ── Check-in overlay ── */}
      {mode === "CHECK_IN" && (
        <Card style={{ gap: 16 }}>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_700Bold" }}>Right now:</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>One tap · two seconds</Text>
          </View>
          <View style={{ gap: 10 }}>
            {STATES.map(s => (
              <TouchableOpacity
                key={s.key} activeOpacity={0.8}
                onPress={() => handleCheckIn(s.key)}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: `${s.color}50`, backgroundColor: `${s.color}10` }}
              >
                <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
                <Text style={{ color: s.color, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* ── Calm acknowledged ── */}
      {mode === "CALM_ACK" && (
        <View style={{ padding: 18, borderRadius: 12, backgroundColor: "#22c55e12", borderWidth: 1, borderColor: "#22c55e30", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 32 }}>🙂</Text>
          <Text style={{ color: "#22c55e", fontSize: 15, fontFamily: "Inter_700Bold" }}>Calm — logged</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
            Next check-in in {baseInterval * 2} minutes
          </Text>
        </View>
      )}

      {/* ── Watching advice ── */}
      {mode === "WATCHING_ADVICE" && (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 26 }}>😐</Text>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: "#f59e0b", fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 }}>
                Watching closely usually means wanting it to move.
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                Let the plan work.
              </Text>
            </View>
          </View>
          <Button label="Got it" onPress={() => setMode("IDLE")} fullWidth />
        </Card>
      )}

      {/* ── Box breathing ── */}
      {mode === "BREATHING" && (
        <Card style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 24 }}>{lastState === "ANXIOUS" ? "😰" : "😬"}</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 }}>
              60-second reset
            </Text>
          </View>
          <BoxBreathing onComplete={handleBreathingComplete} />
        </Card>
      )}

      {/* ── Post-breathing ── */}
      {mode === "POST_BREATHING" && (
        <Card style={{ gap: 14 }}>
          {lastState === "ANXIOUS" ? (
            <>
              <Text style={{ fontSize: 26 }}>😰</Text>
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 24 }}>
                Is this fear about{" "}
                <Text style={{ fontFamily: "Inter_700Bold", color: "#ef4444" }}>this specific trade</Text>
                {" "}— or about{" "}
                <Text style={{ fontFamily: "Inter_700Bold", color: "#f97316" }}>money in general</Text>
                {" "}right now?
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                No input needed. Just sit with that question. Then decide.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 26 }}>😬</Text>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20` }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Your invalidation condition
                </Text>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 }}>
                  {trade.invalidationCondition}
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 21 }}>
                Has this actually happened?{" "}
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                  If not, do nothing.
                </Text>
              </Text>
            </>
          )}
          <Button label="Back to monitoring" onPress={() => setMode("IDLE")} fullWidth />
        </Card>
      )}

      {/* ── Trade close form ── */}
      {mode === "CLOSE" && (
        <Card style={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>Close Trade</Text>

          {trade.checkIns.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                Your emotional journey this trade
              </Text>
              <TimelineStrip checkIns={trade.checkIns} />
            </View>
          )}

          <View>
            <SectionLabel text="Outcome" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([
                { key: "win" as TradeOutcome, label: "Win", color: "#22c55e" },
                { key: "loss" as TradeOutcome, label: "Loss", color: "#ef4444" },
                { key: "breakeven" as TradeOutcome, label: "B/E", color: "#71717a" },
              ]).map(o => (
                <TouchableOpacity
                  key={o.key} activeOpacity={0.8}
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
              value={closingNote} onChangeText={setClosingNote}
              placeholder="What happened? What do you notice?"
              placeholderTextColor={colors.mutedForeground}
              multiline numberOfLines={3}
              style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, minHeight: 72, textAlignVertical: "top", backgroundColor: colors.secondary }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Cancel" variant="ghost" onPress={() => setMode("IDLE")} style={{ flex: 1 }} />
            <Button label="Log & Close" onPress={handleCloseTrade} loading={closing} style={{ flex: 2 }} />
          </View>
        </Card>
      )}

      {/* ── Idle panel ── */}
      {(mode === "IDLE" || mode === "CALM_ACK") && (
        <View style={{ gap: 12 }}>
          {/* Countdown card */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                  Next check-in
                </Text>
                <Text style={{ color: isDue ? colors.destructive : colors.foreground, fontSize: 30, fontFamily: "Inter_700Bold", marginTop: 2 }}>
                  {isDue ? "Now" : countdown}
                </Text>
              </View>
              {trade.checkIns.length > 0 && <TimelineStrip checkIns={trade.checkIns} />}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setMode("CHECK_IN"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}10` }}
            >
              <Icon name="check-square" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Check In Now</Text>
            </TouchableOpacity>
          </Card>

          {/* SOS */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSOS}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 16, borderRadius: 14, borderWidth: 2, borderColor: "#f9731650", backgroundColor: "#f9731610" }}
          >
            <Icon name="alert-octagon" size={20} color="#f97316" />
            <View>
              <Text style={{ color: "#f97316", fontSize: 15, fontFamily: "Inter_700Bold" }}>I want to act</Text>
              <Text style={{ color: "#f97316" + "70", fontSize: 11, fontFamily: "Inter_400Regular" }}>
                Breathing + invalidation check — no check-in modal
              </Text>
            </View>
          </TouchableOpacity>

          {/* SOS tap count */}
          {(trade.sosTapCount ?? 0) > 0 && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" }}>
              {trade.sosTapCount} SOS tap{trade.sosTapCount !== 1 ? "s" : ""} this trade
            </Text>
          )}

          {/* Trade closed */}
          {mode !== "CALM_ACK" && (
            <Button
              label="Trade Closed →"
              variant="ghost"
              onPress={() => setMode("CLOSE")}
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
