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
import { Icon } from "@/components/Icon";
import { Button } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

type ProtocolStep = "ACKNOWLEDGE" | "BREATHE" | "GROUND" | "ASSESS" | "DECIDE";

const GROUNDING_STEPS = [
  { count: 5, sense: "SEE", prompt: "Name 5 things you can see right now." },
  { count: 4, sense: "TOUCH", prompt: "Name 4 things you can physically feel — chair, floor, keyboard, breath." },
  { count: 3, sense: "HEAR", prompt: "Name 3 sounds you can hear right now." },
  { count: 2, sense: "SMELL", prompt: "Name 2 things you can smell, or recall 2 calming scents." },
  { count: 1, sense: "TASTE", prompt: "Notice 1 taste in your mouth. Breathe slowly." },
];

const TRADER_STATE_MARKERS = [
  "My breathing is slow and controlled.",
  "I can observe my setup objectively, without urgency.",
  "I accept that I cannot control this trade's outcome.",
  "My size is appropriate regardless of recent results.",
  "I am willing to miss this trade and wait for the next one.",
];

type Decision = "TRADE_REDUCED" | "STEP_AWAY" | "END_SESSION";

interface HijackProtocolProps {
  visible: boolean;
  onClose: (decision: Decision | null) => void;
  triggerReason?: string;
}

