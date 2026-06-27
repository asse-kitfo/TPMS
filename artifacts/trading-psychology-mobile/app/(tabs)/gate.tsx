import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, Session } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, OptionChip, EmptyState, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import { saveActiveTrade, generateId, nextCheckInTimestamp, ActiveTrade } from "@/lib/storage";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "XAU/USD", "Other"];

export default function QuickPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [pair, setPair] = useState("EUR/USD");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => { try { return await api.getCurrentSession(); } catch { return null; } },
  });

  const isSessionActive = session && !session.endedAt;

  async function handleEnteringNow() {
    if (!invalidation.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const trade: ActiveTrade = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      pair,
      direction,
      invalidation: invalidation.trim(),
      nextCheckInAt: nextCheckInTimestamp("CALM"),
      checkIns: [],
    };

    await saveActiveTrade(trade);
    setLoading(false);
    setSubmitted(true);

    setTimeout(() => {
      router.push("/(tabs)/monitor");
    }, 800);
  }

  if (!isSessionActive) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad + 16 }}>
        <EmptyState
          icon={<Icon name="edit-2" size={40} color={colors.border} />}
          title="No active session"
          subtitle="Start a session on the Hub tab first"
        />
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
          Opening In Trade mode. First check-in in 5 minutes.
        </Text>
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
      {/* Header */}
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Quick Plan</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          10-second log before you enter MT5
        </Text>
      </View>

      <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20`, flexDirection: "row", gap: 10 }}>
        <Icon name="info" size={14} color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 }}>
          Not a gate — just a timestamp. The only required field is the invalidation condition, so your check-ins mid-trade have something to reference.
        </Text>
      </View>

      <Card style={{ gap: 18 }}>
        {/* Pair */}
        <View>
          <SectionLabel text="Asset" />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {PAIRS.map(p => (
              <OptionChip key={p} label={p} selected={pair === p} onPress={() => setPair(p)} />
            ))}
          </View>
        </View>

        {/* Direction */}
        <View>
          <SectionLabel text="Direction" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <OptionChip label="LONG ↑" selected={direction === "LONG"} onPress={() => setDirection("LONG")} color={colors.success} />
            <OptionChip label="SHORT ↓" selected={direction === "SHORT"} onPress={() => setDirection("SHORT")} color={colors.destructive} />
          </View>
        </View>

        {/* Entry & Stop — optional */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SectionLabel text="Entry (optional)" />
            <TextInput
              value={entry}
              onChangeText={setEntry}
              placeholder="e.g. 1.0850"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel text="Stop (optional)" />
            <TextInput
              value={stop}
              onChangeText={setStop}
              placeholder="e.g. 1.0820"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            />
          </View>
        </View>

        {/* Invalidation — required */}
        <View>
          <SectionLabel text="Invalidation condition *" />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 16 }}>
            One sentence: what proves this idea wrong?
          </Text>
          <TextInput
            value={invalidation}
            onChangeText={setInvalidation}
            placeholder="e.g. Price closes above the 4H resistance at 1.0870"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[styles.input, { color: colors.foreground, borderColor: !invalidation.trim() ? colors.destructive + "60" : colors.border, backgroundColor: colors.secondary, minHeight: 72, textAlignVertical: "top" }]}
          />
          {!invalidation.trim() && (
            <Text style={{ color: colors.destructive, fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 }}>
              Required — this is what your check-ins will reference.
            </Text>
          )}
        </View>

        <Button
          label="Entering Now →"
          onPress={handleEnteringNow}
          loading={loading}
          disabled={!invalidation.trim()}
          fullWidth
          size="lg"
          icon={<Icon name="activity" size={16} color={colors.primaryForeground} />}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
});
