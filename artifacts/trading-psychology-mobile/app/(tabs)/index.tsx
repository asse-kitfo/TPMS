import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Session } from "@/lib/api";
import { loadMaxLosses, saveMaxLosses, addEmotionEntry, loadEmotionLog, EmotionLogEntry } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Badge, SectionLabel, webTop, webBottom } from "@/components/UI";
import { HijackProtocol } from "@/components/HijackProtocol";
import { useFocusEffect } from "expo-router";

const PSYCH_STATES = [
  { key: "CALM", label: "Calm", color: "#22c55e", desc: "Clear head, no emotional pull", risk: 0 },
  { key: "FOCUSED", label: "Focused", color: "#22d3ee", desc: "Locked in, methodical", risk: 0 },
  { key: "PRESSURE", label: "Pressure", color: "#f59e0b", desc: "Need to recover, feeling urgency", risk: 2 },
  { key: "FEAR", label: "Fear", color: "#f97316", desc: "Hesitating, second-guessing", risk: 2 },
  { key: "OVERCONFIDENT", label: "Overconfident", color: "#ef4444", desc: "Too sure, ignoring risk", risk: 3 },
  { key: "URGE", label: "Urge", color: "#ef4444", desc: "Strong pull to trade now — survival brain active", risk: 3 },
];

const RANDE_STATE_COACHING: Record<string, string> = {
  CALM: "Trader state. The prefrontal cortex is online. Execute with precision.",
  FOCUSED: "Optimal. Clear observation, zero emotional interference.",
  PRESSURE: "The survival brain is signalling threat. The need to recover distorts perception of risk.",
  FEAR: "Amygdala activation detected. Fear of loss is more painful than loss itself to the emotional brain.",
  OVERCONFIDENT: "Dopamine surge. The reward circuit is rationalising edges that don't exist.",
  URGE: "Compulsive state. The urge to trade IS the signal to not trade.",
};