export function HijackProtocol({ visible, onClose, triggerReason }: HijackProtocolProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<ProtocolStep>("ACKNOWLEDGE");
  const [breathPhase, setBreathPhase] = useState<"IDLE" | "INHALE" | "HOLD" | "EXHALE">("IDLE");
  const [breathCycles, setBreathCycles] = useState(0);
  const [breathTimer, setBreathTimer] = useState(0);
  const [groundingIdx, setGroundingIdx] = useState(0);
  const [checkedMarkers, setCheckedMarkers] = useState<Set<number>>(new Set());
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep("ACKNOWLEDGE");
      setBreathPhase("IDLE");
      setBreathCycles(0);
      setGroundingIdx(0);
      setCheckedMarkers(new Set());
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (breathPhase === "IDLE") {
      Animated.timing(scaleAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }).start();
      return;
    }
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
      Animated.timing(scaleAnim, { toValue: 0.65, duration: 8000, useNativeDriver: true }).start();
    }

    const interval = setInterval(() => {
      remaining -= 1;
      setBreathTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) {
          setBreathCycles(c => {
            const next = c + 1;
            if (next >= 3) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return next;
          });
        }
        remaining = PHASES[phaseIdx].duration;
        setBreathPhase(PHASES[phaseIdx].phase);
        setBreathTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [breathPhase]);

  const ringColor = breathPhase === "INHALE" ? "#3b82f6" : breathPhase === "HOLD" ? "#22d3ee" : "#22c55e";
  const phaseLabel = breathPhase === "INHALE" ? "Breathe In" : breathPhase === "HOLD" ? "Hold" : breathPhase === "EXHALE" ? "Breathe Out" : "";

  const topPad = Platform.OS === "web" ? 60 : insets.top + 16;

  const steps: ProtocolStep[] = ["ACKNOWLEDGE", "BREATHE", "GROUND", "ASSESS", "DECIDE"];
  const stepIdx = steps.indexOf(step);

  function StepBar() {
    return (
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <View key={s} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= stepIdx ? "#ef4444" : colors.border,
          }} />
        ))}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <Animated.View style={{ flex: 1, backgroundColor: "#0a0a0a", opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" }} />
              <Text style={{ color: "#ef4444", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" }}>
                Hijack Protocol
              </Text>
            </View>
            <TouchableOpacity onPress={() => onClose(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <StepBar />

          {/* ACKNOWLEDGE */}
          {step === "ACKNOWLEDGE" && (
            <View style={{ gap: 20 }}>
              <View style={{ alignItems: "center", paddingVertical: 24, gap: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#ef444418", borderWidth: 1.5, borderColor: "#ef444440", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="alert-octagon" size={32} color="#ef4444" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" }}>
                  Your brain has been hijacked.
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 }}>
                  This is not a personal failure. This is biology. Your amygdala has detected a threat and flooded your system with cortisol, disabling the prefrontal cortex — the part of your brain that trades rationally.
                </Text>
              </View>

              {triggerReason && (
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: "#ef444410", borderWidth: 1, borderColor: "#ef444430" }}>
                  <Text style={{ color: "#ef4444", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    Trigger
                  </Text>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular" }}>{triggerReason}</Text>
                </View>
              )}

              <View style={{ gap: 10 }}>
                {[
                  { icon: "x-circle", text: "You cannot trade rationally right now. Any trade you take is from the survival brain." },
                  { icon: "check-circle", text: "This state is temporary. Your nervous system CAN be regulated." },
                  { icon: "shield", text: "This protocol will take 4–6 minutes. It has been designed to return you to the trader state." },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <Icon name={item.icon} size={16} color={item.icon === "x-circle" ? "#ef4444" : item.icon === "check-circle" ? "#22c55e" : colors.primary} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 }}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                label="Begin Protocol"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep("BREATHE");
                  setBreathPhase("INHALE");
                }}
                fullWidth
              />
            </View>
          )}

          {/* BREATHE */}
          {step === "BREATHE" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "Inter_700Bold" }}>Step 1 — Biological Reset</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  4-7-8 breathing activates the vagus nerve and parasympathetic system. Complete 3 full cycles. You cannot shortcut this step.
                </Text>
              </View>

              <View style={{ alignItems: "center", gap: 20, paddingVertical: 16 }}>
                <Animated.View style={{
                  width: 120, height: 120, borderRadius: 60,
                  borderWidth: 3, borderColor: ringColor,
                  backgroundColor: `${ringColor}18`,
                  alignItems: "center", justifyContent: "center",
                  transform: [{ scale: scaleAnim }],
                }}>
                  <Text style={{ color: ringColor, fontSize: 34, fontFamily: "Inter_700Bold" }}>{breathTimer}</Text>
                  <Text style={{ color: ringColor, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>{phaseLabel}</Text>
                </Animated.View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  {(["INHALE", "HOLD", "EXHALE"] as const).map(p => (
                    <View key={p} style={{
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                      borderWidth: 1,
                      borderColor: breathPhase === p ? `${ringColor}60` : "transparent",
                      backgroundColor: breathPhase === p ? `${ringColor}15` : "transparent",
                    }}>
                      <Text style={{ color: breathPhase === p ? ringColor : colors.mutedForeground + "60", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                        {p === "INHALE" ? "IN · 4s" : p === "HOLD" ? "HOLD · 7s" : "OUT · 8s"}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{
                      width: 32, height: 32, borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: breathCycles > i ? "#22c55e" : colors.border,
                      backgroundColor: breathCycles > i ? "#22c55e18" : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {breathCycles > i && <Icon name="check" size={14} color="#22c55e" />}
                    </View>
                  ))}
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                  {breathCycles}/3 cycles complete
                </Text>
              </View>

              <Button
                label={breathCycles >= 3 ? "Continue → Grounding" : `Complete ${3 - breathCycles} more cycle${3 - breathCycles !== 1 ? "s" : ""}`}
                disabled={breathCycles < 3}
                onPress={() => {
                  setBreathPhase("IDLE");
                  setStep("GROUND");
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                fullWidth
              />
            </View>
          )}

          {/* GROUND */}
          {step === "GROUND" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "Inter_700Bold" }}>Step 2 — Grounding</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  5-4-3-2-1 grounding anchors you in the present and deactivates the threat response. Focus on each sense completely.
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {GROUNDING_STEPS.map((g, i) => {
                  const isActive = i === groundingIdx;
                  const isDone = i < groundingIdx;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={isActive ? 0.8 : 1}
                      onPress={() => {
                        if (isActive) {
                          Haptics.selectionAsync();
                          if (i < GROUNDING_STEPS.length - 1) {
                            setGroundingIdx(i + 1);
                          } else {
                            setGroundingIdx(GROUNDING_STEPS.length);
                          }
                        }
                      }}
                      style={{
                        padding: 14, borderRadius: 12, borderWidth: 1.5,
                        borderColor: isDone ? "#22c55e40" : isActive ? "#22d3ee60" : colors.border,
                        backgroundColor: isDone ? "#22c55e08" : isActive ? "#22d3ee10" : colors.card,
                        flexDirection: "row", gap: 12, alignItems: "flex-start",
                      }}
                    >
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: isDone ? "#22c55e" : isActive ? "#22d3ee20" : colors.secondary,
                        borderWidth: isDone ? 0 : 1.5,
                        borderColor: isActive ? "#22d3ee" : colors.border,
                        alignItems: "center", justifyContent: "center", marginTop: 1,
                      }}>
                        {isDone
                          ? <Icon name="check" size={12} color="#fff" />
                          : <Text style={{ color: isActive ? "#22d3ee" : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_700Bold" }}>{g.count}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isDone ? "#22c55e" : isActive ? "#22d3ee" : colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                          {g.count} things to {g.sense}
                        </Text>
                        <Text style={{ color: isActive ? colors.foreground : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                          {g.prompt}
                        </Text>
                        {isActive && (
                          <Text style={{ color: "#22d3ee", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 8 }}>
                            Tap when done →
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                label="Continue → Self-Assessment"
                disabled={groundingIdx < GROUNDING_STEPS.length}
                onPress={() => {
                  setStep("ASSESS");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                fullWidth
              />
            </View>
          )}

          {/* ASSESS */}
          {step === "ASSESS" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "Inter_700Bold" }}>Step 3 — Trader State Check</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  Check each statement you can honestly agree with right now. Rande Howell: "A professional trader trades from the observer state — not the emotional state."
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {TRADER_STATE_MARKERS.map((marker, i) => {
                  const checked = checkedMarkers.has(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCheckedMarkers(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        });
                      }}
                      style={{
                        flexDirection: "row", gap: 12, alignItems: "flex-start",
                        padding: 14, borderRadius: 12, borderWidth: 1.5,
                        borderColor: checked ? "#22c55e50" : colors.border,
                        backgroundColor: checked ? "#22c55e10" : colors.card,
                      }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        borderWidth: 1.5,
                        borderColor: checked ? "#22c55e" : colors.border,
                        backgroundColor: checked ? "#22c55e" : "transparent",
                        alignItems: "center", justifyContent: "center", marginTop: 1,
                      }}>
                        {checked && <Icon name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={{ color: checked ? colors.foreground : colors.mutedForeground, fontSize: 13, fontFamily: checked ? "Inter_500Medium" : "Inter_400Regular", flex: 1, lineHeight: 20 }}>
                        {marker}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{
                  color: checkedMarkers.size >= 4 ? "#22c55e" : checkedMarkers.size >= 2 ? "#f59e0b" : "#ef4444",
                  fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center"
                }}>
                  {checkedMarkers.size >= 4
                    ? `${checkedMarkers.size}/5 — Trader state restored. Proceed with caution.`
                    : checkedMarkers.size >= 2
                    ? `${checkedMarkers.size}/5 — Partially regulated. Reduce size or walk away.`
                    : `${checkedMarkers.size}/5 — Still in survival state. Do not trade.`}
                </Text>
              </View>

              <Button
                label="Continue → Decision"
                onPress={() => {
                  setStep("DECIDE");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                fullWidth
              />
            </View>
          )}

          {/* DECIDE */}
          {step === "DECIDE" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "Inter_700Bold" }}>Step 4 — Commit</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 }}>
                  {checkedMarkers.size >= 4
                    ? "You passed the state check. If you trade, reduce size by 50% as a precaution for the rest of this session."
                    : checkedMarkers.size >= 2
                    ? "You are partially regulated. Step away is the safer option. If you return, reduce size."
                    : "Your survival brain is still active. The professional choice is to stop trading for today."}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {checkedMarkers.size >= 3 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose("TRADE_REDUCED"); }}
                    style={{ padding: 18, borderRadius: 12, borderWidth: 1.5, borderColor: "#22c55e50", backgroundColor: "#22c55e10" }}
                  >
                    <Text style={{ color: "#22c55e", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 }}>Return to Trading — 50% Size</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                      I am regulated enough. I will reduce position size and follow my rules precisely.
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onClose("STEP_AWAY"); }}
                  style={{ padding: 18, borderRadius: 12, borderWidth: 1.5, borderColor: "#f59e0b50", backgroundColor: "#f59e0b10" }}
                >
                  <Text style={{ color: "#f59e0b", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 }}>Step Away — 30 Minutes</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                    Close the charts, walk outside. Return only after a full reset. No phones, no crypto twitter.
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onClose("END_SESSION"); }}
                  style={{ padding: 18, borderRadius: 12, borderWidth: 1.5, borderColor: "#ef444450", backgroundColor: "#ef444410" }}
                >
                  <Text style={{ color: "#ef4444", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 }}>End Session Now</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                    The professional choice when the market has gotten personal. Protect your account. Come back tomorrow.
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
