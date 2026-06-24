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
import {
  loadMaxLosses, saveMaxLosses, addEmotionEntry, loadEmotionLog,
  EmotionLogEntry, TraderArchetype, loadArchetype, saveArchetype,
} from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Badge, SectionLabel, webTop, webBottom } from "@/components/UI";
import { SOSProtocol } from "@/components/SOSProtocol";
import { useFocusEffect } from "expo-router";

/* ── Psych States ─────────────────────────────────────────── */
const PSYCH_STATES = [
  { key: "CALM", label: "Calm", color: "#22c55e", desc: "Clear head, no emotional pull", risk: 0 },
  { key: "FOCUSED", label: "Focused", color: "#22d3ee", desc: "Locked in, methodical", risk: 0 },
  { key: "PRESSURE", label: "Pressure", color: "#f59e0b", desc: "Need to recover, urgency", risk: 2 },
  { key: "FEAR", label: "Fear", color: "#f97316", desc: "Hesitating, second-guessing", risk: 2 },
  { key: "OVERCONFIDENT", label: "Overconfident", color: "#ef4444", desc: "Too sure, ignoring risk", risk: 3 },
  { key: "URGE", label: "Urge", color: "#ef4444", desc: "Strong pull to trade — survival brain active", risk: 3 },
];

const RANDE_STATE_COACHING: Record<string, string> = {
  CALM: "Trader state. Prefrontal cortex online. Execute with precision.",
  FOCUSED: "Optimal. Clear observation, zero emotional interference.",
  PRESSURE: "Survival brain signalling threat. The need to recover distorts perception of risk.",
  FEAR: "Amygdala activation. Fear of loss is more painful than loss itself to the emotional brain.",
  OVERCONFIDENT: "Dopamine surge. The reward circuit is rationalising edges that don't exist.",
  URGE: "Compulsive state. The urge to trade IS the signal to not trade.",
};

/* ── Archetypes — Rande Howell's Empowered Programs ─────── */
const ARCHETYPES: Record<TraderArchetype, {
  label: string; icon: string; color: string; core: string;
  tagline: string; mantra: string; desc: string; shadow: string;
}> = {
  WARRIOR: {
    label: "Warrior", icon: "zap", color: "#ef4444", core: "Courage",
    tagline: "I face uncertainty without flinching.",
    mantra: "I take valid setups with conviction. I do not freeze. I do not flinch.",
    desc: "The Warrior faces risk with courage. It executes without hesitation at the moment of signal. It accepts losses as the cost of operating under uncertainty.",
    shadow: "After losses, the Warrior can become reckless. Watch for aggression replacing strategy.",
  },
  RULER: {
    label: "Ruler", icon: "sliders", color: "#f59e0b", core: "Discipline",
    tagline: "I enforce my rules without negotiation.",
    mantra: "The rules exist. I enforce them. The emotional brain does not vote.",
    desc: "The Ruler governs by law, not impulse. Every rule exists for a reason. There are no exceptions during the session.",
    shadow: "The Ruler can become rigid. When the market shifts, watch for rule-worship over context.",
  },
  CAREGIVER: {
    label: "Caregiver", icon: "heart", color: "#22c55e", core: "Self-Compassion",
    tagline: "I recover from losses without self-attack.",
    mantra: "I am not my results. I treat myself with respect. I do not revenge trade.",
    desc: "The Caregiver does not punish itself for losses. It recovers with speed and self-compassion, which prevents the revenge spiral.",
    shadow: "The Caregiver can avoid hard truths. Watch for complacency masking as self-care.",
  },
  SAGE: {
    label: "Sage", icon: "eye", color: "#6366f1", core: "Impartiality",
    tagline: "I observe without attachment to outcome.",
    mantra: "I observe. I assess. I act without attachment. The market is data.",
    desc: "The Sage is the Observer Self — it watches the market and its own reactions with equal detachment. It sees clearly because it has no stake in being right.",
    shadow: "The Sage can over-analyse. Watch for paralysis masking as patience.",
  },
};

/* ── Helpers ──────────────────────────────────────────────── */
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