function formatElapsed(startIso: string) {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function PsychSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useColors();
  return (
    <View>
      <SectionLabel text="Current State" />
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {PSYCH_STATES.map(s => {
          const isSelected = value === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => onChange(s.key)}
              activeOpacity={0.8}
              style={{
                marginRight: 8, marginBottom: 8,
                paddingHorizontal: 12, paddingVertical: 8,
                borderRadius: 10, borderWidth: 1.5,
                borderColor: isSelected ? s.color : colors.border,
                backgroundColor: isSelected ? `${s.color}18` : colors.secondary,
              }}
            >
              <Text style={{ color: isSelected ? s.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function EmotionTimeline({ entries }: { entries: EmotionLogEntry[] }) {
  const colors = useColors();
  if (entries.length === 0) return null;
  const recent = entries.slice(0, 6);

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel text="State Log" />
      {recent.map((entry, i) => {
        const state = PSYCH_STATES.find(s => s.key === entry.state);
        const isLatest = i === 0;
        return (
          <View key={entry.id} style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            paddingVertical: 6, paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isLatest ? `${state?.color ?? colors.primary}10` : "transparent",
            borderWidth: isLatest ? 1 : 0,
            borderColor: `${state?.color ?? colors.primary}30`,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: state?.color ?? colors.mutedForeground }} />
            <Text style={{ color: state?.color ?? colors.foreground, fontSize: 12, fontFamily: "Inter_600SemiBold", width: 90 }}>
              {state?.label ?? entry.state}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 }}>
              {formatTime(entry.timestamp)}
            </Text>
            {isLatest && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${state?.color ?? colors.primary}20` }}>
                <Text style={{ color: state?.color ?? colors.primary, fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>NOW</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function SessionActive({
  session, maxLosses, onEnd, onSOS, emotionLog,
  currentState, onLogState,
}: {
  session: Session; maxLosses: number; onEnd: () => void; onSOS: () => void;
  emotionLog: EmotionLogEntry[]; currentState: string; onLogState: () => void;
}) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(formatElapsed(session.createdAt));
  const lossRatio = session.lossCount / maxLosses;
  const lossColor = lossRatio === 0 ? colors.success : lossRatio < 1 ? colors.warning : colors.destructive;
  const hitLimit = session.lossCount >= maxLosses;
  const nearLimit = session.lossCount >= maxLosses - 1 && !hitLimit;
  const state = PSYCH_STATES.find(s => s.key === currentState);
  const isHighRisk = (state?.risk ?? 0) >= 2;
  const dangerZone = (hitLimit || nearLimit) && isHighRisk;

  useEffect(() => {
    const interval = setInterval(() => setElapsed(formatElapsed(session.createdAt)), 1000);
    return () => clearInterval(interval);
  }, [session.createdAt]);

  return (
    <View style={{ gap: 12 }}>
      {hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}>
          <Icon name="alert-octagon" size={16} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            CIRCUIT BREAKER — Loss limit hit. End session now.
          </Text>
        </View>
      )}

      {dangerZone && !hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: "#f97316" + "18", borderColor: "#f97316" }]}>
          <Icon name="alert-triangle" size={16} color="#f97316" />
          <Text style={{ color: "#f97316", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            Danger Zone — {state?.label} state + {session.lossCount} loss{session.lossCount !== 1 ? "es" : ""}. Survival brain risk is elevated.
          </Text>
        </View>
      )}

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Session Active</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>{elapsed}</Text>
            <Badge label={`Loss ${session.lossCount}/${maxLosses}`} color={lossColor} bg={`${lossColor}18`} size="md" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Losses</Text>
            <Text style={{ color: lossColor, fontSize: 22, fontFamily: "Inter_700Bold" }}>{session.lossCount}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Breaks</Text>
            <Text style={{ color: session.ruleBreaks > 0 ? colors.warning : colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>{session.ruleBreaks}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Mode</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{session.mode}</Text>
          </View>
        </View>

        {/* State check-in row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onLogState(); }}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
              borderColor: `${state?.color ?? colors.primary}50`,
              backgroundColor: `${state?.color ?? colors.primary}12`,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: state?.color ?? colors.primary }} />
            <Text style={{ color: state?.color ?? colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
              Log: {state?.label ?? currentState}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onSOS(); }}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
              borderColor: "#ef444450", backgroundColor: "#ef444415",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="alert-octagon" size={14} color="#ef4444" />
            <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_700Bold" }}>SOS</Text>
          </TouchableOpacity>
        </View>

        <Button label="End Session" variant="ghost" onPress={onEnd} icon={<Icon name="power" size={14} color={colors.destructive} />} />
      </Card>
    </View>
  );
}

function BreathingWidget() {
  const colors = useColors();
  const [phase, setPhase] = useState<"IDLE" | "INHALE" | "HOLD" | "EXHALE">("IDLE");
  const [timer, setTimer] = useState(0);
  const [cycles, setCycles] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (phase === "IDLE") {
      Animated.timing(scaleAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }).start();
      return;
    }
    const PHASES = [
      { phase: "INHALE" as const, duration: 4 },
      { phase: "HOLD" as const, duration: 7 },
      { phase: "EXHALE" as const, duration: 8 },
    ];
    let phaseIdx = PHASES.findIndex(p => p.phase === phase);
    if (phaseIdx < 0) phaseIdx = 0;
    let remaining = PHASES[phaseIdx].duration;
    setTimer(remaining);

    if (phase === "INHALE") Animated.timing(scaleAnim, { toValue: 1, duration: 4000, useNativeDriver: true }).start();
    else if (phase === "EXHALE") Animated.timing(scaleAnim, { toValue: 0.65, duration: 8000, useNativeDriver: true }).start();

    const interval = setInterval(() => {
      remaining -= 1;
      setTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) setCycles(c => c + 1);
        remaining = PHASES[phaseIdx].duration;
        setPhase(PHASES[phaseIdx].phase);
        setTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const phaseLabel = phase === "INHALE" ? "Breathe In" : phase === "HOLD" ? "Hold" : phase === "EXHALE" ? "Breathe Out" : "";
  const ringColor = phase === "INHALE" ? "#3b82f6" : phase === "HOLD" ? colors.primary : phase === "EXHALE" ? "#22c55e" : colors.border;

  return (
    <View style={{ gap: 12 }}>
      <SectionLabel text="4-7-8 Breathing Reset" />
      <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#3b82f620", backgroundColor: "#3b82f608" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 12 }}>
          Activates the parasympathetic nervous system. Lowers cortisol. Re-engages the prefrontal cortex. Use before every session and when you feel activated.
        </Text>
        {phase === "IDLE" ? (
          <TouchableOpacity
            onPress={() => { setCycles(0); setPhase("INHALE"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{ borderWidth: 1.5, borderColor: "#3b82f640", backgroundColor: "#3b82f610", borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <Icon name="wind" size={16} color="#3b82f6" />
            <Text style={{ color: "#3b82f6", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Begin Breathing Reset</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: "center", gap: 16 }}>
            <Animated.View style={{
              width: 100, height: 100, borderRadius: 50,
              borderWidth: 3, borderColor: ringColor, backgroundColor: `${ringColor}18`,
              alignItems: "center", justifyContent: "center", transform: [{ scale: scaleAnim }],
            }}>
              <Text style={{ color: ringColor, fontSize: 28, fontFamily: "Inter_700Bold" }}>{timer}</Text>
              <Text style={{ color: ringColor, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>{phaseLabel}</Text>
            </Animated.View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["INHALE", "HOLD", "EXHALE"] as const).map(p => (
                <View key={p} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: phase === p ? `${ringColor}60` : "transparent", backgroundColor: phase === p ? `${ringColor}15` : "transparent" }}>
                  <Text style={{ color: phase === p ? ringColor : colors.mutedForeground + "60", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                    {p === "INHALE" ? "IN · 4s" : p === "HOLD" ? "HOLD · 7s" : "OUT · 8s"}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                {cycles} {cycles === 1 ? "cycle" : "cycles"}{cycles >= 3 ? " — cortex re-engaged" : ""}
              </Text>
              <TouchableOpacity onPress={() => { setPhase("IDLE"); setCycles(0); }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function StatsRow() {
  const colors = useColors();
  const { data: stats } = useQuery({ queryKey: ["stats-summary"], queryFn: api.getStatsSummary });
  const { data: streak } = useQuery({ queryKey: ["discipline-streak"], queryFn: api.getDisciplineStreak });
  if (!stats) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel text="All-time stats" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { label: "Trades", value: String(stats.totalTrades), color: colors.foreground },
          { label: "Win Rate", value: `${(stats.winRate * 100).toFixed(0)}%`, color: colors.success },
          { label: "Streak", value: String(streak?.currentStreak ?? 0), color: colors.primary },
          { label: "Plan %", value: `${(stats.planFollowRate * 100).toFixed(0)}%`, color: colors.primary },
        ].map(item => (
          <View key={item.label} style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 20, fontFamily: "Inter_700Bold" }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [maxLosses, setMaxLosses] = useState(2);
  const [psychState, setPsychState] = useState("CALM");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [emotionLog, setEmotionLog] = useState<EmotionLogEntry[]>([]);
  const [hijackVisible, setHijackVisible] = useState(false);
  const [hijackReason, setHijackReason] = useState("");

  const { data: session, isLoading, refetch } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
    refetchInterval: 10000,
  });

  useEffect(() => { loadMaxLosses().then(setMaxLosses); }, []);

  useFocusEffect(useCallback(() => {
    if (session?.id) loadEmotionLog(session.id).then(setEmotionLog);
  }, [session?.id]));

  useEffect(() => {
    if (session?.id) loadEmotionLog(session.id).then(setEmotionLog);
  }, [session?.id]);

  const startMutation = useMutation({
    mutationFn: () => api.startSession(),
    onSuccess: async (newSession) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["session"] });
      const entries = await addEmotionEntry(newSession.id, psychState);
      setEmotionLog(entries);
    },
  });

  const endMutation = useMutation({
    mutationFn: () => api.updateSession(session!.id, { endedAt: new Date().toISOString() }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["session"] });
      setConfirmEnd(false);
      setEmotionLog([]);
    },
  });

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startMutation.mutate();
  };

  const handleEnd = () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return; }
    endMutation.mutate();
  };

  const handleLogState = async () => {
    if (!session) return;
    Haptics.selectionAsync();
    const entries = await addEmotionEntry(session.id, psychState);
    setEmotionLog(entries);
  };

  const handleSOS = () => {
    const state = PSYCH_STATES.find(s => s.key === psychState);
    const lossContext = session ? `${session.lossCount} loss${session.lossCount !== 1 ? "es" : ""} in session` : "";
    setHijackReason(`${state?.label ?? psychState} state${lossContext ? ` — ${lossContext}` : ""}.`);
    setHijackVisible(true);
  };

  const handleHijackClose = (decision: string | null) => {
    setHijackVisible(false);
    if (decision === "END_SESSION" && session) {
      endMutation.mutate();
    } else if (decision === "STEP_AWAY") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;
  const selectedState = PSYCH_STATES.find(s => s.key === psychState);
  const isActive = session && !session.endedAt;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
        refreshControl={undefined}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>
            APEX<Text style={{ color: colors.foreground }}>TERM</Text>
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 }}>
            Psychology Hub
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            Check in before the market opens
          </Text>
        </View>

        {/* Psych state selector */}
        <Card>
          <PsychSelector value={psychState} onChange={setPsychState} />
          {selectedState && (
            <>
              <View style={[styles.stateDesc, { backgroundColor: `${selectedState.color}10`, borderColor: `${selectedState.color}30` }]}>
                <Text style={{ color: selectedState.color, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                  {selectedState.desc}
                </Text>
              </View>
              {selectedState.risk >= 2 && (
                <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: `${selectedState.color}08`, borderWidth: 1, borderColor: `${selectedState.color}20` }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, fontStyle: "italic" }}>
                    "{RANDE_STATE_COACHING[selectedState.key]}"
                  </Text>
                </View>
              )}
            </>
          )}
        </Card>

        {/* Session panel */}
        <View>
          <SectionLabel text="Trading Session" />
          {isActive ? (
            <SessionActive
              session={session}
              maxLosses={maxLosses}
              onEnd={handleEnd}
              onSOS={handleSOS}
              emotionLog={emotionLog}
              currentState={psychState}
              onLogState={handleLogState}
            />
          ) : (
            <Card style={{ gap: 16 }}>
              <View>
                <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>No active session</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 }}>
                  Set your max losses before starting. This decision is made now, while calm — not mid-session.
                </Text>
              </View>
              <View>
                <SectionLabel text="Max losses today" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3].map(n => (
                    <TouchableOpacity
                      key={n} onPress={() => { setMaxLosses(n); saveMaxLosses(n); }} activeOpacity={0.8}
                      style={{ flex: 1, height: 48, borderRadius: 10, borderWidth: 2, borderColor: maxLosses === n ? colors.primary : colors.border, backgroundColor: maxLosses === n ? `${colors.primary}18` : colors.secondary, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: maxLosses === n ? colors.primary : colors.mutedForeground, fontSize: 20, fontFamily: "Inter_700Bold" }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {confirmEnd && (
                <View style={[styles.alertBanner, { backgroundColor: `${colors.warning}18`, borderColor: colors.warning }]}>
                  <Icon name="alert-triangle" size={14} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 }}>No session active. Start a new one below.</Text>
                </View>
              )}
              <Button label="Start Session" onPress={handleStart} loading={startMutation.isPending} icon={<Icon name="play" size={14} color={colors.primaryForeground} />} fullWidth />
            </Card>
          )}
        </View>

        {/* Emotion timeline (session only) */}
        {isActive && emotionLog.length > 0 && (
          <Card>
            <EmotionTimeline entries={emotionLog} />
          </Card>
        )}

        {/* Breathing reset */}
        <BreathingWidget />

        {/* Stats */}
        <StatsRow />
      </ScrollView>

      <HijackProtocol
        visible={hijackVisible}
        onClose={handleHijackClose}
        triggerReason={hijackReason}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  statBox: { padding: 12, borderRadius: 10, gap: 4 },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  stateDesc: { marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
});
