import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { Button, Card, SectionLabel, webTop, webBottom } from "@/components/UI";

const STORAGE_KEY = "cbt-thought-records-mobile";

interface ThoughtRecord {
  id: string;
  createdAt: string;
  situation: string;
  emotion: string;
  emotionIntensity: number;
  automaticThought: string;
  distortionId: string;
  rationalReframe: string;
  action: string;
}

type Step = "SITUATION" | "EMOTION" | "THOUGHT" | "DISTORTION" | "REFRAME" | "ACTION" | "DONE";

const SITUATIONS = [
  { id: "BEFORE_TRADE", label: "Before entering a trade", sub: "Urge, FOMO, or setup temptation" },
  { id: "DURING_TRADE", label: "During a live trade", sub: "Trade moving against me, urge to interfere" },
  { id: "AFTER_LOSS", label: "After a loss", sub: "Anger, urge to revenge trade" },
  { id: "AFTER_WIN", label: "After a win", sub: "Overconfidence, urge to overtrade" },
  { id: "NO_SETUPS", label: "No setups visible", sub: "Boredom, forcing trades" },
  { id: "OFF_SESSION", label: "Outside trading hours", sub: "Obsessing over charts" },
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
];

const DISTORTIONS = [
  { id: "FOMO", label: "FOMO", desc: "Fear of missing the move", counter: "There will always be another setup. Missing one trade is irrelevant over 100." },
  { id: "LOSS_AVERSION", label: "Loss Aversion", desc: "Can't close the losing trade", counter: "An unrealized loss is already real. Closing protects capital." },
  { id: "REVENGE", label: "Revenge Thinking", desc: "Need to get back what market took", counter: "The market took nothing. You paid the cost of a trade that didn't work." },
  { id: "OVERCONFIDENCE", label: "Overconfidence", desc: "Certainty about an uncertain outcome", counter: "No one knows. You have a probability, not a guarantee." },
  { id: "CATASTROPHIZING", label: "Catastrophizing", desc: "One loss = total disaster", counter: "One loss is one data point. Your risk management caps all damage." },
  { id: "ALL_OR_NOTHING", label: "All-or-Nothing", desc: "Black and white thinking", counter: "Professional recovery is gradual. One trade cannot recover everything." },
  { id: "RECENCY_BIAS", label: "Recency Bias", desc: "Recent streak overrides probability", counter: "Three losses in a row is statistically normal. The edge exists over 100+ trades." },
  { id: "SUNK_COST", label: "Sunk Cost", desc: "Holding because you've already lost too much", counter: "Ask: would I enter this trade right now at this price? If no — exit." },
  { id: "CONFIRMATION_BIAS", label: "Confirmation Bias", desc: "Only seeing what confirms the trade", counter: "Look at the chart as if you had no position. What does it tell you?" },
  { id: "EMOTIONAL_REASONING", label: "Emotional Reasoning", desc: "Feelings treated as market facts", counter: "Feelings are neurochemistry, not market data. What does your system say?" },
];

const ACTIONS = [
  { id: "CLOSE_CHARTS", label: "Close charts — 10 minutes", icon: "x-circle" as const },
  { id: "BREATHE", label: "4-7-8 breathing — 3 cycles", icon: "wind" as const },
  { id: "WALK_AWAY", label: "Step away from the screen", icon: "log-out" as const },
  { id: "REVIEW_RULES", label: "Re-read my trading rules", icon: "book-open" as const },
  { id: "OBSERVE", label: "Observe the thought — do nothing", icon: "eye" as const },
  { id: "SMALL_SIZE", label: "If I trade, cut size by 50%", icon: "minimize-2" as const },
];

const QUICK_THOUGHTS = [
  "I need to get my money back right now.",
  "If I don't enter now I'll miss the whole move.",
  "This trade has to work — I've lost too much today.",
  "I can't accept this loss — I'll wait for it to come back.",
  "After 3 losses I'm due for a win.",
  "I feel an overwhelming urge to trade something.",
];

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

function StepBar({ current, total }: { current: number; total: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 4, marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.stepDot, {
          flex: 1,
          backgroundColor: i < current ? colors.primary : i === current ? `${colors.primary}60` : colors.secondary,
        }]} />
      ))}
    </View>
  );
}

