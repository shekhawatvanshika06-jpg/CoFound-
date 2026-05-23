import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, space, SKILL_META } from "@/src/lib/theme";

export default function ProfileTab() {
  const { me, logOut } = useAuth();
  const router = useRouter();

  if (!me) return null;

  const cats = Array.from(new Set(me.skills.map((s) => SKILL_META[s]).filter(Boolean)));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar name={me.name} skills={me.skills} size={88} />
          <Text style={styles.name}>{me.name}</Text>
          <View style={styles.metaRow}>
            {me.city ? (
              <View style={styles.meta}>
                <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.metaText}>{me.city}</Text>
              </View>
            ) : null}
            {me.time_commit ? (
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.metaText}>{me.time_commit}</Text>
              </View>
            ) : null}
          </View>
          {me.bio ? <Text style={styles.bio}>{me.bio}</Text> : null}
        </View>

        <View style={styles.card}>
          <DetailRow label="Email" value={me.email} />
          <DetailRow label="Goal" value={me.goal ?? "—"} />
          <DetailRow label="Stage" value={me.stage ?? "—"} last />
        </View>

        <View style={{ marginBottom: 22 }}>
          <Text style={styles.sectionLabel}>
            Skills {cats.length ? `· ${cats.join(" / ")}` : ""}
          </Text>
          <View style={styles.chipWrap}>
            {me.skills.map((s) => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={styles.sectionLabel}>Building in</Text>
          <View style={styles.chipWrap}>
            {me.interests.map((s) => (
              <View key={s} style={styles.interestChip}>
                <Text style={styles.interestText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          testID="profile-edit-button"
          onPress={() => router.push("/onboarding")}
          style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Ionicons name="create-outline" size={16} color={colors.text} />
          <Text style={styles.btnText}>Edit profile</Text>
        </Pressable>

        <Pressable
          testID="profile-logout-button"
          onPress={async () => {
            await logOut();
            router.replace("/login");
          }}
          style={({ pressed }) => [styles.btnGhost, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          <Text style={[styles.btnText, { color: colors.danger }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: 130 },
  hero: { alignItems: "center", marginTop: 12, marginBottom: 24 },
  name: { color: colors.text, fontFamily: font.displayBold, fontSize: 26, marginTop: 14, letterSpacing: -0.5 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12 },
  bio: { color: colors.textSecondary, fontFamily: font.body, fontSize: 13, textAlign: "center", marginTop: 12, lineHeight: 19, paddingHorizontal: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 4,
    marginBottom: 22,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.textSecondary, fontFamily: font.body, fontSize: 13 },
  rowValue: { color: colors.text, fontFamily: font.bodySemi, fontSize: 13, maxWidth: "60%" },
  sectionLabel: {
    color: colors.textTertiary, fontFamily: font.bodySemi, fontSize: 11,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill,
  },
  skillText: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 12 },
  interestChip: {
    borderWidth: 1, borderColor: "rgba(245,158,11,0.4)",
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill,
  },
  interestText: { color: colors.brand, fontFamily: font.bodyMedium, fontSize: 12 },
  btn: {
    height: 50, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginBottom: 10,
  },
  btnGhost: {
    height: 50, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnText: { color: colors.text, fontFamily: font.bodySemi, fontSize: 14 },
});
