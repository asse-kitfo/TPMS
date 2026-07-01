import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, Modal, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Card, Button, SectionLabel, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import {
  loadRules, saveRules, Rule, generateId,
  loadCheckInInterval, saveCheckInInterval, CheckInIntervalBase,
} from "@/lib/storage";

const DISCLAIMER = `ApexTerm is a psychological awareness tool for traders. It does not provide financial advice, trade signals, market analysis, or execution control. All trading decisions and execution are performed solely by the trader on their own trading platform. ApexTerm only logs and reflects the trader's self-reported emotional state.`;

const INTERVALS: { value: CheckInIntervalBase; label: string; desc: string }[] = [
  { value: 3, label: "3 min", desc: "More frequent — faster-moving trades" },
  { value: 5, label: "5 min", desc: "Default — works for most styles" },
  { value: 10, label: "10 min", desc: "Less frequent — longer-duration trades" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [rules, setRules] = useState<Rule[]>([]);
  const [interval, setInterval] = useState<CheckInIntervalBase>(5);
  const [newRuleText, setNewRuleText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  useFocusEffect(useCallback(() => {
    loadRules().then(setRules);
    loadCheckInInterval().then(setInterval);
  }, []));

  async function addRule() {
    if (!newRuleText.trim()) return;
    const updated = [...rules, { id: generateId(), text: newRuleText.trim(), active: true, createdAt: new Date().toISOString() }];
    setRules(updated);
    await saveRules(updated);
    setNewRuleText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setEditText(rule.text);
  }

  async function saveEdit() {
    if (!editText.trim() || !editingId) return;
    const updated = rules.map(r => r.id === editingId ? { ...r, text: editText.trim() } : r);
    setRules(updated);
    await saveRules(updated);
    setEditingId(null);
    setEditText("");
  }

  function deleteRule(id: string) {
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const updated = rules.filter(r => r.id !== confirmDeleteId);
    setRules(updated);
    await saveRules(updated);
    setConfirmDeleteId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  async function handleIntervalChange(val: CheckInIntervalBase) {
    setInterval(val);
    await saveCheckInInterval(val);
    Haptics.selectionAsync();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Settings</Text>
      </View>

      {/* Check-in interval */}
      <Card style={{ gap: 14 }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_700Bold" }}>Check-in interval</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 }}>
            Base interval for scheduled check-ins. Calm state doubles it; urge/anxious always triggers again in 2 min.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          {INTERVALS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.8}
              onPress={() => handleIntervalChange(opt.value)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: interval === opt.value ? colors.primary : colors.border, backgroundColor: interval === opt.value ? `${colors.primary}12` : colors.secondary }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: interval === opt.value ? colors.primary : colors.border, backgroundColor: interval === opt.value ? colors.primary : "transparent" }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: interval === opt.value ? colors.primary : colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{opt.label}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{opt.desc}</Text>
              </View>
              {interval === opt.value && opt.value === 5 && (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${colors.primary}20` }}>
                  <Text style={{ color: colors.primary, fontSize: 9, fontFamily: "Inter_600SemiBold" }}>DEFAULT</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ padding: 10, borderRadius: 8, backgroundColor: colors.secondary, gap: 6 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>Cadence with {interval}min base</Text>
          <View style={{ gap: 3 }}>
            <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_400Regular" }}>🙂 Calm → {interval * 2}min</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_400Regular" }}>😐 Watching → {interval}min</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_400Regular" }}>😬😰 Urge/Anxious → 2min</Text>
          </View>
        </View>
      </Card>

      {/* Rules */}
      <Card style={{ gap: 14 }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_700Bold" }}>Lessons & Reminders</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 }}>
            Notes to your future self — lessons learned, reminders, things not to repeat.
          </Text>
        </View>

        {/* Add new rule */}
        <View style={{ gap: 8 }}>
          <TextInput
            value={newRuleText}
            onChangeText={setNewRuleText}
            placeholder="Add a lesson or reminder…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, minHeight: 60, textAlignVertical: "top" }]}
          />
          <Button
            label="Add Entry"
            onPress={addRule}
            disabled={!newRuleText.trim()}
            variant="secondary"
            icon={<Icon name="plus" size={14} color={colors.foreground} />}
          />
        </View>

        {/* Rules list */}
        {rules.length === 0 && (
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 }}>
            Nothing yet — add a lesson or reminder above
          </Text>
        )}

        {rules.map((rule, idx) => (
          <View key={rule.id} style={{ gap: 0 }}>
            {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />}

            {editingId === rule.id ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  style={[styles.input, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.secondary, minHeight: 60, textAlignVertical: "top" }]}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button label="Cancel" variant="ghost" onPress={() => setEditingId(null)} style={{ flex: 1 }} />
                  <Button label="Save" onPress={saveEdit} style={{ flex: 2 }} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                  {rule.text}
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity onPress={() => startEdit(rule)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="edit-2" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRule(rule.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </Card>

      {/* Disclaimer */}
      <Card style={{ gap: 10 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_700Bold" }}>Disclaimer</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
          {DISCLAIMER}
        </Text>
      </Card>
    </ScrollView>

      {/* Confirm delete modal */}
      <Modal transparent visible={!!confirmDeleteId} animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 32 }} onPress={() => setConfirmDeleteId(null)}>
          <Pressable style={{ backgroundColor: colors.card, borderRadius: 14, padding: 24, width: "100%", gap: 16 }} onPress={() => {}}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" }}>Delete Rule</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 }}>
              Are you sure you want to delete this rule?
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.destructive, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
});
