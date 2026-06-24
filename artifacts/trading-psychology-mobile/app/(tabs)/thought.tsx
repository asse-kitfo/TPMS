import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { Button, Card, SectionLabel, webTop, webBottom } from "@/components/UI";

const STORAGE_KEY = "cbt-thought-records-mobile";

interface ThoughtRecord {
  id: string;
  createdAt: string;
  situation: string;
  bodyLocation: string;
  bodyTension: number;
  emotion: string;
  emotionIntensity: number;
  automaticThought: string;
  voiceId: string;
  distortionId: string;
  rationalReframe: string;
  action: string;
}

type Step = "SITUATION" | "BODY_SCAN" | "EMOTION" | "THOUGHT" | "VOICE" | "DISTORTION" | "REFRAME" | "ACTION" | "DONE";

/* ─── Data ─────────────────────────────────────────────────── */
const SITUATIONS = [
  { id: "BEFORE_TRADE", label: "Before entering a trade", sub: "Urge, FOMO, or setup temptation" },
  { id: "DURING_TRADE", label: "During a live trade", sub: "Moving against me, urge to interfere" },
  { id: "AFTER_LOSS", label: "After a loss", sub: "Anger, urge to revenge trade" },
  { id: "AFTER_WIN", label: "After a win", sub: "Overconfidence, urge to overtrade" },
  { id: "NO_SETUPS", label: "No setups visible", sub: "Boredom, forcing trades" },
  { id: "AFTER_RULE_BREAK", label: "After breaking a rule", sub: "Guilt, shame, self-blame spiral" },
  { id: "OFF_SESSION", label: "Outside trading hours", sub: "Obsessing over charts" },
];

const BODY_LOCATIONS = [
  { id: "CHEST", label: "Chest", desc: "Tightness, pressure, rapid heartbeat" },
  { id: "STOMACH", label: "Stomach", desc: "Knot, nausea, sinking feeling" },
  { id: "JAW", label: "Jaw / Face", desc: "Clenching, tension, furrowed brow" },
  { id: "SHOULDERS", label: "Shoulders / Neck", desc: "Raised shoulders, neck stiffness" },
  { id: "HANDS", label: "Hands", desc: "Gripping, clenched fist" },
  { id: "THROAT", label: "Throat", desc: "Constriction, dry mouth" },
  { id: "NONE", label: "No tension", desc: "Body is relaxed — state may be mild" },
];

const EMOTIONS = [
  { id: "FEAR", label: "Fear / Anxiety", color: "#f97316" },
  { id: "URGE", label: "Urge / Compulsion", color: "#f59e0b" },
  { id: "ANGER", label: "Anger / Frustration", color: "#ef4444" },
  { id: "OVERCONFIDENCE", label: "Overconfidence", color: "#a855f7" },
  { id: "DESPERATION", label: "Desperation / Pressure", color: "#f43f5e" },
  { id: "BOREDOM", label: "Boredom / Restlessness", color: "#3b82f6" },
  { id: "GUILT", label: "Guilt / Self-blame", color: "#71717a" },
  { id: "GREED", label: "Greed / Excitement", color: "#eab308" },
  { id: "SHAME", label: "Shame / Inadequacy", color: "#64748b" },
];

/* ── Rande Howell's "Committee of the Mind" ──────────────── */
const VOICES = [
  {
    id: "INNER_CRITIC",
    label: "Inner Critic",
    icon: "x-circle" as const,
    color: "#ef4444",
    desc: "Attacking, judging, shaming self",
    examples: ['"I\'m such an idiot."', '"I always do this."', '"I\'ll never be a good trader."'],
    insight: "The Inner Critic is not your authentic voice — it is inherited programming from past authority figures. It attacks instead of coaching. It creates shame loops that prevent learning.",
    coaching: "Ask: what would a great coach say here? A coach gives specific instruction. It does not punish. Rewrite this thought as a coach would say it.",
  },
  {
    id: "ORPHAN",
    label: "Orphan",
    icon: "alert-triangle" as const,
    color: "#f97316",
    desc: "Fearful, helpless, seeking rescue",
    examples: ['"I can\'t handle this."', '"What if this never works?"', '"I don\'t know what to do."'],
    insight: "The Orphan is the wounded child who learned the world is unsafe. It fears loss above all and seeks reassurance — the opposite of what\'s needed in trading uncertainty.",
    coaching: "You are a professional. You have a tested system. The Orphan is reacting to a perceived threat that is not real. Return to your methodology and act from that identity.",
  },
  {
    id: "SURVIVAL_BRAIN",
    label: "Survival Brain",
    icon: "alert-octagon" as const,
    color: "#f59e0b",
    desc: "Must control, must recover, certainty-seeking",
    examples: ['"I NEED to get this money back."', '"I have to find a trade NOW."', '"I can\'t let this loss go."'],
    insight: "The Survival Brain perceives loss as a biological threat to your existence. It acts in nanoseconds — before the rational mind can intervene — and then your rational mind creates an alibi to justify what it already did.",
    coaching: "This is biology, not reality. The loss will not harm you. The survival brain\'s reaction is a glitch — an evolutionary misfire. Breathe diaphragmatically. Slow down. The threat is not real.",
  },
  {
    id: "ENTITLED_EGO",
    label: "Entitled Ego",
    icon: "star" as const,
    color: "#a855f7",
    desc: "The market owes me, I deserve to win",
    examples: ['"This should have worked."', '"The market is wrong."', '"After all this work, I deserve this."'],
    insight: "The Ego makes trading personal — every loss is experienced as humiliation or injustice. This produces aggression, revenge trading, or system abandonment, because the Ego cannot accept that the market is simply neutral data.",
    coaching: "The market does not know you exist. It owes you nothing. Your edge is statistical. This trade\'s outcome is irrelevant to your long-term expectancy. Trade the system, not the outcome.",
  },
];

