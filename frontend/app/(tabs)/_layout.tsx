import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { colors, radius } from "@/src/lib/theme";

const ICONS: Record<string, { active: any; inactive: any }> = {
  matches: { active: "people", inactive: "people-outline" },
  rooms: { active: "grid", inactive: "grid-outline" },
  mentor: { active: "sparkles", inactive: "sparkles-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 0}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarButton: (props) => (
          <Pressable
            testID={`bottom-tab-${route.name}`}
            android_ripple={null}
            onPress={props.onPress}
            onLongPress={props.onLongPress}
            style={[
              { flex: 1, alignItems: "center", justifyContent: "center" },
              // @ts-ignore
              props.style,
            ]}
          >
            {props.children}
          </Pressable>
        ),
        tabBarStyle: {
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 24,
          height: 64,
          borderRadius: radius.pill,
          borderColor: colors.border,
          borderWidth: 1,
          backgroundColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => <View style={[StyleSheet.absoluteFill, styles.bgWrap]}><TabBarBackground /></View>,
        tabBarIcon: ({ color, focused }) => {
          const set = ICONS[route.name] ?? ICONS.matches;
          return (
            <Ionicons
              name={focused ? set.active : set.inactive}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="rooms" />
      <Tabs.Screen name="mentor" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bgWrap: {
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});
