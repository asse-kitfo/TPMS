import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  size?: "sm" | "md";
}
export function Badge({ label, color, bg, size = "sm" }: BadgeProps) {
  const colors = useColors();
  const fs = size === "sm" ? 10 : 12;
  const px = size === "sm" ? 8 : 10;
  const py = size === "sm" ? 3 : 5;
  return (
    <View
      style={{
        backgroundColor: bg ?? colors.secondary,
        borderRadius: 99,
        paddingHorizontal: px,
        paddingVertical: py,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: color ?? colors.mutedForeground, fontSize: fs, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
}
export function Card({ children, style, onPress }: CardProps) {
  const colors = useColors();
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[{ backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16 }, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16 }, style]}>
      {children}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: object;
}
export function Button({ label, onPress, variant = "primary", size = "md", disabled, loading, icon, fullWidth, style }: ButtonProps) {
  const colors = useColors();
  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: 13, md: 14, lg: 16 };
  const h = heights[size];
  const fs = fontSizes[size];

  const bgMap: Record<string, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    ghost: "transparent",
    destructive: colors.destructive,
  };
  const fgMap: Record<string, string> = {
    primary: colors.primaryForeground,
    secondary: colors.foreground,
    ghost: colors.foreground,
    destructive: colors.destructiveForeground,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        height: h,
        backgroundColor: bgMap[variant],
        borderRadius: colors.radius,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: disabled ? 0.4 : 1,
        paddingHorizontal: 16,
        ...(fullWidth ? { width: "100%" } : {}),
        ...(variant === "secondary" ? { borderWidth: 1, borderColor: colors.border } : {}),
        ...(variant === "ghost" ? { borderWidth: 1, borderColor: colors.border } : {}),
        ...((style as object) ?? {}),
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fgMap[variant]} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fgMap[variant], fontSize: fs, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  color?: string;
}
export function SliderRow({ label, value, onChange, min = 1, max = 10, color }: SliderRowProps) {
  const colors = useColors();
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }}>{label}</Text>
        <Text style={{ color: color ?? colors.primary, fontSize: 14, fontFamily: "Inter_700Bold" }}>{value}/10</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {steps.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => onChange(s)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 6,
              backgroundColor: s <= value ? (color ?? colors.primary) : colors.secondary,
              borderWidth: 1,
              borderColor: s <= value ? (color ?? colors.primary) : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: s <= value ? colors.primaryForeground : colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function Divider({ style }: { style?: object }) {
  const colors = useColors();
  return <View style={[{ height: 1, backgroundColor: colors.border, marginVertical: 12 }, style]} />;
}

export function SectionLabel({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4 }}>
      {text}
    </Text>
  );
}

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}
export function OptionChip({ label, selected, onPress, color }: OptionChipProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: selected ? (color ?? colors.primary) : colors.border,
        backgroundColor: selected ? `${color ?? colors.primary}18` : colors.secondary,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: selected ? (color ?? colors.primary) : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, title, subtitle, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 }}>
      {icon}
      <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{title}</Text>
      {subtitle && (
        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.75}
          style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary }}
        >
          <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const webTop = Platform.OS === "web" ? 67 : 0;
export const webBottom = Platform.OS === "web" ? 34 : 0;