const DISTORTIONS = [
  { id: "FOMO", label: "FOMO", desc: "Fear of missing the move", counter: "There will always be another setup. Missing one trade is irrelevant over 100." },
  { id: "LOSS_AVERSION", label: "Loss Aversion", desc: "Can't close the losing trade", counter: "An unrealized loss is already real. Closing protects capital." },
  { id: "REVENGE", label: "Revenge Thinking", desc: "Need to get back what the market took", counter: "The market took nothing. You paid the cost of a trade that didn't work." },
  { id: "OVERCONFIDENCE", label: "Overconfidence", desc: "Certainty about an uncertain outcome", counter: "No one knows. You have a probability, not a guarantee." },
  { id: "CATASTROPHIZING", label: "Catastrophizing", desc: "One loss = total disaster", counter: "One loss is one data point. Your risk management caps all damage." },
  { id: "ALL_OR_NOTHING", label: "All-or-Nothing", desc: "Black and white thinking", counter: "Professional recovery is gradual. One trade cannot recover everything." },
  { id: "RECENCY_BIAS", label: "Recency Bias", desc: "Recent streak overrides probability", counter: "Three losses in a row is statistically normal. The edge exists over 100+ trades." },
  { id: "SUNK_COST", label: "Sunk Cost", desc: "Holding because already lost too much", counter: "Ask: would I enter this right now at this price? If no — exit." },
  { id: "CONFIRMATION_BIAS", label: "Confirmation Bias", desc: "Only seeing what confirms the trade", counter: "Look at the chart as if you have no position. What does it tell you?" },
  { id: "EMOTIONAL_REASONING", label: "Emotional Reasoning", desc: "Feelings treated as market facts", counter: "Feelings are neurochemistry, not market data. What does your system say?" },
  { id: "NEED_FOR_CERTAINTY", label: "Need for Certainty", desc: "I need to know this will work", counter: "Certainty is not available in markets. Your edge is a probability over hundreds of trades, not this one." },
  { id: "IDENTITY_THREAT", label: "Identity Threat", desc: "This loss means I'm a bad trader", counter: "A trade result is data about market conditions, not data about who you are." },
  { id: "ALIBI", label: "Alibi / Rationalization", desc: "Rational justification of an emotional decision", counter: "Ask: did my emotional brain decide first, and my rational brain justify it? That's an alibi. Name it." },
];

const ACTIONS = [
  { id: "CLOSE_CHARTS", label: "Close charts — 10 minutes", icon: "x-circle" as const },
  { id: "BREATHE", label: "4-7-8 breathing — 3 cycles", icon: "wind" as const },
  { id: "WALK_AWAY", label: "Step away from the screen", icon: "log-out" as const },
  { id: "REVIEW_RULES", label: "Re-read my trading rules", icon: "book-open" as const },
  { id: "OBSERVE", label: "Become the observer — watch without reacting", icon: "eye" as const },
  { id: "SMALL_SIZE", label: "If I trade, cut size by 50%", icon: "minimize-2" as const },
  { id: "UNCERTAINTY_SCRIPT", label: "Recite: 'I accept uncertainty as the cost of doing business'", icon: "anchor" as const },
  { id: "BODY_RELEASE", label: "Release the body tension — drop shoulders, unclench jaw, breathe out", icon: "crosshair" as const },
  { id: "ARCHETYPE", label: "Invoke my session archetype's mantra", icon: "zap" as const },
];

