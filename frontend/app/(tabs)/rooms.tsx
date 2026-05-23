import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/lib/api";
import { colors, font, radius, space } from "@/src/lib/theme";

type Room = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  members: number;
  joined: boolean;
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ rooms: Room[] }>("/rooms");
      setRooms(r.rooms);
    } catch {
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

  const toggle = async (room: Room) => {
    setBusy((s) => ({ ...s, [room.id]: true }));
    // optimistic
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, joined: !r.joined, members: r.members + (r.joined ? -1 : 1) }
          : r,
      ),
    );
    try {
      await api.post(`/rooms/${room.id}/${room.joined ? "leave" : "join"}`);
    } catch {
      // revert
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? { ...r, joined: room.joined, members: room.members }
            : r,
        ),
      );
    } finally {
      setBusy((s) => ({ ...s, [room.id]: false }));
    }
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <View style={styles.row} testID={`room-${item.id}`}>
      <View style={styles.emojiTile}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.desc} · {item.members.toLocaleString()} members
        </Text>
      </View>
      <Pressable
        testID={`room-toggle-${item.id}`}
        disabled={busy[item.id]}
        onPress={() => toggle(item)}
        style={({ pressed }) => [
          styles.joinBtn,
          item.joined ? styles.joinBtnActive : styles.joinBtnIdle,
          pressed && { transform: [{ scale: 0.96 }] },
          busy[item.id] && { opacity: 0.6 },
        ]}
      >
        {item.joined ? (
          <Ionicons name="checkmark" size={14} color={colors.text} />
        ) : null}
        <Text
          style={[
            styles.joinText,
            { color: item.joined ? colors.text : colors.onBrand },
          ]}
        >
          {item.joined ? "Joined" : "Join"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tribes by domain</Text>
        <Text style={styles.h1}>Startup Rooms</Text>
        <Text style={styles.sub}>Where serious builders hang out. Join the ones that fit.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="rooms-list"
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={renderRoom}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.list}
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.xl, paddingTop: 8, paddingBottom: 18 },
  eyebrow: {
    color: colors.brand, fontFamily: font.bodySemi,
    fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
    marginBottom: 4,
  },
  h1: { color: colors.text, fontFamily: font.displayBold, fontSize: 32, letterSpacing: -1 },
  sub: { color: colors.textSecondary, fontFamily: font.body, fontSize: 13, marginTop: 6 },
  list: { paddingHorizontal: space.xl, paddingBottom: 130 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: 16,
  },
  emojiTile: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  name: { color: colors.text, fontFamily: font.displaySemi, fontSize: 15 },
  desc: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12, marginTop: 2 },
  joinBtn: {
    height: 36, paddingHorizontal: 14,
    borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  joinBtnIdle: { backgroundColor: colors.brand },
  joinBtnActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  joinText: { fontFamily: font.bodySemi, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