/* ── Archetype Selector ───────────────────────────────────── */
function ArchetypeActivation({ value, onChange }: { value: TraderArchetype; onChange: (v: TraderArchetype) => void }) {
  const colors = useColors();
  const meta = ARCHETYPES[value];
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SectionLabel text="Session Archetype" />
        <TouchableOpacity onPress={() => setExpanded(e => !e)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
            {expanded ? "Less" : "What's this?"}
          </Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20`, marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Rande Howell — Awakening Empowered Programs
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
            Your brain contains empowered emotional programs — the Warrior's courage, the Ruler's discipline, the Caregiver's self-compassion, the Sage's impartiality. Activating one before your session sets your trading identity intentionally, rather than letting the survival brain take over.
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(Object.entries(ARCHETYPES) as [TraderArchetype, typeof meta][]).map(([key, a]) => {
          const isSelected = value === key;
          return (
            <TouchableOpacity
              key={key} activeOpacity={0.8}
              onPress={() => { onChange(key); Haptics.selectionAsync(); }}
              style={{ flex: 1, alignItems: "center", gap: 6, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: isSelected ? a.color : colors.border, backgroundColor: isSelected ? `${a.color}18` : colors.secondary }}
            >
              <Icon name={a.icon} size={18} color={isSelected ? a.color : colors.mutedForeground} />
              <Text style={{ color: isSelected ? a.color : colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: `${meta.color}30`, backgroundColor: `${meta.color}08`, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Icon name={meta.icon} size={14} color={meta.color} />
          <Text style={{ color: meta.color, fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 }}>
            {meta.label} — {meta.core}
          </Text>
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
          {meta.desc}
        </Text>
        <View style={{ marginTop: 4, padding: 8, borderRadius: 8, backgroundColor: `${meta.color}12` }}>
          <Text style={{ color: meta.color, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18, fontStyle: "italic" }}>
            "{meta.mantra}"
          </Text>
        </View>
        <Text style={{ color: colors.mutedForeground + "80", fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 15, fontStyle: "italic" }}>
          Shadow: {meta.shadow}
        </Text>
      </View>
    </View>
  );
}

/* ── Psych State Selector ─────────────────────────────────── */
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
              key={s.key} onPress={() => onChange(s.key)} activeOpacity={0.8}
              style={{ marginRight: 8, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: isSelected ? s.color : colors.border, backgroundColor: isSelected ? `${s.color}18` : colors.secondary }}
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

/* ── Emotion Timeline ─────────────────────────────────────── */
function EmotionTimeline({ entries }: { entries: EmotionLogEntry[] }) {
  const colors = useColors();
  if (entries.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel text="State Log" />
      {entries.slice(0, 6).map((entry, i) => {
        const state = PSYCH_STATES.find(s => s.key === entry.state);
        const isLatest = i === 0;
        return (
          <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: isLatest ? `${state?.color ?? colors.primary}10` : "transparent", borderWidth: isLatest ? 1 : 0, borderColor: `${state?.color ?? colors.primary}30` }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: state?.color ?? colors.mutedForeground }} />
            <Text style={{ color: state?.color ?? colors.foreground, fontSize: 12, fontFamily: "Inter_600SemiBold", width: 90 }}>
              {state?.label ?? entry.state}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 }}>
              {formatTime(entry.timestamp)}
            </Text>
            {isLatest && <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${state?.color ?? colors.primary}20` }}><Text style={{ color: state?.color ?? colors.primary, fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>NOW</Text></View>}
          </View>
        );
      })}
    </View>
  );
}