const QUICK_THOUGHTS = [
  "I need to get my money back right now.",
  "If I don't enter now I'll miss the whole move.",
  "This trade has to work — I've lost too much today.",
  "I can't accept this loss — I'll wait for it to come back.",
  "After 3 losses I'm due for a win.",
  "I feel an overwhelming urge to trade something.",
  "I need to prove I can do this.",
  "I already know this will work.",
];

/* ─── Micro Mode (3-step in-session modal) ──────────────────── */
const MICRO_EMOTIONS = [
  { id: "FEAR", label: "Fear", color: "#f97316" },
  { id: "URGE", label: "Urge", color: "#f59e0b" },
  { id: "ANGER", label: "Anger", color: "#ef4444" },
  { id: "OVERCONFIDENCE", label: "Overconfident", color: "#a855f7" },
  { id: "DESPERATION", label: "Desperation", color: "#f43f5e" },
  { id: "BOREDOM", label: "Boredom", color: "#3b82f6" },
  { id: "GREED", label: "Greed", color: "#eab308" },
];

const MICRO_VOICES = [
  { id: "INNER_CRITIC", label: "Inner Critic", color: "#ef4444", desc: "Attacking / shaming self" },
  { id: "ORPHAN", label: "Orphan", color: "#f97316", desc: "Fearful / helpless" },
  { id: "SURVIVAL_BRAIN", label: "Survival Brain", color: "#f59e0b", desc: "Must control / recover" },
  { id: "ENTITLED_EGO", label: "Entitled Ego", color: "#a855f7", desc: "Market owes me / I deserve" },
];

const MICRO_REFRAMES: Record<string, string[]> = {
  FEAR: [
    "The stop exists to protect me. Loss is already managed.",
    "Uncertainty is the price of entry — not a threat.",
    "I'm observing, not predicting. Fear is a false alarm.",
  ],
  URGE: [
    "The urge to trade IS the signal to not trade.",
    "No trade is better than a bad trade. The market will still be here.",
    "This impulse has no edge. Edge comes from setup, not emotion.",
  ],
  ANGER: [
    "The market is not punishing me. It is neutral data.",
    "My anger is a biological reaction, not market information.",
    "Revenge trading has negative expectancy. I trade the system.",
  ],
  OVERCONFIDENCE: [
    "No one knows. I have a probability, not a guarantee.",
    "My edge exists over 100 trades — not this one.",
    "Certainty is not available. Respect the risk.",
  ],
  DESPERATION: [
    "The need to recover is the enemy of good trading.",
    "This trade will not fix how I feel — it will amplify it.",
    "Professional recovery is gradual. One trade cannot fix everything.",
  ],
  BOREDOM: [
    "No setup is a valid position. Standing aside IS a trade.",
    "Forcing a trade from boredom has negative expectancy.",
    "The best traders miss most moves. Selectivity is the edge.",
  ],
  GREED: [
    "Greed is the dopamine circuit rationalising risk that doesn't exist.",
    "I already have a plan. I execute the plan.",
    "Extending a winner from greed erases discipline. Bank it.",
  ],
};

const MICRO_STORAGE_KEY = "cbt-micro-records-mobile";

interface MicroRecord {
  id: string;
  createdAt: string;
  emotion: string;
  voice: string;
  reframe: string;
}

interface MicroModeProps {
  visible: boolean;
  onClose: () => void;
}

