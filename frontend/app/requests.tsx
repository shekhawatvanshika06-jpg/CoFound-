import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { colors, font, radius, space } from "@/src/lib/theme";

const EMPTY = "https://static.prod-images.emergentagent.com/jobs/e6d869e8-0952-42dc-8f01-0ab01ee1fc22/images/36d6b88dd50b8a2f6f4fc904ea953d39351526cf24cb0c347e7d7e630653b402.png";

type Req = {
  request_id: string;
  user: { user_id: string; name: string; bio?: string | null; skills: string[]; city?: string | null };
  created_at?: string;
};

type Accepted = { request_id: string; user: Req["user"] };

export default function Requests() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [accepted, setAccepted] = useState<Accepted[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ incoming: Req[]; outgoing: Req[]; accepted: Accepted[] }>("/connect/requests");
      setIncoming(r.incoming);
      setOutgoing(r.outgoing);
      setAccepted(r.accepted);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (reqId: string, action: "accept" | "reject") => {
    setBusy((s) => ({ ...s, [reqId]: true }));
    try {
      await api.post(`/connect/${reqId}/${action}`);
      await load();
    } finally {
      setBusy((s) => ({ ...s, [reqId]: false }));
    }
  };

  const empty = !loading && incoming.length === 0 && outgoing.length === 0 && accepted.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="requests-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Your team-in-progress</Text>
          <Text style={styles.h1}>Inbox</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : empty ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Image source={{ uri: EMPTY }} style={styles.emptyImg} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            Tap “Send connect request” on a match to start a conversation.
          </Text>
        </View>
      ) : (
        <ScrollView
          testID="requests-scroll"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={colors.brand}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
            />
          }
        >
          {accepted.length > 0 ? (
            <Section title="Conversations">
              {accepted.map((a) => (
                <Pressable
                  key={a.request_id}
                  testID={`chat-open-${a.user.user_id}`}
                  onPress={() => router.push(`/chat/${a.user.user_id}`)}
                  style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.99 }] }]}
                >
                  <Avatar name={a.user.name} skills={a.user.skills} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowName}>{a.user.name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {a.user.bio ?? "Connected — say hi."}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Section>
          ) : null}

          {incoming.length > 0 ? (
            <Section title={`Incoming · ${incoming.length}`}>
              {incoming.map((r) => (
                <View key={r.request_id} style={styles.requestCard}>
                  <View style={styles.requestHead}>
                    <Avatar name={r.user.name} skills={r.user.skills} size={44} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName}>{r.user.name}</Text>
                      {r.user.city ? (
                        <Text style={styles.rowSub}>{r.user.city}</Text>
                      ) : null}
                    </View>
                  </View>
                  {r.user.bio ? <Text style={styles.requestBio}>{r.user.bio}</Text> : null}
                  <View style={styles.actions}>
                    <Pressable
                      testID={`request-reject-${r.request_id}`}
                      disabled={busy[r.request_id]}
                      onPress={() => act(r.request_id, "reject")}
                      style={({ pressed }) => [
                        styles.actionGhost,
                        pressed && { transform: [{ scale: 0.98 }] },
                        busy[r.request_id] && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.actionGhostText}>Pass</Text>
                    </Pressable>
                    <Pressable
                      testID={`request-accept-${r.request_id}`}
                      disabled={busy[r.request_id]}
                      onPress={() => act(r.request_id, "accept")}
                      style={({ pressed }) => [
                        styles.actionPrimary,
                        pressed && { transform: [{ scale: 0.98 }] },
                        busy[r.request_id] && { opacity: 0.6 },
                      ]}
                    >
                      <Ionicons name="checkmark" size={15} color={colors.onBrand} />
                      <Text style={styles.actionPrimaryText}>Accept</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          {outgoing.length > 0 ? (
            <Section title={`Sent · ${outgoing.length}`}>
              {outgoing.map((r) => (
                <View key={r.request_id} style={styles.row}>
                  <Avatar name={r.user.name} skills={r.user.skills} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowName}>{r.user.name}</Text>
                    <Text style={styles.rowSub}>Waiting for them to accept</Text>
                  </View>
                  <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                </View>
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.xl,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  eyebrow: { color: colors.brand, fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  h1: { color: colors.text, fontFamily: font.displayBold, fontSize: 30, letterSpacing: -1 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 130 },
  sectionTitle: {
    color: colors.textTertiary, fontFamily: font.bodySemi, fontSize: 11,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14,
  },
  rowName: { color: colors.text, fontFamily: font.displaySemi, fontSize: 14 },
  rowSub: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12, marginTop: 2 },
  requestCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 16, gap: 12,
  },
  requestHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestBio: { color: colors.textSecondary, fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 10 },
  actionGhost: {
    flex: 1, height: 42, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  actionGhostText: { color: colors.text, fontFamily: font.bodySemi, fontSize: 13 },
  actionPrimary: {
    flex: 1, height: 42, borderRadius: radius.pill,
    backgroundColor: colors.brand,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  actionPrimaryText: { color: colors.onBrand, fontFamily: font.bodySemi, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyImg: { width: 180, height: 180, opacity: 0.85, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontFamily: font.displayBold, fontSize: 20, marginBottom: 6 },
  emptyText: { color: colors.textSecondary, fontFamily: font.body, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
