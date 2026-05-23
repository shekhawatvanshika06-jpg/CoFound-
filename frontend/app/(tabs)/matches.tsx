import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { colors, font, radius, space } from "@/src/lib/theme";

const EMPTY_IMG = "https://static.prod-images.emergentagent.com/jobs/e6d869e8-0952-42dc-8f01-0ab01ee1fc22/images/63fc5239ea69e72f1161c24e54939b34880d48dd8bbacd3d8937bc8dfd60db74.png";

type Match = {
  user_id: string;
  name: string;
  city?: string | null;
  time_commit?: string | null;
  bio?: string | null;
  skills: string[];
  match_score: number;
  reasons: string[];
  connection_status: "pending" | "accepted" | "rejected" | null;
};

export default function Matches() {
  const router = useRouter();
  const [items, setItems] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingIncoming, setPendingIncoming] = useState(0);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        api.get<{ matches: Match[] }>("/matches"),
        api.get<{ incoming: any[]; outgoing: any[]; accepted: any[] }>("/connect/requests"),
      ]);
      setItems(m.matches);
      setPendingIncoming(r.incoming?.length ?? 0);
    } catch {
      // surfaced via empty UI
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onConnect = async (userId: string) => {
    setConnecting((s) => ({ ...s, [userId]: true }));
    try {
      const r = await api.post<{ status: string }>(`/connect/${userId}`);
      setItems((prev) =>
        prev.map((it) =>
          it.user_id === userId ? { ...it, connection_status: r.status as any } : it,
        ),
      );
    } catch {
    } finally {
      setConnecting((s) => ({ ...s, [userId]: false }));
    }
  };

  const renderCard = ({ item }: { item: Match }) => {
    const isPending = item.connection_status === "pending";
    const isAccepted = item.connection_status === "accepted";
    const busy = connecting[item.user_id];

    return (
      <View style={styles.card} testID={`match-card-${item.user_id}`}>
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <Avatar name={item.name} skills={item.skills} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.userMeta}>
                {item.city ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                    <Text style={styles.metaText}>{item.city}</Text>
                  </View>
                ) : null}
                {item.time_commit ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                    <Text style={styles.metaText}>{item.time_commit}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.scoreBadge}>
            <Ionicons name="flame" size={13} color={colors.brand} />
            <Text style={styles.scoreText}>{item.match_score}</Text>
          </View>
        </View>

        {item.bio ? <Text style={styles.bio}>{item.bio}</Text> : null}

        <View style={{ gap: 8, marginTop: 14 }}>
          {item.reasons.map((r, i) => (
            <View key={i} style={styles.reason}>
              <Ionicons name="checkmark" size={14} color={colors.brand} style={{ marginTop: 1 }} />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>

        <Pressable
          testID={`connect-button-${item.user_id}`}
          disabled={busy || isPending}
          onPress={() => (isAccepted ? router.push(`/chat/${item.user_id}`) : onConnect(item.user_id))}
          style={({ pressed }) => [
            styles.cta,
            isAccepted ? styles.ctaAccepted : isPending ? styles.ctaPending : styles.ctaIdle,
            pressed && !busy && { transform: [{ scale: 0.98 }] },
            busy && { opacity: 0.6 },
          ]}
        >
          {isAccepted ? (
            <>
              <Ionicons name="chatbubble-ellipses" size={15} color={colors.onBrand} />
              <Text style={styles.ctaTextAccepted}>Open chat</Text>
            </>
          ) : isPending ? (
            <>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.ctaTextPending}>Request sent</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={14} color={colors.brand} />
              <Text style={styles.ctaTextIdle}>Send connect request</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Your team awaits</Text>
          <Text style={styles.h1}>Matches</Text>
        </View>
        <Pressable
          testID="matches-inbox-button"
          onPress={() => router.push("/requests")}
          style={styles.inboxBtn}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {pendingIncoming > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingIncoming}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            As more builders join, we&apos;ll rank them by skill complement, shared vision and time.
          </Text>
        </View>
      ) : (
        <FlatList
          testID="matches-list"
          data={items}
          keyExtractor={(it) => it.user_id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={colors.brand}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listIntro}>
              Ranked by skill fit, shared vision and commitment.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: space.xl,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    color: colors.brand,
    fontFamily: font.bodySemi,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  h1: {
    color: colors.text,
    fontFamily: font.displayBold,
    fontSize: 32,
    letterSpacing: -1,
  },
  inboxBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: colors.bg,
  },
  badgeText: {
    color: colors.onBrand, fontFamily: font.bodySemi, fontSize: 10,
  },
  listContent: {
    paddingHorizontal: space.xl,
    paddingBottom: 130,
  },
  listIntro: {
    color: colors.textSecondary,
    fontFamily: font.body,
    fontSize: 13,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardHeadLeft: { flexDirection: "row", gap: 12, alignItems: "center", flex: 1, minWidth: 0 },
  userName: { color: colors.text, fontFamily: font.displaySemi, fontSize: 16 },
  userMeta: { flexDirection: "row", gap: 10, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { color: colors.textTertiary, fontFamily: font.body, fontSize: 11 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreText: { color: colors.brand, fontFamily: font.displayBold, fontSize: 14 },
  bio: {
    color: colors.textSecondary,
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  reason: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 10,
  },
  reasonText: { color: colors.text, fontFamily: font.body, fontSize: 12, flex: 1, lineHeight: 17 },
  cta: {
    marginTop: 14,
    height: 44,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  ctaIdle: { backgroundColor: "transparent", borderColor: colors.border },
  ctaPending: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  ctaAccepted: { backgroundColor: colors.brand, borderColor: colors.brand },
  ctaTextIdle: { color: colors.brand, fontFamily: font.bodySemi, fontSize: 13 },
  ctaTextPending: { color: colors.textSecondary, fontFamily: font.bodyMedium, fontSize: 13 },
  ctaTextAccepted: { color: colors.onBrand, fontFamily: font.bodySemi, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyImg: { width: 180, height: 180, marginBottom: 16, opacity: 0.85 },
  emptyTitle: {
    color: colors.text, fontFamily: font.displayBold, fontSize: 20, marginBottom: 6,
  },
  emptyText: {
    color: colors.textSecondary, fontFamily: font.body, fontSize: 13, textAlign: "center", lineHeight: 19,
  },
});