/* ── Session Active Card ──────────────────────────────────── */
function SessionActive({ session, maxLosses, archetype, onEnd, onSOS, emotionLog, currentState, onLogState }: {
  session: Session; maxLosses: number; archetype: TraderArchetype;
  onEnd: () => void; onSOS: () => void;
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
  const arc = ARCHETYPES[archetype];

  useEffect(() => {
    const interval = setInterval(() => setElapsed(formatElapsed(session.createdAt)), 1000);
    return () => clearInterval(interval);
  }, [session.createdAt]);

  return (
    <View style={{ gap: 10 }}>
      {hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}>
          <Icon name="alert-octagon" size={16} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            CIRCUIT BREAKER — Loss limit reached. End session now.
          </Text>
        </View>
      )}
      {dangerZone && !hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: "#f9731618", borderColor: "#f97316" }]}>
          <Icon name="alert-triangle" size={16} color="#f97316" />
          <Text style={{ color: "#f97316", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            Danger Zone — {state?.label} + {session.lossCount} loss{session.lossCount !== 1 ? "es" : ""}. Invoke the {arc.label}'s mantra.
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

        {/* Archetype chip */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, backgroundColor: `${arc.color}10`, borderWidth: 1, borderColor: `${arc.color}25` }}>
          <Icon name={arc.icon} size={13} color={arc.color} />
          <Text style={{ color: arc.color, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{arc.label}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 }} numberOfLines={1}>
            {arc.tagline}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Losses", value: String(session.lossCount), color: lossColor },
            { label: "Breaks", value: String(session.ruleBreaks), color: session.ruleBreaks > 0 ? colors.warning : colors.foreground },
            { label: "Mode", value: session.mode, color: colors.foreground, small: true },
          ].map(item => (
            <View key={item.label} style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</Text>
              <Text style={{ color: item.color, fontSize: item.small ? 11 : 22, fontFamily: "Inter_700Bold" }}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onLogState(); }}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: `${state?.color ?? colors.primary}50`, backgroundColor: `${state?.color ?? colors.primary}12` }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: state?.color ?? colors.primary }} />
            <Text style={{ color: state?.color ?? colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
              Log: {state?.label ?? currentState}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onSOS(); }}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef444450", backgroundColor: "#ef444415", flexDirection: "row", alignItems: "center", gap: 6 }}
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

