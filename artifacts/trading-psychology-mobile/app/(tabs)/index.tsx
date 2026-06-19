import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Session } from "@/lib/api";
import { loadMaxLosses, saveMaxLosses } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Badge, SectionLabel, webTop, webBottom } from "@/components/UI";

const PSYCH_STATES = [
  { key: "CALM", label: "Calm", color: "#22c55e", desc: "Clear head, no emotional pull" },
  { key: "FOCUSED", label: "Focused", color: "#22d3ee", desc: "Locked in, methodical" },
  { key: "PRESSURE", label: "Pressure", color: "#f59e0b", desc: "Need to recover, feeling urgency" },
  { key: "FEAR", label: "Fear", color: "#f59e0b", desc: "Hesitating, second-guessing" },
  { key: "OVERCONFIDENT", label: "Overconfident", color: "#ef4444", desc: "Too sure, ignoring risk" },
  { key: "URGE", label: "Urge", color: "#ef4444", desc: "Strong pull to trade now" },
];

function SessionActive({ session, maxLosses, onEnd }: { session: Session; maxLosses: number; onEnd: () => void }) {
  const colors = useColors();
  const lossRatio = session.lossCount / maxLosses;
  const lossColor = lossRatio === 0 ? colors.success : lossRatio < 1 ? colors.warning : colors.destructive;
  const hitLimit = session.lossCount >= maxLosses;

  return (
    <View style={{ gap: 12 }}>
      {hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}>
          <Feather name="alert-octagon" size={16} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            CIRCUIT BREAKER — Loss limit reached. End session now.
          </Text>
        </View>
      )}

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
              Session Active
            </Text>
          </View>
          <Badge label={`Loss ${session.lossCount}/${maxLosses}`} color={lossColor} bg={`${lossColor}18`} size="md" />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>
              Losses
            </Text>
            <Text style={{ color: lossColor, fontSize: 22, fontFamily: "Inter_700Bold" }}>
              {session.lossCount}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>
              Rule Breaks
            </Text>
            <Text style={{ color: session.ruleBreaks > 0 ? colors.warning : colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>
              {session.ruleBreaks}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary, flex: 1 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>
              Mode
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              {session.mode}
            </Text>
          </View>
        </View>

        <Button
          label="End Session"
          variant="ghost"
          onPress={onEnd}
          icon={<Feather name="power" size={14} color={colors.destructive} />}
        />
      </Card>
    </View>
  );
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
                marginRight: 8,
                marginBottom: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1.5,
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

export default function HubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [maxLosses, setMaxLosses] = useState(2);
  const [psychState, setPsychState] = useState("CALM");
  const [confirmEnd, setConfirmEnd] = useState(false);

  const { data: session, isLoading, refetch } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.getCurrentSession();
      } catch {
        return null;
      }
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    loadMaxLosses().then(setMaxLosses);
  }, []);

  const startMutation = useMutation({
    mutationFn: () => api.startSession(),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const endMutation = useMutation({
    mutationFn: () => api.updateSession(session!.id, { endedAt: new Date().toISOString() }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["session"] });
      setConfirmEnd(false);
    },
  });

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startMutation.mutate();
  };

  const handleEnd = () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    endMutation.mutate();
  };

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const selectedState = PSYCH_STATES.find(s => s.key === psychState);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
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
          Check in before the market opens
        </Text>
      </View>

      {/* Psych state selector */}
      <Card>
        <PsychSelector value={psychState} onChange={setPsychState} />
        {selectedState && (
          <View style={[styles.stateDesc, { backgroundColor: `${selectedState.color}10`, borderColor: `${selectedState.color}30` }]}>
            <Text style={{ color: selectedState.color, fontSize: 12, fontFamily: "Inter_500Medium" }}>
              {selectedState.desc}
            </Text>
          </View>
        )}
      </Card>

      {/* Session panel */}
      <View>
        <SectionLabel text="Trading Session" />
        {session && !session.endedAt ? (
          <SessionActive
            session={session}
            maxLosses={maxLosses}
            onEnd={handleEnd}
          />
        ) : (
          <Card style={{ gap: 16 }}>
            <View>
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
                No active session
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 }}>
                Set your max losses before starting. This decision is made now, while calm — not mid-session.
              </Text>
            </View>

            <View>
              <SectionLabel text="Max losses today" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => { setMaxLosses(n); saveMaxLosses(n); }}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: maxLosses === n ? colors.primary : colors.border,
                      backgroundColor: maxLosses === n ? `${colors.primary}18` : colors.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: maxLosses === n ? colors.primary : colors.mutedForeground, fontSize: 20, fontFamily: "Inter_700Bold" }}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {confirmEnd && (
              <View style={[styles.alertBanner, { backgroundColor: `${colors.warning}18`, borderColor: colors.warning }]}>
                <Feather name="alert-triangle" size={14} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 }}>
                  No session is active. Start a new one below.
                </Text>
              </View>
            )}

            <Button
              label="Start Session"
              onPress={handleStart}
              loading={startMutation.isPending}
              icon={<Feather name="play" size={14} color={colors.primaryForeground} />}
              fullWidth
            />
          </Card>
        )}
      </View>

      {/* Stats quick view */}
      <StatsRow />
    </ScrollView>
  );
}

function StatsRow() {
  const colors = useColors();
  const { data: stats } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: api.getStatsSummary,
  });
  const { data: streak } = useQuery({
    queryKey: ["discipline-streak"],
    queryFn: api.getDisciplineStreak,
  });

  if (!stats) return null;

  return (
    <View style={{ gap: 8 }}>
      <SectionLabel text="All-time stats" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Trades</Text>
          <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold" }}>{stats.totalTrades}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Win Rate</Text>
          <Text style={{ color: colors.success, fontSize: 20, fontFamily: "Inter_700Bold" }}>{(stats.winRate * 100).toFixed(0)}%</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Streak</Text>
          <Text style={{ color: colors.primary, fontSize: 20, fontFamily: "Inter_700Bold" }}>{streak?.currentStreak ?? 0}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>Plan %</Text>
          <Text style={{ color: colors.primary, fontSize: 20, fontFamily: "Inter_700Bold" }}>{(stats.planFollowRate * 100).toFixed(0)}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  statBox: { padding: 12, borderRadius: 10, gap: 4 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  stateDesc: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
