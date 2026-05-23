// Cofound design tokens — derived from /app/design_guidelines.json.

export const colors = {
  bg: "#000000",
  surface: "#121214",
  surfaceElevated: "#18181B",
  glass: "rgba(18, 18, 20, 0.85)",

  brand: "#F59E0B",
  brandMuted: "rgba(245, 158, 11, 0.15)",
  brandSoft: "rgba(245, 158, 11, 0.10)",
  accent: "#FF6B00",

  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textTertiary: "#52525B",
  onBrand: "#000000",

  border: "#27272A",
  borderFocus: "#F59E0B",

  success: "#10B981",
  danger: "#F43F5E",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const font = {
  display: "BricolageGrotesque_700Bold",
  displayBold: "BricolageGrotesque_800ExtraBold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "HankenGrotesk_400Regular",
  bodyMedium: "HankenGrotesk_500Medium",
  bodySemi: "HankenGrotesk_600SemiBold",
} as const;

export const avatarGradients: Record<string, [string, string]> = {
  Tech: ["#3B82F6", "#1D4ED8"],
  Design: ["#A855F7", "#7E22CE"],
  Growth: ["#10B981", "#047857"],
  Product: ["#F59E0B", "#B45309"],
  Content: ["#EC4899", "#9D174D"],
  default: ["#3F3F46", "#18181B"],
  brand: ["#FBBF24", "#F97316"],
};

export const SKILL_META: Record<string, string> = {
  Frontend: "Tech", Backend: "Tech", "AI / ML": "Tech", Mobile: "Tech", Data: "Tech",
  "UI / UX": "Design", Branding: "Design",
  Marketing: "Growth", Sales: "Growth", "Biz Dev": "Growth", Finance: "Growth",
  Product: "Product", Strategy: "Product",
  Content: "Content", Video: "Content",
};

export function gradientForSkills(skills: string[]): [string, string] {
  for (const s of skills) {
    const cat = SKILL_META[s];
    if (cat && avatarGradients[cat]) return avatarGradients[cat];
  }
  return avatarGradients.brand;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
