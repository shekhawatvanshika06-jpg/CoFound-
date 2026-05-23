import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip, PrimaryButton, SectionLabel } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useAuth, type Me } from "@/src/lib/auth";
import { colors, font, radius, space } from "@/src/lib/theme";

type Meta = {
  skills: string[];
  interests: string[];
  goals: string[];
  stages: string[];
  times: string[];
  cities: string[];
};

export default function Onboarding() {
  const router = useRouter();
  const { me, setMe } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [name, setName] = useState(me?.name ?? "");
  const [skills, setSkills] = useState<string[]>(me?.skills ?? []);
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [goal, setGoal] = useState<string>(me?.goal ?? "");
  const [stage, setStage] = useState<string>(me?.stage ?? "");
  const [timeCommit, setTimeCommit] = useState<string>(me?.time_commit ?? "");
  const [city, setCity] = useState<string>(me?.city ?? "");
  const [bio, setBio] = useState<string>(me?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Meta>("/meta").then(setMeta).catch(() => {});
  }, []);

  const toggle = (
    arr: string[],
    set: (v: string[]) => void,
    v: string,
    max: number,
  ) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (arr.length < max) set([...arr, v]);
  };

  const ready =
    !!name.trim() &&
    skills.length > 0 &&
    interests.length > 0 &&
    !!goal &&
    !!stage &&
    !!timeCommit &&
    !!city;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.put<Me>("/me/profile", {
        name: name.trim(),
        skills,
        interests,
        goal,
        stage,
        time_commit: timeCommit,
        city,
        bio: bio.trim(),
      });
      setMe(updated);
      router.replace("/matches");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  if (!meta) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.textTertiary, textAlign: "center", marginTop: 40 }}>
          Loading…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>Build your profile</Text>
          <Text style={styles.h1}>Who are you,{"\n"}builder?</Text>
          <Text style={styles.sub}>
            This powers your matches. Be honest — it takes a minute.
          </Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            testID="onb-name-input"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Balveer"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          <SectionLabel hint="pick up to 4">Your skills</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.skills.map((s) => (
              <Chip
                key={s}
                label={s}
                active={skills.includes(s)}
                onPress={() => toggle(skills, setSkills, s, 4)}
                testID={`onb-skill-${s}`}
              />
            ))}
          </View>

          <SectionLabel hint="pick up to 4">What you want to build</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.interests.map((s) => (
              <Chip
                key={s}
                label={s}
                active={interests.includes(s)}
                onPress={() => toggle(interests, setInterests, s, 4)}
                testID={`onb-interest-${s}`}
              />
            ))}
          </View>

          <SectionLabel>Your goal</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.goals.map((s) => (
              <Chip key={s} label={s} active={goal === s} onPress={() => setGoal(s)} testID={`onb-goal-${s}`} />
            ))}
          </View>

          <SectionLabel>Where you&apos;re at</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.stages.map((s) => (
              <Chip key={s} label={s} active={stage === s} onPress={() => setStage(s)} testID={`onb-stage-${s}`} />
            ))}
          </View>

          <SectionLabel>Time you can give</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.times.map((s) => (
              <Chip
                key={s}
                label={s}
                active={timeCommit === s}
                onPress={() => setTimeCommit(s)}
                testID={`onb-time-${s}`}
              />
            ))}
          </View>

          <SectionLabel>Your city</SectionLabel>
          <View style={styles.chipWrap}>
            {meta.cities.map((s) => (
              <Chip key={s} label={s} active={city === s} onPress={() => setCity(s)} testID={`onb-city-${s}`} />
            ))}
          </View>

          <Text style={styles.label}>
            One line about you <Text style={{ color: colors.textTertiary }}>(optional)</Text>
          </Text>
          <TextInput
            testID="onb-bio-input"
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="What are you looking for?"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 14 }]}
          />

          {err ? (
            <Text style={{ color: colors.danger, fontFamily: font.bodyMedium, fontSize: 13, marginBottom: 10 }}>
              {err}
            </Text>
          ) : null}

          <PrimaryButton
            testID="onb-submit-button"
            label="Find my team"
            disabled={!ready}
            loading={busy}
            onPress={submit}
            iconRight={<Ionicons name="arrow-forward" size={18} color={colors.onBrand} />}
          />

          <Pressable
            onPress={() => router.replace("/login")}
            style={{ alignSelf: "center", marginTop: 16 }}
          >
            <Text style={{ color: colors.textTertiary, fontFamily: font.body, fontSize: 12 }}>
              Sign out
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: 100 },
  eyebrow: {
    color: colors.brand,
    fontFamily: font.bodySemi,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  h1: {
    color: colors.text,
    fontFamily: font.displayBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: font.bodyMedium,
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    height: 54,
    color: colors.text,
    fontFamily: font.bodyMedium,
    fontSize: 15,
    marginBottom: 22,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
});
