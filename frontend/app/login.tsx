import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
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

const SPLASH = "https://static.prod-images.emergentagent.com/jobs/e6d869e8-0952-42dc-8f01-0ab01ee1fc22/images/b6da33375f6c4615dccd153ae930f34bd9cbc618a703c7ed707b8938fa635eae.png";

export default function Login() {
  const router = useRouter();
  const { logIn, logInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email || !password) {
      setErr("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await logIn(email.trim().toLowerCase(), password);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
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
      <Image source={{ uri: SPLASH }} style={styles.bg} blurRadius={2} />
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.95)", "#000"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="flash" size={20} color={colors.onBrand} />
            </View>
            <Text style={styles.brandWord}>Cofound</Text>
          </View>

          <Text style={styles.h1}>Find your{"\n"}startup team.</Text>
          <Text style={styles.sub}>
            Match with serious builders by skill, vision and time.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
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
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <PrimaryButton
            testID="login-submit-button"
            label="Log in"
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
            testID="login-google-button"
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
            <Text style={styles.footerText}>New here?</Text>
            <Link href="/signup" asChild>
              <Pressable testID="login-go-signup">
                <Text style={styles.footerLink}>Create an account</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.demoHint}>
            Try a demo: aarav@cofound.demo / demo1234
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
  scroll: { padding: space.xl, paddingTop: space.xxl, paddingBottom: 80 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 40 },
  brandMark: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  brandWord: {
    color: colors.text,
    fontFamily: font.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  h1: {
    color: colors.text,
    fontFamily: font.displayBold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 36,
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
  demoHint: {
    marginTop: 16,
    textAlign: "center",
    color: colors.textTertiary,
    fontFamily: font.body,
    fontSize: 11,
  },
});
