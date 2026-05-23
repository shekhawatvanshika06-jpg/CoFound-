import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/lib/api";
import { colors, font, radius, space } from "@/src/lib/theme";

type Msg = { message_id: string; role: "user" | "assistant"; content: string; created_at: string };
type State = { messages: Msg[]; used: number; limit: number; remaining: number };

const STARTERS = [
  "How do I validate my idea cheaply?",
  "What should my MVP include?",
  "How do I find my first 50 users?",
];

export default function Mentor() {
  const [state, setState] = useState<State | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<State>("/mentor");
      setState(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (state?.messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [state?.messages.length, sending]);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || !state || state.remaining <= 0 || sending) return;
    setSending(true);
    setInput("");
    // optimistic user msg
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Msg = {
      message_id: tempId, role: "user", content: body, created_at: new Date().toISOString(),
    };
    setState((s) => s ? { ...s, messages: [...s.messages, optimistic] } : s);
    try {
      const r = await api.post<{
        user_message: Msg; assistant_message: Msg; used: number; remaining: number; limit: number;
      }>("/mentor", { content: body });
      setState((s) =>
        s ? {
          messages: [
            ...s.messages.filter((m) => m.message_id !== tempId),
            r.user_message,
            r.assistant_message,
          ],
          used: r.used,
          remaining: r.remaining,
          limit: r.limit,
        } : s,
      );
    } catch (e: any) {
      // remove optimistic, show error bubble
      setState((s) =>
        s ? {
          ...s,
          messages: [
            ...s.messages.filter((m) => m.message_id !== tempId),
            optimistic,
            {
              message_id: `err-${Date.now()}`,
              role: "assistant",
              content: e?.status === 429 ? "Out of free messages today — resets tomorrow." : "Network hiccup — try again.",
              created_at: new Date().toISOString(),
            },
          ],
        } : s,
      );
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }: { item: Msg }) => (
    <View style={[styles.bubbleRow, item.role === "user" ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
      <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={styles.bubbleText}>{item.content}</Text>
      </View>
    </View>
  );

  if (loading || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      </SafeAreaView>
    );
  }

  const empty = state.messages.length === 0;
  const locked = state.remaining <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Sharp, practical, fast</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sparkles" size={22} color={colors.brand} />
              <Text style={styles.h1}>AI Mentor</Text>
            </View>
          </View>
          <View style={styles.quota} testID="mentor-quota">
            <Text style={styles.quotaText}>{state.remaining}/{state.limit} free</Text>
          </View>
        </View>

        {empty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.mentorIcon}>
              <Ionicons name="sparkles" size={24} color={colors.onBrand} />
            </View>
            <Text style={styles.emptyTitle}>Ask anything an experienced founder would tell you.</Text>
            <Text style={styles.emptySub}>Claude Sonnet 4.5, primed with your profile.</Text>
            <View style={{ gap: 10, marginTop: 24, width: "100%" }}>
              {STARTERS.map((q) => (
                <Pressable
                  key={q}
                  testID={`mentor-starter-${q.slice(0, 14)}`}
                  onPress={() => send(q)}
                  disabled={locked}
                  style={({ pressed }) => [
                    styles.starter,
                    pressed && { transform: [{ scale: 0.98 }] },
                    locked && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.starterText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            testID="mentor-messages"
            data={state.messages}
            keyExtractor={(m) => m.message_id}
            renderItem={renderMsg}
            contentContainerStyle={styles.msgList}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {sending ? (
          <View style={[styles.bubbleRow, { justifyContent: "flex-start", paddingHorizontal: space.xl }]}>
            <View style={[styles.bubble, styles.bubbleAi]}>
              <Text style={[styles.bubbleText, { color: colors.textTertiary }]}>thinking…</Text>
            </View>
          </View>
        ) : null}

        {locked ? (
          <View style={styles.lockedCard}>
            <Ionicons name="lock-closed" size={18} color={colors.brand} />
            <Text style={styles.lockedTitle}>Daily free mentor messages used</Text>
            <Text style={styles.lockedSub}>Resets at midnight UTC.</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              testID="mentor-input"
              value={input}
              onChangeText={setInput}
              placeholder="Ask your mentor…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <Pressable
              testID="mentor-send-button"
              disabled={!input.trim() || sending}
              onPress={() => send()}
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || sending) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name="send" size={18} color={colors.onBrand} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.xl,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  eyebrow: { color: colors.brand, fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  h1: { color: colors.text, fontFamily: font.displayBold, fontSize: 30, letterSpacing: -1 },
  quota: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  quotaText: { color: colors.textSecondary, fontFamily: font.bodyMedium, fontSize: 11 },
  emptyWrap: { flex: 1, paddingHorizontal: space.xl, alignItems: "center", paddingTop: 36 },
  mentorIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  emptyTitle: { color: colors.text, fontFamily: font.displayBold, fontSize: 19, textAlign: "center", lineHeight: 24, paddingHorizontal: 10 },
  emptySub: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12, marginTop: 6 },
  starter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  starterText: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 13, flex: 1 },
  msgList: { paddingHorizontal: space.xl, paddingTop: 8, paddingBottom: 12 },
  bubbleRow: { flexDirection: "row", paddingVertical: 2 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 4, borderBottomRightRadius: 20,
  },
  bubbleText: { color: colors.text, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: space.xl,
    paddingTop: 8,
    paddingBottom: 110,
  },
  input: {
    flex: 1,
    minHeight: 48, maxHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 14,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  lockedCard: {
    margin: space.xl,
    marginBottom: 110,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    alignItems: "center", gap: 6,
  },
  lockedTitle: { color: colors.text, fontFamily: font.displaySemi, fontSize: 14, marginTop: 4 },
  lockedSub: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
