import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, font, gradientForSkills, initials, radius } from "@/src/lib/theme";

export function Avatar({
  name,
  size = 44,
  skills = [],
  brand,
  style,
}: {
  name: string;
  size?: number;
  skills?: string[];
  brand?: boolean;
  style?: ViewStyle;
}) {
  const grad = brand ? (["#FBBF24", "#F97316"] as [string, string]) : gradientForSkills(skills);
  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.onBrand,
          fontFamily: font.displayBold,
          fontSize: size * 0.36,
          letterSpacing: -0.5,
        }}
      >
        {initials(name) || "C"}
      </Text>
    </LinearGradient>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: colors.brandSoft, borderColor: colors.brand }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.brand : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  testID,
  iconRight,
  variant = "primary",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  iconRight?: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      testID={testID}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        isPrimary
          ? { backgroundColor: colors.brand }
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.55 },
        pressed && !disabled && !loading && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text
        style={[
          styles.btnText,
          { color: isPrimary ? colors.onBrand : colors.text },
        ]}
      >
        {loading ? "Please wait…" : label}
      </Text>
      {iconRight}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: font.bodyMedium,
    fontSize: 13,
  },
  btn: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
  },
  btnText: {
    fontFamily: font.display,
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  sectionLabel: {
    color: colors.text,
    fontFamily: font.bodySemi,
    fontSize: 13,
  },
  sectionHint: {
    color: colors.textTertiary,
    fontFamily: font.body,
    fontSize: 11,
  },
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
});
