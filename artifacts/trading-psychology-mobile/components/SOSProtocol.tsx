import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

type SOSPhase = "INTERRUPT" | "DISCHARGE" | "REFRAME";

const INTERRUPT_STATEMENTS = [
  "You are in survival mode.",
  "Do not trade right now.",
  "This state has no edge.",
  "Your amygdala is active.",
  "The prefrontal cortex is offline.",
  "Wait. Breathe. Regulate.",
];

const DISCHARGE_STEPS = [
  {
    id: "jaw",
    title: "Release your jaw",
    cue: "Unclench. Let your mouth open slightly. Feel the muscles release.",
    icon: "smile" as const,
  },
  {
    id: "shoulders",
    title: "Drop your shoulders",
    cue: "Roll them back and let them fall. Notice how high they were.",
    icon: "arrow-down" as const,
  },
  {
    id: "eyes",
    title: "Defocus your eyes",
    cue: "Look at a mid-distance point. Let your vision soften and go wide. This reduces threat focus directly.",
    icon: "eye" as const,
  },
  {
    id: "hands",
    title: "Open your hands",
    cue: "Uncurl your fingers. Place palms face-up on your lap. Clenched hands signal threat to the nervous system.",
    icon: "wind" as const,
  },
];

const REFRAME_TRUTHS = [
  "No trade is better than a bad trade.",
  "The market will be here tomorrow.",
  "My edge exists over 100 trades — not this one.",
  "Missing a trade costs nothing. A bad trade costs real money.",
  "The professionals I admire all walked away from days like this.",
];

interface SOSProtocolProps {
  visible: boolean;
  onClose: () => void;
  triggerReason?: string;
}

