import { Ionicons } from "@expo/vector-icons";
import React from "react";

const MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "alert-octagon":      "alert-circle-outline",
  "alert-triangle":     "warning-outline",
  "bar-chart-2":        "bar-chart-outline",
  "book-open":          "book-outline",
  "bookmark":           "bookmark-outline",
  "check":              "checkmark",
  "check-circle":       "checkmark-circle-outline",
  "chevron-left":       "chevron-back",
  "chevron-right":      "chevron-forward",
  "crosshair":          "locate-outline",
  "edit-2":             "create-outline",
  "eye":                "eye-outline",
  "home":               "home-outline",
  "info":               "information-circle-outline",
  "list":               "list-outline",
  "lock":               "lock-closed-outline",
  "log-out":            "log-out-outline",
  "minimize-2":         "contract-outline",
  "pause-circle":       "pause-circle-outline",
  "play":               "play-outline",
  "plus":               "add",
  "power":              "power-outline",
  "shield":             "shield-outline",
  "sliders":            "settings-outline",
  "trash-2":            "trash-outline",
  "wind":               "water-outline",
  "x":                  "close",
  "x-circle":           "close-circle-outline",
  "zap":                "flash-outline",
  "edit-3":             "create-outline",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  const ionName = MAP[name] ?? "help-circle-outline";
  return <Ionicons name={ionName} size={size} color={color} style={style} />;
}