function MicroMode({ visible, onClose }: MicroModeProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [emotion, setEmotion] = useState("");
  const [voice, setVoice] = useState("");
  const [reframeIdx, setReframeIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const topPad = Platform.OS === "web" ? 60 : insets.top + 16;

  useEffect(() => {
    if (visible) {
      setStep(1); setEmotion(""); setVoice(""); setReframeIdx(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const reframeOptions = emotion ? (MICRO_REFRAMES[emotion] ?? MICRO_REFRAMES["FEAR"]) : [];

  const save = async () => {
    const record: MicroRecord = {
      id: `micro-${Date.now()}`, createdAt: new Date().toISOString(),
      emotion, voice, reframe: reframeOptions[reframeIdx] ?? "",
    };
    try {
      const raw = await AsyncStorage.getItem(MICRO_STORAGE_KEY);
      const existing: MicroRecord[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(MICRO_STORAGE_KEY, JSON.stringify([record, ...existing].slice(0, 30)));
    } catch {}
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const stepLabels = ["Name the emotion", "Identify the voice", "Choose a reframe"];
  const progressColors = ["#f59e0b", "#ef4444", "#22c55e"];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Animated.View style={{ flex: 1, backgroundColor: "#060608", opacity: fadeAnim }}>
        <View style={{ paddingTop: topPad, paddingHorizontal: 20, flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="zap" size={14} color="#f59e0b" />
                <Text style={{ color: "#f59e0b", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" }}>
                  Micro Mode
                </Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" }}>{stepLabels[step - 1]}</Text>
              <Text style={{ color: "#444", fontSize: 12, fontFamily: "Inter_400Regular" }}>Step {step} of 3 — no typing needed</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="x" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 28 }}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? progressColors[i - 1] : "#1a1a1a" }} />
            ))}
          </View>

          {/* STEP 1: Emotion */}
          {step === 1 && (
            <View style={{ gap: 10 }}>
              {MICRO_EMOTIONS.map(e => (
                <TouchableOpacity
                  key={e.id} activeOpacity={0.8}
                  onPress={() => { setEmotion(e.id); Haptics.selectionAsync(); setStep(2); }}
                  style={{
                    padding: 16, borderRadius: 14, borderWidth: 1.5,
                    borderColor: `${e.color}40`, backgroundColor: `${e.color}08`,
                    flexDirection: "row", alignItems: "center", gap: 12,
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.color }} />
                  <Text style={{ color: e.color, fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 }}>{e.label}</Text>
                  <Feather name="chevron-right" size={14} color={`${e.color}80`} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 2: Voice */}
          {step === 2 && (
            <View style={{ gap: 10 }}>
              {MICRO_VOICES.map(v => (
                <TouchableOpacity
                  key={v.id} activeOpacity={0.8}
                  onPress={() => { setVoice(v.id); Haptics.selectionAsync(); setStep(3); }}
                  style={{
                    padding: 16, borderRadius: 14, borderWidth: 1.5,
                    borderColor: `${v.color}40`, backgroundColor: `${v.color}08`,
                    flexDirection: "row", alignItems: "flex-start", gap: 12,
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: v.color, marginTop: 5 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: v.color, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{v.label}</Text>
                    <Text style={{ color: "#555", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>{v.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={`${v.color}80`} style={{ marginTop: 3 }} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setStep(1)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, alignSelf: "center" }}>
                <Feather name="arrow-left" size={12} color="#444" />
                <Text style={{ color: "#444", fontSize: 12, fontFamily: "Inter_500Medium" }}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Reframe */}
          {step === 3 && (
            <View style={{ gap: 12 }}>
              <Text style={{ color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                Tap the reframe that lands. Read it twice. Let it replace the automatic thought.
              </Text>
              {reframeOptions.map((r, i) => {
                const isSelected = reframeIdx === i;
                return (
                  <TouchableOpacity
                    key={i} activeOpacity={0.8}
                    onPress={() => { setReframeIdx(i); Haptics.selectionAsync(); }}
                    style={{
                      padding: 18, borderRadius: 14, borderWidth: 1.5,
                      borderColor: isSelected ? "#22c55e" : "#1a1a1a",
                      backgroundColor: isSelected ? "#22c55e0a" : "#0a0a0a",
                    }}
                  >
                    <Text style={{ color: isSelected ? "#22c55e" : "#777", fontSize: 15, fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular", lineHeight: 22 }}>
                      "{r}"
                    </Text>
                    {isSelected && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
                        <Feather name="check-circle" size={12} color="#22c55e" />
                        <Text style={{ color: "#22c55e", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <TouchableOpacity onPress={() => setStep(2)} style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#1a1a1a", flex: 1, justifyContent: "center" }}>
                  <Feather name="arrow-left" size={12} color="#444" />
                  <Text style={{ color: "#444", fontSize: 13, fontFamily: "Inter_500Medium" }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8} onPress={save}
                  style={{ flex: 2, padding: 14, borderRadius: 10, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#000", fontSize: 14, fontFamily: "Inter_700Bold" }}>Lock In & Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */
function generateId() {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
async function loadRecords(): Promise<ThoughtRecord[]> {
  try {
    const s = await AsyncStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
async function saveRecords(records: ThoughtRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ─── Step Progress Bar ─────────────────────────────────────── */
function StepBar({ current, total }: { current: number; total: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 4, marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < current ? colors.primary : i === current ? `${colors.primary}60` : colors.secondary }} />
      ))}
    </View>
  );
}

/* ─── Main Screen ───────────────────────────────────────────── */
export default function ThoughtScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<Step>("SITUATION");
  const [situation, setSituation] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [bodyTension, setBodyTension] = useState(5);
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState(6);
  const [automaticThought, setAutomaticThought] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [distortionId, setDistortionId] = useState("");
  const [rationalReframe, setRationalReframe] = useState("");
  const [action, setAction] = useState("");
  const [records, setRecords] = useState<ThoughtRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [microVisible, setMicroVisible] = useState(false);

  useEffect(() => { loadRecords().then(setRecords); }, []);

  const steps: Step[] = ["SITUATION", "BODY_SCAN", "EMOTION", "THOUGHT", "VOICE", "DISTORTION", "REFRAME", "ACTION"];
  const stepIndex = steps.indexOf(step);

  const reset = () => {
    setStep("SITUATION"); setSituation(""); setBodyLocation(""); setBodyTension(5);
    setEmotion(""); setEmotionIntensity(6); setAutomaticThought(""); setVoiceId("");
    setDistortionId(""); setRationalReframe(""); setAction(""); setIsActive(false);
  };

  const handleComplete = async () => {
    const record: ThoughtRecord = {
      id: generateId(), createdAt: new Date().toISOString(),
      situation, bodyLocation, bodyTension, emotion, emotionIntensity,
      automaticThought, voiceId, distortionId, rationalReframe, action,
    };
    const updated = [record, ...records];
    setRecords(updated);
    await saveRecords(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("DONE");
  };

  const deleteRecord = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    await saveRecords(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const selectedDistortion = DISTORTIONS.find(d => d.id === distortionId);
  const selectedVoice = VOICES.find(v => v.id === voiceId);

  /* ── DONE ────────────────────────────────────────────────── */
  if (isActive && step === "DONE") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, gap: 24 }}>
          <View style={[styles.doneCircle, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}18` }]}>
            <Icon name="check" size={36} color={colors.primary} />
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>Thought Record Complete</Text>
            <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" }}>Cortex re-engaged.</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 }}>
              You named the voice. You named the distortion. You wrote the reframe. The amygdala cannot sustain its hijack when the prefrontal cortex is active.
            </Text>
          </View>
          {selectedDistortion && (
            <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Counter — {selectedDistortion.label}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, fontStyle: "italic" }}>
                "{selectedDistortion.counter}"
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Button label="New Record" variant="ghost" onPress={reset} style={{ flex: 1 }} />
            <Button label="Done" onPress={reset} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ── ACTIVE FLOW ─────────────────────────────────────────── */
  const stepLabels: Record<Step, string> = {
    SITUATION: "What triggered this?",
    BODY_SCAN: "Where does your body hold it?",
    EMOTION: "What are you feeling?",
    THOUGHT: "What is the automatic thought?",
    VOICE: "Whose voice is speaking?",
    DISTORTION: "Name the cognitive distortion",
    REFRAME: "Write the rational reframe",
    ACTION: "Commit to an action",
    DONE: "",
  };

  if (isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <View>
              <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>Thought Record</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                Step {stepIndex + 1} of {steps.length} — {stepLabels[step]}
              </Text>
            </View>
            <TouchableOpacity onPress={reset} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <StepBar current={stepIndex} total={steps.length} />

          {/* SITUATION */}
          {step === "SITUATION" && (
            <View style={{ gap: 8 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>What is happening right now?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>The specific context that triggered this thought or feeling.</Text>
              </View>
              {SITUATIONS.map(s => (
                <TouchableOpacity key={s.id} activeOpacity={0.8}
                  onPress={() => { setSituation(s.id); setStep("BODY_SCAN"); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, { borderColor: situation === s.id ? colors.primary : colors.border, backgroundColor: situation === s.id ? `${colors.primary}12` : colors.card }]}
                >
                  <Text style={{ color: situation === s.id ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{s.label}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* BODY SCAN — Rande Howell's somatic approach */}
          {step === "BODY_SCAN" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: "#3b82f610", borderColor: "#3b82f630" }]}>
                <Text style={{ color: "#3b82f6", fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 }}>Body Scan — Rande Howell</Text>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Where does your body hold this?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                  The body knows before the mind does. Emotional activation is first somatic — then cognitive. Physical tension signals that the amygdala has already fired. Scan your body now.
                </Text>
              </View>
              {BODY_LOCATIONS.map(loc => {
                const isSelected = bodyLocation === loc.id;
                return (
                  <TouchableOpacity key={loc.id} activeOpacity={0.8}
                    onPress={() => { setBodyLocation(loc.id); Haptics.selectionAsync(); }}
                    style={[styles.optionCard, { borderColor: isSelected ? "#3b82f6" : colors.border, backgroundColor: isSelected ? "#3b82f612" : colors.card }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ color: isSelected ? "#3b82f6" : colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{loc.label}</Text>
                      {isSelected && <Icon name="check" size={14} color="#3b82f6" />}
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>{loc.desc}</Text>
                  </TouchableOpacity>
                );
              })}
              {bodyLocation && bodyLocation !== "NONE" && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Tension intensity</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const filled = n <= bodyTension;
                      const barColor = bodyTension >= 8 ? "#ef4444" : bodyTension >= 5 ? "#f97316" : "#3b82f6";
                      return <TouchableOpacity key={n} onPress={() => { setBodyTension(n); Haptics.selectionAsync(); }} style={{ flex: 1, height: 28, borderRadius: 4, backgroundColor: filled ? barColor : colors.secondary }} />;
                    })}
                  </View>
                  <Text style={{ color: bodyTension >= 7 ? "#ef4444" : "#3b82f6", fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
                    {bodyTension}/10 — {bodyTension >= 8 ? "High activation — amygdala engaged" : bodyTension >= 5 ? "Moderate — elevated" : "Mild"}
                  </Text>
                  <View style={{ padding: 10, borderRadius: 8, backgroundColor: "#3b82f608", borderWidth: 1, borderColor: "#3b82f620" }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, fontStyle: "italic" }}>
                      "Consciously release the tension in that area. Drop your shoulders. Unclench your jaw. Breathe out slowly. This alone reduces cortisol." — Rande Howell
                    </Text>
                  </View>
                </View>
              )}
              <Button label="Continue" onPress={() => setStep("EMOTION")} disabled={!bodyLocation} fullWidth style={{ marginTop: 4 }} />
            </View>
          )}

          {/* EMOTION */}
          {step === "EMOTION" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Name the emotion</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  Labelling an emotion reduces its intensity by up to 50% (fMRI studies). Don't filter — name what's actually present.
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EMOTIONS.map(e => (
                  <TouchableOpacity key={e.id} onPress={() => { setEmotion(e.id); Haptics.selectionAsync(); }} activeOpacity={0.8}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: emotion === e.id ? e.color : colors.border, backgroundColor: emotion === e.id ? `${e.color}18` : colors.secondary }}
                  >
                    <Text style={{ color: emotion === e.id ? e.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{e.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {emotion && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Intensity</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const filled = n <= emotionIntensity;
                      const barColor = emotionIntensity >= 8 ? "#ef4444" : emotionIntensity >= 6 ? "#f97316" : emotionIntensity >= 4 ? "#f59e0b" : colors.primary;
                      return <TouchableOpacity key={n} onPress={() => { setEmotionIntensity(n); Haptics.selectionAsync(); }} style={{ flex: 1, height: 32, borderRadius: 4, backgroundColor: filled ? barColor : colors.secondary }} />;
                    })}
                  </View>
                  <Text style={{ color: emotionIntensity >= 8 ? "#ef4444" : emotionIntensity >= 6 ? "#f97316" : colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
                    {emotionIntensity}/10
                  </Text>
                </View>
              )}
              <Button label="Continue" onPress={() => setStep("THOUGHT")} disabled={!emotion} fullWidth style={{ marginTop: 8 }} />
            </View>
          )}

          {/* THOUGHT */}
          {step === "THOUGHT" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>What is the exact thought?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Write it word-for-word. No editing — write what the emotional brain is actually saying right now.</Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 }}>Quick select</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {QUICK_THOUGHTS.map(t => (
                  <TouchableOpacity key={t} onPress={() => { setAutomaticThought(t); Haptics.selectionAsync(); }} activeOpacity={0.8}
                    style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: automaticThought === t ? "#f59e0b80" : colors.border, backgroundColor: automaticThought === t ? "#f59e0b18" : colors.secondary }}
                  >
                    <Text style={{ color: automaticThought === t ? "#f59e0b" : colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={automaticThought} onChangeText={setAutomaticThought}
                placeholder="Or write the exact thought..." placeholderTextColor={colors.mutedForeground}
                multiline numberOfLines={3}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              />
              <Button label="Continue" onPress={() => setStep("VOICE")} disabled={automaticThought.trim().length < 3} fullWidth />
            </View>
          )}

          {/* VOICE — Rande Howell's Committee of the Mind */}
          {step === "VOICE" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: "#6366f110", borderColor: "#6366f130" }]}>
                <Text style={{ color: "#6366f1", fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 }}>
                  Committee of the Mind — Rande Howell
                </Text>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Whose voice is speaking this thought?</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                  The mind is a community of rival programs. Most of them were inherited — not chosen. Identifying which program is running this thought is the first step to disrupting it.
                </Text>
              </View>

              <View style={[styles.infoBanner, { backgroundColor: "#f59e0b10", borderColor: "#f59e0b30" }]}>
                <Text style={{ color: "#f59e0b", fontSize: 12, fontFamily: "Inter_500Medium" }}>
                  Your thought: <Text style={{ color: colors.foreground, fontStyle: "italic" }}>"{automaticThought}"</Text>
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {VOICES.map(v => {
                  const isSelected = voiceId === v.id;
                  return (
                    <TouchableOpacity key={v.id} activeOpacity={0.8} onPress={() => { setVoiceId(v.id); Haptics.selectionAsync(); }}
                      style={[styles.optionCard, { borderColor: isSelected ? v.color : colors.border, backgroundColor: isSelected ? `${v.color}10` : colors.card }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <Icon name={v.icon} size={16} color={isSelected ? v.color : colors.mutedForeground} />
                        <Text style={{ color: isSelected ? v.color : colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 }}>{v.label}</Text>
                        {isSelected && <Icon name="check" size={14} color={v.color} />}
                      </View>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 }}>{v.desc}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                        {v.examples.map(ex => (
                          <View key={ex} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: `${v.color}12`, borderWidth: 1, borderColor: `${v.color}25` }}>
                            <Text style={{ color: v.color, fontSize: 10, fontFamily: "Inter_400Regular" }}>{ex}</Text>
                          </View>
                        ))}
                      </View>
                      {isSelected && (
                        <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: `${v.color}08`, borderWidth: 1, borderColor: `${v.color}20`, gap: 6 }}>
                          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, fontStyle: "italic" }}>
                            {v.insight}
                          </Text>
                          <View style={{ height: 1, backgroundColor: `${v.color}20` }} />
                          <Text style={{ color: v.color, fontSize: 11, fontFamily: "Inter_600SemiBold", lineHeight: 16 }}>
                            {v.coaching}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button label="Continue" onPress={() => setStep("DISTORTION")} disabled={!voiceId} fullWidth style={{ marginTop: 4 }} />
            </View>
          )}

          {/* DISTORTION */}
          {step === "DISTORTION" && (
            <View style={{ gap: 8 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Name the cognitive distortion</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Identifying the pattern interrupts the automatic hijack and re-activates the prefrontal cortex.</Text>
              </View>
              <View style={[styles.infoBanner, { backgroundColor: "#f59e0b10", borderColor: "#f59e0b30" }]}>
                <Text style={{ color: "#f59e0b", fontSize: 12, fontFamily: "Inter_500Medium" }}>
                  Voice: <Text style={{ color: selectedVoice?.color ?? colors.foreground }}>{selectedVoice?.label ?? ""}</Text>
                  {"  ·  "}Thought: <Text style={{ color: colors.foreground, fontStyle: "italic" }}>"{automaticThought}"</Text>
                </Text>
              </View>
              {DISTORTIONS.map(d => (
                <TouchableOpacity key={d.id} activeOpacity={0.8} onPress={() => { setDistortionId(d.id); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, { borderColor: distortionId === d.id ? "#f59e0b" : colors.border, backgroundColor: distortionId === d.id ? "#f59e0b10" : colors.card }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: distortionId === d.id ? "#f59e0b" : colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold" }}>{d.label}</Text>
                    {distortionId === d.id && <Icon name="check" size={14} color="#f59e0b" />}
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>{d.desc}</Text>
                </TouchableOpacity>
              ))}
              <Button label="Continue" onPress={() => setStep("REFRAME")} disabled={!distortionId} fullWidth style={{ marginTop: 4 }} />
            </View>
          )}

          {/* REFRAME */}
          {step === "REFRAME" && selectedDistortion && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Write the rational reframe</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>What would your most objective, disciplined self say back to that thought?</Text>
              </View>
              <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Evidence-based counter — {selectedDistortion.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, fontStyle: "italic" }}>
                  "{selectedDistortion.counter}"
                </Text>
                <TouchableOpacity onPress={() => setRationalReframe(selectedDistortion.counter)} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Use this as my reframe →</Text>
                </TouchableOpacity>
              </View>
              {selectedVoice && (
                <View style={[styles.infoBanner, { backgroundColor: `${selectedVoice.color}08`, borderColor: `${selectedVoice.color}20` }]}>
                  <Text style={{ color: selectedVoice.color, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {selectedVoice.label} coaching
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 }}>
                    {selectedVoice.coaching}
                  </Text>
                </View>
              )}
              <TextInput
                value={rationalReframe} onChangeText={setRationalReframe}
                placeholder="Or write your own reframe..." placeholderTextColor={colors.mutedForeground}
                multiline numberOfLines={4}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, minHeight: 100 }]}
              />
              <Button label="Continue" onPress={() => setStep("ACTION")} disabled={rationalReframe.trim().length < 5} fullWidth />
            </View>
          )}

          {/* ACTION */}
          {step === "ACTION" && (
            <View style={{ gap: 8 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 4 }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Commit to one action</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  The CBT cycle closes with a behavioral commitment. Choosing an action re-engages agency — you stop reacting and start deciding.
                </Text>
              </View>
              {ACTIONS.map(a => (
                <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={() => { setAction(a.id); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, { flexDirection: "row", alignItems: "center", gap: 12, borderColor: action === a.id ? colors.primary : colors.border, backgroundColor: action === a.id ? `${colors.primary}12` : colors.card }]}
                >
                  <Icon name={a.icon} size={18} color={action === a.id ? colors.primary : colors.mutedForeground} />
                  <Text style={{ color: action === a.id ? colors.primary : colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }}>{a.label}</Text>
                  {action === a.id && <Icon name="check" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              <Button label="Complete Record" onPress={handleComplete} disabled={!action} fullWidth style={{ marginTop: 8 }} />
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  /* ── LIST VIEW ───────────────────────────────────────────── */
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Thought Lab</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>
          CBT · Rande Howell · somatic interruption
        </Text>
      </View>

      <View style={{ padding: 14, borderRadius: 12, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20`, gap: 6 }}>
        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>8-step protocol</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
          Body Scan → Emotion → Automatic Thought → Identify the Voice (Inner Critic / Orphan / Survival Brain / Entitled Ego) → Distortion → Reframe → Action. Naming interrupts the hijack. The prefrontal cortex re-engages when you observe rather than react.
        </Text>
      </View>

      {/* Micro Mode — fast 3-tap in-session interrupt */}
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { setMicroVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
          style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: "#f59e0b40", backgroundColor: "#f59e0b08", flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f59e0b15", borderWidth: 1.5, borderColor: "#f59e0b40", alignItems: "center", justifyContent: "center" }}>
            <Feather name="zap" size={16} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f59e0b", fontSize: 15, fontFamily: "Inter_700Bold" }}>Micro Mode</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              3 taps · 15 seconds · emotion → voice → reframe
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#f59e0b60" />
        </TouchableOpacity>

        <Button
          label="Start Full Thought Record"
          onPress={() => { setIsActive(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          icon={<Icon name="zap" size={14} color={colors.primaryForeground} />}
          variant="secondary"
          fullWidth
        />
      </View>

      <MicroMode visible={microVisible} onClose={() => setMicroVisible(false)} />

      {records.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionLabel text={`Previous Records (${records.length})`} />
          {records.slice(0, 10).map(record => {
            const isExpanded = expandedId === record.id;
            const emotion = EMOTIONS.find(e => e.id === record.emotion);
            const distortion = DISTORTIONS.find(d => d.id === record.distortionId);
            const voice = VOICES.find(v => v.id === record.voiceId);
            const bodyLoc = BODY_LOCATIONS.find(b => b.id === record.bodyLocation);
            const date = new Date(record.createdAt);
            const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <TouchableOpacity key={record.id} activeOpacity={0.8}
                onPress={() => setExpandedId(isExpanded ? null : record.id)}
                style={{ borderRadius: 12, borderWidth: 1, borderColor: isExpanded ? colors.primary : colors.border, backgroundColor: colors.card, overflow: "hidden" }}
              >
                <View style={{ padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: emotion?.color ?? colors.primary, marginTop: 5 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: emotion?.color ?? colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {emotion?.label ?? record.emotion}
                      {voice ? ` · ${voice.label}` : ""}
                      {distortion ? ` · ${distortion.label}` : ""}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                      {dateStr} at {timeStr}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
                {isExpanded && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {bodyLoc && bodyLoc.id !== "NONE" && (
                      <View>
                        <Text style={{ color: "#3b82f6", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginTop: 10 }}>Body</Text>
                        <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>{bodyLoc.label} — tension {record.bodyTension}/10</Text>
                      </View>
                    )}
                    {voice && (
                      <View>
                        <Text style={{ color: voice.color, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>Voice</Text>
                        <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>{voice.label} — {voice.desc}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>Thought</Text>
                      <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, fontStyle: "italic" }}>"{record.automaticThought}"</Text>
                    </View>
                    {record.rationalReframe ? (
                      <View>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>Reframe</Text>
                        <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>{record.rationalReframe}</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity onPress={() => deleteRecord(record.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Icon name="trash-2" size={13} color={colors.destructive} />
                      <Text style={{ color: colors.destructive, fontSize: 12, fontFamily: "Inter_500Medium" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  doneCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  infoBanner: { padding: 12, borderRadius: 10, borderWidth: 1 },
  optionCard: { padding: 14, borderRadius: 10, borderWidth: 1.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top", minHeight: 80 },
});