export function SOSProtocol({ visible, onClose, triggerReason }: SOSProtocolProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<SOSPhase>("INTERRUPT");
  const [interruptTimer, setInterruptTimer] = useState(30);
  const [interruptIdx, setInterruptIdx] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"INHALE" | "HOLD" | "EXHALE">("INHALE");
  const [breathTimer, setBreathTimer] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  const [dischargeIdx, setDischargeIdx] = useState(0);
  const [reframeIdx, setReframeIdx] = useState(0);
  const [done, setDone] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setPhase("INTERRUPT");
      setInterruptTimer(30);
      setInterruptIdx(0);
      setBreathPhase("INHALE");
      setBreathTimer(4);
      setBreathCycles(0);
      setDischargeIdx(0);
      setReframeIdx(Math.floor(Math.random() * REFRAME_TRUTHS.length));
      setDone(false);
      scaleAnim.setValue(0.7);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  // INTERRUPT: 30s countdown + rotating cold statements
  useEffect(() => {
    if (!visible || phase !== "INTERRUPT") return;
    const interval = setInterval(() => {
      setInterruptTimer(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
      setInterruptIdx(i => (i + 1) % INTERRUPT_STATEMENTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [visible, phase]);

  // DISCHARGE: 4-7-8 breathing (1 cycle required)
  useEffect(() => {
    if (!visible || phase !== "DISCHARGE") return;
    const PHASES = [
      { phase: "INHALE" as const, duration: 4 },
      { phase: "HOLD" as const, duration: 7 },
      { phase: "EXHALE" as const, duration: 8 },
    ];
    let phaseIdx = PHASES.findIndex(p => p.phase === breathPhase);
    if (phaseIdx < 0) phaseIdx = 0;
    let remaining = PHASES[phaseIdx].duration;
    setBreathTimer(remaining);

    if (breathPhase === "INHALE") {
      Animated.timing(scaleAnim, { toValue: 1, duration: 4000, useNativeDriver: true }).start();
    } else if (breathPhase === "EXHALE") {
      Animated.timing(scaleAnim, { toValue: 0.6, duration: 8000, useNativeDriver: true }).start();
    }

    const interval = setInterval(() => {
      remaining -= 1;
      setBreathTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) {
          setBreathCycles(c => {
            const next = c + 1;
            if (next >= 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return next;
          });
        }
        remaining = PHASES[phaseIdx].duration;
        setBreathPhase(PHASES[phaseIdx].phase);
        setBreathTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, phase, breathPhase]);

  const ringColor = breathPhase === "INHALE" ? "#3b82f6" : breathPhase === "HOLD" ? "#22d3ee" : "#22c55e";
  const phaseLabel = breathPhase === "INHALE" ? "Breathe In" : breathPhase === "HOLD" ? "Hold" : "Breathe Out";
  const topPad = Platform.OS === "web" ? 60 : insets.top + 16;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <Animated.View style={{ flex: 1, backgroundColor: "#060608", opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" }} />
              <Text style={{ color: "#ef4444", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" }}>
                SOS Protocol
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="x" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Phase indicator */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
            {(["INTERRUPT", "DISCHARGE", "REFRAME"] as SOSPhase[]).map((p, i) => {
              const phaseOrder = ["INTERRUPT", "DISCHARGE", "REFRAME"];
              const current = phaseOrder.indexOf(phase);
              const thisIdx = phaseOrder.indexOf(p);
              const isActive = p === phase;
              const isPast = thisIdx < current;
              const colors2 = ["#ef4444", "#3b82f6", "#22c55e"];
              return (
                <View key={p} style={{ flex: 1, gap: 4 }}>
                  <View style={{
                    height: 3, borderRadius: 2,
                    backgroundColor: isPast ? colors2[i] : isActive ? `${colors2[i]}60` : "#1a1a1a",
                  }} />
                  <Text style={{ color: isActive ? colors2[i] : "#333", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                    {i + 1}. {p}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── PHASE 1: INTERRUPT ─────────────────────────────── */}
          {phase === "INTERRUPT" && (
            <View style={{ gap: 24 }}>
              <View style={{ alignItems: "center", gap: 20, paddingVertical: 16 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#ef444415", borderWidth: 1.5, borderColor: "#ef444440", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#ef4444", fontSize: 32, fontFamily: "Inter_700Bold" }}>{interruptTimer}</Text>
                </View>
                <Text style={{ color: "#ef4444", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 30 }}>
                  {INTERRUPT_STATEMENTS[interruptIdx]}
                </Text>
                {triggerReason && (
                  <Text style={{ color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", fontStyle: "italic" }}>
                    Triggered by: {triggerReason}
                  </Text>
                )}
              </View>

              <View style={{ gap: 10 }}>
                {[
                  "Your amygdala has fired. Cortisol is flooding your system.",
                  "The prefrontal cortex — which trades rationally — is temporarily offline.",
                  "Any trade taken in this state is from the survival brain, not the trader brain.",
                ].map((line, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 10, backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#1a1a1a" }}>
                    <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 1 }}>{i + 1}</Text>
                    <Text style={{ color: "#666", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 }}>{line}</Text>
                  </View>
                ))}
              </View>

              <Button
                label={interruptTimer > 0 ? `Wait ${interruptTimer}s...` : "Continue → Discharge"}
                disabled={interruptTimer > 0}
                onPress={() => {
                  setPhase("DISCHARGE");
                  setBreathPhase("INHALE");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                fullWidth
              />
            </View>
          )}

          {/* ── PHASE 2: DISCHARGE ─────────────────────────────── */}
          {phase === "DISCHARGE" && (
            <View style={{ gap: 24 }}>
              <View>
                <Text style={{ color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" }}>Phase 2 — Discharge</Text>
                <Text style={{ color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  Release the physical activation first. Then one breath cycle. The body regulates the brain — not the other way around.
                </Text>
              </View>

              {/* Body discharge steps */}
              <View style={{ gap: 8 }}>
                {DISCHARGE_STEPS.map((step, i) => {
                  const isActive = i === dischargeIdx;
                  const isDone = i < dischargeIdx;
                  return (
                    <TouchableOpacity
                      key={step.id}
                      activeOpacity={isActive ? 0.8 : 1}
                      onPress={() => {
                        if (!isActive) return;
                        Haptics.selectionAsync();
                        setDischargeIdx(i + 1);
                      }}
                      style={{
                        flexDirection: "row", gap: 14, padding: 14, borderRadius: 12, borderWidth: 1.5,
                        borderColor: isDone ? "#22c55e30" : isActive ? "#3b82f640" : "#111",
                        backgroundColor: isDone ? "#22c55e08" : isActive ? "#3b82f608" : "#0a0a0a",
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: isDone ? "#22c55e" : isActive ? "#3b82f620" : "#111",
                        borderWidth: isDone ? 0 : 1.5,
                        borderColor: isActive ? "#3b82f6" : "#222",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone
                          ? <Feather name="check" size={14} color="#fff" />
                          : <Feather name={step.icon} size={14} color={isActive ? "#3b82f6" : "#333"} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isDone ? "#22c55e" : isActive ? "#fff" : "#333", fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 }}>
                          {step.title}
                        </Text>
                        <Text style={{ color: isActive ? "#888" : "#333", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                          {step.cue}
                        </Text>
                        {isActive && (
                          <Text style={{ color: "#3b82f6", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 8 }}>
                            Tap when done →
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 1 breathing cycle after discharge */}
              {dischargeIdx >= DISCHARGE_STEPS.length && (
                <View style={{ gap: 16 }}>
                  <Text style={{ color: "#3b82f6", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
                    Body released. Now one full 4-7-8 breath cycle.
                  </Text>
                  <View style={{ alignItems: "center", gap: 12 }}>
                    <Animated.View style={{
                      width: 110, height: 110, borderRadius: 55,
                      borderWidth: 3, borderColor: ringColor,
                      backgroundColor: `${ringColor}15`,
                      alignItems: "center", justifyContent: "center",
                      transform: [{ scale: scaleAnim }],
                    }}>
                      <Text style={{ color: ringColor, fontSize: 32, fontFamily: "Inter_700Bold" }}>{breathTimer}</Text>
                      <Text style={{ color: ringColor, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>{phaseLabel}</Text>
                    </Animated.View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {(["INHALE", "HOLD", "EXHALE"] as const).map(p => (
                        <View key={p} style={{
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                          backgroundColor: breathPhase === p ? `${ringColor}15` : "transparent",
                          borderWidth: 1, borderColor: breathPhase === p ? `${ringColor}60` : "transparent",
                        }}>
                          <Text style={{ color: breathPhase === p ? ringColor : "#333", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>
                            {p === "INHALE" ? "IN 4s" : p === "HOLD" ? "HOLD 7s" : "OUT 8s"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Button
                    label={breathCycles >= 1 ? "Continue → Reframe" : `Complete the breath cycle...`}
                    disabled={breathCycles < 1}
                    onPress={() => {
                      setPhase("REFRAME");
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    fullWidth
                  />
                </View>
              )}

              {dischargeIdx < DISCHARGE_STEPS.length && (
                <Text style={{ color: "#333", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                  Complete each body release above, then breathe.
                </Text>
              )}
            </View>
          )}

          {/* ── PHASE 3: REFRAME ───────────────────────────────── */}
          {phase === "REFRAME" && (
            <View style={{ gap: 24 }}>
              <View>
                <Text style={{ color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" }}>Phase 3 — Reframe</Text>
                <Text style={{ color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  One truth. Read it three times. Let it land.
                </Text>
              </View>

              <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, borderColor: "#22c55e20", backgroundColor: "#22c55e06" }}>
                <Text style={{ color: "#22c55e", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>
                  The Reframe
                </Text>
                <Text style={{ color: "#ffffff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 32 }}>
                  "{REFRAME_TRUTHS[reframeIdx]}"
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {[
                  "You completed the SOS protocol.",
                  "Your nervous system has been partially regulated.",
                  "You now have a choice — not a compulsion.",
                ].map((line, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Feather name="check" size={14} color="#22c55e" style={{ marginTop: 2 }} />
                    <Text style={{ color: "#666", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 }}>{line}</Text>
                  </View>
                ))}
              </View>

              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                  style={{ padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: "#22c55e30", backgroundColor: "#22c55e0a" }}
                >
                  <Text style={{ color: "#22c55e", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 }}>Return — 50% Size Only</Text>
                  <Text style={{ color: "#555", fontSize: 12, fontFamily: "Inter_400Regular" }}>
                    If I trade, I halve my normal position. State was activated.
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onClose(); }}
                  style={{ padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: "#f59e0b30", backgroundColor: "#f59e0b0a" }}
                >
                  <Text style={{ color: "#f59e0b", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 }}>Step Away — 20 Minutes</Text>
                  <Text style={{ color: "#555", fontSize: 12, fontFamily: "Inter_400Regular" }}>
                    Close charts. No phone. Return only when the urge is gone.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
