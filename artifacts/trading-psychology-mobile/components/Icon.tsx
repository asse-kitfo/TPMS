import React from "react";
import Svg, { Path, Circle, Line, Polyline, Rect, G } from "react-native-svg";

const STROKE = { fill: "none" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

type IconDef = (color: string, size: number, sw: number) => React.ReactNode;

const ICONS: Record<string, IconDef> = {
  "home": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M9 22V12h6v10" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "check-circle": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M22 4L12 14.01l-3-3" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "bar-chart-2": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="18" y1="20" x2="18" y2="10" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="4" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="6" y1="20" x2="6" y2="14" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "zap": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "list": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="8" y1="6" x2="21" y2="6" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="21" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="8" y1="18" x2="21" y2="18" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="3" y1="6" x2="3.01" y2="6" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="3.01" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="3.01" y2="18" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "sliders": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="4" y1="21" x2="4" y2="14" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="4" y1="10" x2="4" y2="3" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="21" x2="12" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="8" x2="12" y2="3" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="20" y1="21" x2="20" y2="16" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="20" y1="12" x2="20" y2="3" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="1" y1="14" x2="7" y2="14" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="9" y1="8" x2="15" y2="8" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="17" y1="16" x2="23" y2="16" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "shield": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "check": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M20 6L9 17l-5-5" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "alert-octagon": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="12" y1="8" x2="12" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="16" x2="12.01" y2="16" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "power": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="12" y1="2" x2="12" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "alert-triangle": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "play": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M5 3l14 9-14 9V3z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "wind": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M9.59 4.59A2 2 0 1 1 11 8H2" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M10.59 19.41A2 2 0 1 0 14 16H2" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M15.73 7.73A2.5 2.5 0 1 1 19.5 12H2" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "book-open": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "crosshair": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={w} fill="none" />
      <Line x1="22" y1="12" x2="18" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="6" y1="12" x2="2" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="6" x2="12" y2="2" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="22" x2="12" y2="18" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "lock": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "x": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "x-circle": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={w} fill="none" />
      <Line x1="15" y1="9" x2="9" y2="15" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="9" y1="9" x2="15" y2="15" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "chevron-left": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M15 18l-6-6 6-6" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "chevron-right": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M9 18l6-6-6-6" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "eye": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={c} strokeWidth={w} {...STROKE} />
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={w} fill="none" />
    </Svg>
  ),
  "plus": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "info": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={w} fill="none" />
      <Line x1="12" y1="16" x2="12" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="12" y1="8" x2="12.01" y2="8" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "bookmark": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "trash-2": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3 6h18" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="10" y1="11" x2="10" y2="17" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="14" y1="11" x2="14" y2="17" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "edit-2": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "edit-3": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 20h9" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke={c} strokeWidth={w} {...STROKE} />
    </Svg>
  ),
  "log-out": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M16 17l5-5-5-5" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "minimize-2": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M4 14h6v6" stroke={c} strokeWidth={w} {...STROKE} />
      <Path d="M20 10h-6V4" stroke={c} strokeWidth={w} {...STROKE} />
      <Line x1="14" y1="10" x2="21" y2="3" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="3" y1="21" x2="10" y2="14" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
  "pause-circle": (c, s, w) => (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={w} fill="none" />
      <Line x1="10" y1="15" x2="10" y2="9" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Line x1="14" y1="15" x2="14" y2="9" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </Svg>
  ),
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 24, color = "#ffffff", style }: IconProps) {
  const render = ICONS[name];
  if (!render) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
        <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  return <>{render(color, size, 2)}</>;
}