export default function ThoughtScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<Step>("SITUATION");
  const [situation, setSituation] = useState("");
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState(6);
  const [automaticThought, setAutomaticThought] = useState("");
  const [distortionId, setDistortionId] = useState("");
  const [rationalReframe, setRationalReframe] = useState("");
  const [action, setAction] = useState("");
  const [records, setRecords] = useState<ThoughtRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const steps: Step[] = ["SITUATION", "EMOTION", "THOUGHT", "DISTORTION", "REFRAME", "ACTION"];
  const stepIndex = steps.indexOf(step);

  const reset = () => {
    setStep("SITUATION");
    setSituation("");
    setEmotion("");
    setEmotionIntensity(6);
    setAutomaticThought("");
    setDistortionId("");
    setRationalReframe("");
    setAction("");
    setIsActive(false);
  };

  const handleComplete = async () => {
    const record: ThoughtRecord = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      situation, emotion, emotionIntensity,
      automaticThought, distortionId, rationalReframe, action,
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

  if (isActive && step === "DONE") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, gap: 24 }}>
          <View style={[styles.doneCircle, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}18` }]}>
            <Icon name="check" size={36} color={colors.primary} />
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>
              Thought Record Complete
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" }}>
              Cortex re-engaged.
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 }}>
              You named the distortion. You wrote the reframe. The amygdala cannot sustain its hijack when the prefrontal cortex is active.
            </Text>
          </View>
          {selectedDistortion && (
            <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Your counter — {selectedDistortion.label}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, fontStyle: "italic" }}>
                "{selectedDistortion.counter}"
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Button label="New Record" variant="ghost" onPress={reset} style={{ flex: 1 }} />
            <Button label="View Records" onPress={reset} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (isActive) {
    const stepLabels: Record<Step, string> = {
      SITUATION: "What triggered this?",
      EMOTION: "What are you feeling?",
      THOUGHT: "What is the automatic thought?",
      DISTORTION: "Name the cognitive distortion",
      REFRAME: "Write the rational reframe",
      ACTION: "Commit to an action",
      DONE: "",
    };

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
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
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  What is happening right now?
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  The specific context that triggered this thought or feeling.
                </Text>
              </View>
              {SITUATIONS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.8}
                  onPress={() => { setSituation(s.id); setStep("EMOTION"); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, {
                    borderColor: situation === s.id ? colors.primary : colors.border,
                    backgroundColor: situation === s.id ? `${colors.primary}12` : colors.card,
                  }]}
                >
                  <Text style={{ color: situation === s.id ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                    {s.label}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                    {s.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* EMOTION */}
          {step === "EMOTION" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 4 }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  What emotion is present?
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  Naming the emotion reduces its intensity by up to 50%.
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EMOTIONS.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => { setEmotion(e.id); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: emotion === e.id ? e.color : colors.border,
                      backgroundColor: emotion === e.id ? `${e.color}18` : colors.secondary,
                    }}
                  >
                    <Text style={{ color: emotion === e.id ? e.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {emotion && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                    Intensity — how strong?
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const filled = n <= emotionIntensity;
                      const barColor = emotionIntensity >= 8 ? "#ef4444" : emotionIntensity >= 6 ? "#f97316" : emotionIntensity >= 4 ? "#f59e0b" : colors.primary;
                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => { setEmotionIntensity(n); Haptics.selectionAsync(); }}
                          style={{ flex: 1, height: 32, borderRadius: 4, backgroundColor: filled ? barColor : colors.secondary }}
                        />
                      );
                    })}
                  </View>
                  <Text style={{
                    color: emotionIntensity >= 8 ? "#ef4444" : emotionIntensity >= 6 ? "#f97316" : colors.primary,
                    fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center"
                  }}>
                    {emotionIntensity}/10 — {emotionIntensity >= 8 ? "Intense — high impairment" : emotionIntensity >= 6 ? "Strong — be careful" : emotionIntensity >= 4 ? "Moderate" : "Mild"}
                  </Text>
                </View>
              )}

              <Button
                label="Continue"
                onPress={() => setStep("THOUGHT")}
                disabled={!emotion}
                fullWidth
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {/* THOUGHT */}
          {step === "THOUGHT" && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  What is the exact thought running through your mind?
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  Write it word-for-word. No editing — write what the emotional brain is actually saying.
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 }}>
                Quick select
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {QUICK_THOUGHTS.map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { setAutomaticThought(t); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: automaticThought === t ? "#f59e0b80" : colors.border,
                      backgroundColor: automaticThought === t ? "#f59e0b18" : colors.secondary,
                    }}
                  >
                    <Text style={{ color: automaticThought === t ? "#f59e0b" : colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={automaticThought}
                onChangeText={setAutomaticThought}
                placeholder="Or write the exact thought..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              />
              <Button
                label="Continue"
                onPress={() => setStep("DISTORTION")}
                disabled={automaticThought.trim().length < 3}
                fullWidth
              />
            </View>
          )}

          {/* DISTORTION */}
          {step === "DISTORTION" && (
            <View style={{ gap: 8 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  Name the cognitive distortion
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  Identifying the distortion type interrupts the automatic pattern.
                </Text>
              </View>
              <View style={[styles.infoBanner, { backgroundColor: "#f59e0b10", borderColor: "#f59e0b30" }]}>
                <Text style={{ color: "#f59e0b", fontSize: 12, fontFamily: "Inter_500Medium" }}>
                  Your thought: <Text style={{ color: colors.foreground, fontStyle: "italic" }}>"{automaticThought}"</Text>
                </Text>
              </View>
              {DISTORTIONS.map(d => (
                <TouchableOpacity
                  key={d.id}
                  activeOpacity={0.8}
                  onPress={() => { setDistortionId(d.id); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, {
                    borderColor: distortionId === d.id ? "#f59e0b" : colors.border,
                    backgroundColor: distortionId === d.id ? "#f59e0b10" : colors.card,
                  }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: distortionId === d.id ? "#f59e0b" : colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold" }}>
                      {d.label}
                    </Text>
                    {distortionId === d.id && <Icon name="check" size={14} color="#f59e0b" />}
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                    {d.desc}
                  </Text>
                </TouchableOpacity>
              ))}
              <Button
                label="Continue"
                onPress={() => setStep("REFRAME")}
                disabled={!distortionId}
                fullWidth
                style={{ marginTop: 4 }}
              />
            </View>
          )}

          {/* REFRAME */}
          {step === "REFRAME" && selectedDistortion && (
            <View style={{ gap: 10 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  Write the rational reframe
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  What would your best, most objective self say back to that thought?
                </Text>
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
              <TextInput
                value={rationalReframe}
                onChangeText={setRationalReframe}
                placeholder="Or write your own — in your own words it's more powerful..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, minHeight: 100 }]}
              />
              <Button
                label="Continue"
                onPress={() => setStep("ACTION")}
                disabled={rationalReframe.trim().length < 5}
                fullWidth
              />
            </View>
          )}

          {/* ACTION */}
          {step === "ACTION" && (
            <View style={{ gap: 8 }}>
              <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 4 }]}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
                  Commit to an action
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  A committed action closes the loop and prevents the emotional brain from re-engaging.
                </Text>
              </View>
              {ACTIONS.map(a => (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => { setAction(a.id); Haptics.selectionAsync(); }}
                  style={[styles.optionCard, {
                    borderColor: action === a.id ? colors.primary : colors.border,
                    backgroundColor: action === a.id ? `${colors.primary}12` : colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }]}
                >
                  <Icon name={a.icon} size={18} color={action === a.id ? colors.primary : colors.mutedForeground} />
                  <Text style={{ color: action === a.id ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 }}>
                    {a.label}
                  </Text>
                  {action === a.id && <Icon name="check" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              <Button
                label="Complete Record"
                onPress={handleComplete}
                disabled={!action}
                fullWidth
                icon={<Icon name="check" size={14} color={colors.primaryForeground} />}
                style={{ marginTop: 4 }}
              />
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // List view
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Thought Record</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            Real-time CBT — name, reframe, act
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setIsActive(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Icon name="zap" size={14} color={colors.primary} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>
              When to use this
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
              The moment you feel an urge, fear, or emotional pull — before you act on it. Writing activates the prefrontal cortex and directly counteracts amygdala hijack.
            </Text>
          </View>
        </View>
      </View>

      {records.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
          <Icon name="edit-3" size={40} color={colors.border} />
          <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>No thought records yet</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 }}>
            The next time you feel an emotional pull toward a trade, do a record instead of acting.
          </Text>
          <Button
            label="Start First Record"
            variant="ghost"
            onPress={() => { setIsActive(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            icon={<Icon name="plus" size={14} color={colors.primary} />}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 }}>
            {records.length} record{records.length !== 1 ? "s" : ""}
          </Text>
          {records.map(record => {
            const dist = DISTORTIONS.find(d => d.id === record.distortionId);
            const emotMeta = EMOTIONS.find(e => e.id === record.emotion);
            const isExpanded = expandedId === record.id;
            const intensityColor = record.emotionIntensity >= 8 ? "#ef4444" : record.emotionIntensity >= 6 ? "#f97316" : record.emotionIntensity >= 4 ? "#f59e0b" : colors.primary;
            const dateStr = new Date(record.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const timeStr = new Date(record.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

            return (
              <TouchableOpacity
                key={record.id}
                activeOpacity={0.9}
                onPress={() => setExpandedId(isExpanded ? null : record.id)}
                style={[styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {dist && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#f59e0b18", borderWidth: 1, borderColor: "#f59e0b40" }}>
                          <Text style={{ color: "#f59e0b", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{dist.label}</Text>
                        </View>
                      )}
                      {emotMeta && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: `${emotMeta.color}18`, borderWidth: 1, borderColor: `${emotMeta.color}40` }}>
                          <Text style={{ color: emotMeta.color, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{emotMeta.label}</Text>
                        </View>
                      )}
                      <Text style={{ color: intensityColor, fontSize: 12, fontFamily: "Inter_700Bold" }}>{record.emotionIntensity}/10</Text>
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" }} numberOfLines={isExpanded ? undefined : 1}>
                      "{record.automaticThought}"
                    </Text>
                    {isExpanded && record.rationalReframe && (
                      <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20`, marginTop: 4 }]}>
                        <Text style={{ color: colors.primary, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                          Rational Reframe
                        </Text>
                        <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>
                          "{record.rationalReframe}"
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{dateStr}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{timeStr}</Text>
                    <TouchableOpacity onPress={() => deleteRecord(record.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Icon name="trash-2" size={14} color={`${colors.mutedForeground}60`} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepDot: { height: 4, borderRadius: 2 },
  optionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recordRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
