import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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

import { PrimaryButton } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, space } from "@/src/lib/theme";

export default function Signup() {
  const router = useRouter();
  const { signUp, logInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!name.trim() || !email || !password) {
      setErr("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    setGoogleBusy(true);
    try {
      await logInWithGoogle();
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="signup-back">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.h1}>Build your{"\n"}cofounder profile.</Text>
          <Text style={styles.sub}>
            Two minutes now, dozens of right-fit matches after.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              testID="signup-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Balveer"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="signup-email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@startup.com"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <PrimaryButton
            testID="signup-submit-button"
            label="Create account"
            onPress={submit}
            loading={busy}
            iconRight={<Ionicons name="arrow-forward" size={18} color={colors.onBrand} />}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            testID="signup-google-button"
            onPress={google}
            disabled={googleBusy}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { transform: [{ scale: 0.98 }] },
              googleBusy && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.googleBtnText}>
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <Pressable testID="signup-go-login">
                <Text style={styles.footerLink}>Log in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: 80 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  h1: {
    color: colors.text,
    fontFamily: font.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 10,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  field: { marginBottom: 16 },
  label: {
    color: colors.textSecondary,
    fontFamily: font.bodyMedium,
    fontSize: 12,
    marginBottom: 6,
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
  },
  err: {
    color: colors.danger,
    fontFamily: font.bodyMedium,
    fontSize: 13,
    marginBottom: 12,
  },
  divider: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textTertiary, fontFamily: font.body, fontSize: 12 },
  googleBtn: {
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleBtnText: { color: colors.text, fontFamily: font.bodySemi, fontSize: 15 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  footerText: { color: colors.textTertiary, fontFamily: font.body, fontSize: 14 },
  footerLink: { color: colors.brand, fontFamily: font.bodySemi, fontSize: 14 },
});
