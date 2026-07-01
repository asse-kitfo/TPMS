import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import {
  saveActiveTrade, generateId, nextCheckInTimestamp,
  loadLocalSession, loadCheckInInterval, CheckInIntervalBase,
} from "@/lib/storage";

export default function GateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [asset, setAsset] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [baseInterval, setBaseInterval] = useState<CheckInIntervalBase>(5);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  useFocusEffect(useCallback(() => {
    setSubmitted(false);
    loadLocalSession().then(s => setHasSession(!!s));
    loadCheckInInterval().then(setBaseInterval);
  }, []));

  async function handleEnteringNow() {
    if (!invalidation.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    await saveActiveTrade({
      id: generateId(),
      startedAt: new Date().toISOString(),
      asset: asset.trim() || "—",
      direction,
      entryPrice: entryPrice.trim() || undefined,
      stopLoss: stopLoss.trim() || undefined,
      invalidationCondition: invalidation.trim(),
      nextCheckInAt: nextCheckInTimestamp("CALM", baseInterval),
      checkIns: [],
      sosTapCount: 0,
    });

    setLoading(false);
    setSubmitted(true);
    setTimeout(() => router.push("/(tabs)/monitor"), 700);
  }

  if (!hasSession) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 }}>
        <Icon name="lock" size={40} color={colors.border} />
        <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" }}>No active session</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" }}>
          Start a session on the Hub tab first
        </Text>
        <Button label="Go to Hub" onPress={() => router.push("/(tabs)/")} />
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.success}20`, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={32} color={colors.success} />
        </View>
        <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" }}>
          Trade logged
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 }}>
          Opening Monitor screen. First check-in in {baseInterval} minutes.
        </Text>
      </View>
    );
  }

  const canSubmit = !!invalidation.trim();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Gate</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          Under 15 seconds — not a gate, just a timestamp
        </Text>
      </View>

      <Card style={{ gap: 18 }}>
        {/* Asset */}
        <View>
          <SectionLabel text="Asset" />
          <TextInput
            value={asset}
            onChangeText={setAsset}
            placeholder="e.g. EUR/USD, XAU/USD, NQ…"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
          />
        </View>

        {/* Direction */}
        <View>
          <SectionLabel text="Direction" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setDirection("long"); Haptics.selectionAsync(); }}
              style={[styles.dirButton, { borderColor: direction === "long" ? colors.success : colors.border, backgroundColor: direction === "long" ? `${colors.success}18` : colors.secondary }]}
            >
              <Text style={{ color: direction === "long" ? colors.success : colors.mutedForeground, fontSize: 16, fontFamily: "Inter_700Bold" }}>↑ Long</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setDirection("short"); Haptics.selectionAsync(); }}
              style={[styles.dirButton, { borderColor: direction === "short" ? colors.destructive : colors.border, backgroundColor: direction === "short" ? `${colors.destructive}18` : colors.secondary }]}
            >
              <Text style={{ color: direction === "short" ? colors.destructive : colors.mutedForeground, fontSize: 16, fontFamily: "Inter_700Bold" }}>↓ Short</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Invalidation — required */}
        <View>
          <SectionLabel text="Invalidation condition *" />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8 }}>
            What would prove this trade idea wrong?
          </Text>
          <TextInput
            value={invalidation}
            onChangeText={setInvalidation}
            placeholder="e.g. Price closes above 4H resistance at 1.0870"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[styles.input, { color: colors.foreground, borderColor: !invalidation.trim() ? `${colors.destructive}60` : colors.border, backgroundColor: colors.secondary, minHeight: 80, textAlignVertical: "top" }]}
          />
        </View>

        {/* Optional fields */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SectionLabel text="Entry (optional)" />
            <TextInput
              value={entryPrice}
              onChangeText={setEntryPrice}
              placeholder="e.g. 1.0842"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel text="Stop loss (optional)" />
            <TextInput
              value={stopLoss}
              onChangeText={setStopLoss}
              placeholder="e.g. 1.0820"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            />
          </View>
        </View>

        <Button
          label="Entering Now →"
          onPress={handleEnteringNow}
          loading={loading}
          disabled={!canSubmit}
          fullWidth
          size="lg"
          icon={<Icon name="activity" size={16} color={colors.primaryForeground} />}
        />

        {!canSubmit && (
          <Text style={{ color: colors.destructive, fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" }}>
            Invalidation condition is required
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  dirButton: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
});
