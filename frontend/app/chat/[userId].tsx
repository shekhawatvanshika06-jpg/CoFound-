import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Avatar } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, space } from "@/src/lib/theme";

type Msg = {
  message_id: string;
  from_user: string;
  to_user: string;
  content: string;
  created_at: string;
};

export default function Chat() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState<{ name: string; skills: string[]; city?: string | null } | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const lastTsRef = useRef<string | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!userId) return;
    try {
      // Get peer's basic info from matches list (cheap one-shot)
      const m = await api.get<{ matches: any[] }>("/matches");
      const found = m.matches.find((u) => u.user_id === userId);
      if (found) setPeer({ name: found.name, skills: found.skills, city: found.city });

      const r = await api.get<{ messages: Msg[] }>(`/chats/${userId}/messages`);
      setMessages(r.messages);
      if (r.messages.length > 0) lastTsRef.current = r.messages[r.messages.length - 1].created_at;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await api.get<{ messages: Msg[] }>(
        `/chats/${userId}/messages${lastTsRef.current ? `?since=${encodeURIComponent(lastTsRef.current)}` : ""}`,
      );
      if (r.messages.length) {
        setMessages((prev) => [...prev, ...r.messages]);
        lastTsRef.current = r.messages[r.messages.length - 1].created_at;
      }
    } catch {}
  }, [userId]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  useEffect(() => {
    const id = setInterval(() => poll(), 3000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const send = async () => {
    const body = input.trim();
    if (!body || sending || !userId) return;
    setSending(true);
    setInput("");
    try {
      const r = await api.post<Msg>(`/chats/${userId}/messages`, { content: body });
      setMessages((prev) => [...prev, r]);
      lastTsRef.current = r.created_at;
    } catch {
      setInput(body); // restore
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }: { item: Msg }) => {
    const mine = item.from_user === me?.user_id;
    return (
      <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
        <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, mine && { color: colors.onBrand }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <Pressable testID="chat-back" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          {peer ? (
            <>
              <Avatar name={peer.name} skills={peer.skills} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.peerName} numberOfLines={1}>{peer.name}</Text>
                {peer.city ? <Text style={styles.peerSub}>{peer.city}</Text> : null}
              </View>
            </>
          ) : (
            <Text style={styles.peerName}>Chat</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : (
          <FlatList
            ref={listRef}
            testID="chat-messages"
            data={messages}
            keyExtractor={(m) => m.message_id}
            renderItem={renderMsg}
            contentContainerStyle={styles.msgList}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            ListEmptyComponent={
              <View style={styles.emptyMsg}>
                <Text style={styles.emptyMsgText}>
                  You&apos;re connected. Send the first message.
                </Text>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <Pressable
            testID="chat-send-button"
            disabled={!input.trim() || sending}
            onPress={send}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || sending) && { opacity: 0.5 },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: space.xl,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  peerName: { color: colors.text, fontFamily: font.displaySemi, fontSize: 15 },
  peerSub: { color: colors.textTertiary, fontFamily: font.body, fontSize: 11, marginTop: 1 },
  msgList: { paddingHorizontal: space.xl, paddingVertical: 16, flexGrow: 1 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: {
    backgroundColor: colors.brand,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18,
  },
  bubbleText: { color: colors.text, fontFamily: font.body, fontSize: 14, lineHeight: 19 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: space.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 44, maxHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    color: colors.text, fontFamily: font.body, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyMsg: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyMsgText: { color: colors.textTertiary, fontFamily: font.body, fontSize: 13, textAlign: "center" },
});