/* ── Breathing Widget ─────────────────────────────────────── */
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
    const PHASES = [{ phase: "INHALE" as const, duration: 4 }, { phase: "HOLD" as const, duration: 7 }, { phase: "EXHALE" as const, duration: 8 }];
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
  const ringColor = phase === "INHALE" ? "#3b82f6" : phase === "HOLD" ? "#22d3ee" : phase === "EXHALE" ? "#22c55e" : colors.border;

  return (
    <View style={{ gap: 10 }}>
      <SectionLabel text="4-7-8 Breathing — Diaphragmatic Reset" />
      <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#3b82f620", backgroundColor: "#3b82f608" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 12 }}>
          Diaphragmatic breathing under trading stress prevents the amygdala hijack. It lowers cortisol and re-engages the prefrontal cortex. Practice this before every session.
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
          <View style={{ alignItems: "center", gap: 14 }}>
            <Animated.View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: ringColor, backgroundColor: `${ringColor}18`, alignItems: "center", justifyContent: "center", transform: [{ scale: scaleAnim }] }}>
              <Text style={{ color: ringColor, fontSize: 28, fontFamily: "Inter_700Bold" }}>{timer}</Text>
              <Text style={{ color: ringColor, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>{phaseLabel}</Text>
            </Animated.View>
            <View style={{ flexDirection: "row", gap: 10 }}>
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
                {cycles} cycle{cycles !== 1 ? "s" : ""}{cycles >= 3 ? " — cortex re-engaged" : ""}
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

/* ── Stats Row ───────────────────────────────────────────── */
function StatsRow() {
  const colors = useColors();
  const { data: stats } = useQuery({ queryKey: ["stats-summary"], queryFn: api.getStatsSummary });
  const { data: streak } = useQuery({ queryKey: ["discipline-streak"], queryFn: api.getDisciplineStreak });
  if (!stats) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel text="All-time performance" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { label: "Trades", value: String(stats.totalTrades), color: colors.foreground },
          { label: "Win Rate", value: `${(stats.winRate * 100).toFixed(0)}%`, color: colors.success },
          { label: "Streak", value: String(streak?.currentStreak ?? 0), color: colors.primary },
          { label: "Plan %", value: `${(stats.planFollowRate * 100).toFixed(0)}%`, color: "#22d3ee" },
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

/* ── Hub Screen ──────────────────────────────────────────── */
export default function HubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [maxLosses, setMaxLosses] = useState(2);
  const [psychState, setPsychState] = useState("CALM");
  const [archetype, setArchetype] = useState<TraderArchetype>("SAGE");
  const [emotionLog, setEmotionLog] = useState<EmotionLogEntry[]>([]);
  const [hijackVisible, setHijackVisible] = useState(false);
  const [hijackReason, setHijackReason] = useState("");

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try { return await api.getCurrentSession(); } catch { return null; }
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    loadMaxLosses().then(setMaxLosses);
    loadArchetype().then(setArchetype);
  }, []);

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
      setEmotionLog([]);
    },
  });

  const handleLogState = async () => {
    if (!session) return;
    Haptics.selectionAsync();
    const entries = await addEmotionEntry(session.id, psychState);
    setEmotionLog(entries);
  };

  const handleSOS = () => {
    const state = PSYCH_STATES.find(s => s.key === psychState);
    const arc = ARCHETYPES[archetype];
    const lossCtx = session ? ` · ${session.lossCount} loss${session.lossCount !== 1 ? "es" : ""} this session` : "";
    setHijackReason(`${state?.label ?? psychState} state${lossCtx}. Active archetype: ${arc.label}.`);
    setHijackVisible(true);
  };

  const handleHijackClose = (decision: string | null) => {
    setHijackVisible(false);
    if (decision === "END_SESSION" && session) endMutation.mutate();
  };

  const handleArchetypeChange = (a: TraderArchetype) => {
    setArchetype(a);
    saveArchetype(a);
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>
            APEX<Text style={{ color: colors.foreground }}>TERM</Text>
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 }}>
            Psychology Hub
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            Prepare your mind before the market opens
          </Text>
        </View>

        {/* Archetype activation */}
        <Card>
          <ArchetypeActivation value={archetype} onChange={handleArchetypeChange} />
        </Card>

        {/* Psych state */}
        <Card>
          <PsychSelector value={psychState} onChange={setPsychState} />
          {selectedState && (
            <>
              <View style={[styles.stateDesc, { backgroundColor: `${selectedState.color}10`, borderColor: `${selectedState.color}30` }]}>
                <Text style={{ color: selectedState.color, fontSize: 12, fontFamily: "Inter_500Medium" }}>{selectedState.desc}</Text>
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

        {/* Session */}
        <View>
          <SectionLabel text="Trading Session" />
          {isActive ? (
            <SessionActive
              session={session}
              maxLosses={maxLosses}
              archetype={archetype}
              onEnd={() => endMutation.mutate()}
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
                  Commit to your loss limit before starting. This decision is made now — while calm — not in the heat of the session.
                </Text>
              </View>
              <View>
                <SectionLabel text="Max losses today" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3].map(n => (
                    <TouchableOpacity key={n} onPress={() => { setMaxLosses(n); saveMaxLosses(n); }} activeOpacity={0.8}
                      style={{ flex: 1, height: 48, borderRadius: 10, borderWidth: 2, borderColor: maxLosses === n ? colors.primary : colors.border, backgroundColor: maxLosses === n ? `${colors.primary}18` : colors.secondary, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: maxLosses === n ? colors.primary : colors.mutedForeground, fontSize: 20, fontFamily: "Inter_700Bold" }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Button label="Start Session" onPress={() => startMutation.mutate()} loading={startMutation.isPending} icon={<Icon name="play" size={14} color={colors.primaryForeground} />} fullWidth />
            </Card>
          )}
        </View>

        {/* Emotion timeline */}
        {isActive && emotionLog.length > 0 && (
          <Card><EmotionTimeline entries={emotionLog} /></Card>
        )}

        {/* Breathing */}
        <BreathingWidget />

        {/* Stats */}
        <StatsRow />
      </ScrollView>

      <SOSProtocol visible={hijackVisible} onClose={() => handleHijackClose(null)} triggerReason={hijackReason} />
    </>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  statBox: { padding: 12, borderRadius: 10, gap: 4 },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  stateDesc: { marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
});
