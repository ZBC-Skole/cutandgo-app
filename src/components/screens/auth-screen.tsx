import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { signIn, signUp } from "@/lib/auth-client";
import { type PortalIntent, usePortalIntent } from "@/lib/portal-intent";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const { portalIntent, setPortalIntent } = usePortalIntent();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isTablet = width >= 720;
  const isCustomer = portalIntent === "client";
  const allowSignUp = portalIntent !== "salon";

  const titleByPortal: Record<PortalIntent, string> = {
    client: mode === "sign-in" ? "Log ind" : "Opret konto",
    salon: "Salon login",
    admin: mode === "sign-in" ? "Admin login" : "Opret admin-konto",
  };

  const subtitleByPortal: Record<PortalIntent, string> = {
    client: "Log ind for at booke, se tider og administrere din konto.",
    salon:
      "Log ind med salonens hovedkonto. Derefter spørger appen efter medarbejderens PIN.",
    admin: "Log ind som admin for at oprette og administrere saloner.",
  };

  const ctaByPortal: Record<PortalIntent, string> = {
    client: mode === "sign-in" ? "Log ind" : "Opret konto",
    salon: "Fortsæt som salon",
    admin: mode === "sign-in" ? "Log ind som admin" : "Opret admin-konto",
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password.trim()) {
      setMessage("Skriv din email og adgangskode for at fortsætte.");
      return;
    }

    if (mode === "sign-up" && allowSignUp && !trimmedName) {
      setMessage("Tilføj et navn for at oprette en konto.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const shouldSignIn = portalIntent === "salon" || mode === "sign-in";

    const response = shouldSignIn
      ? await signIn.email({
          email: trimmedEmail,
          password,
        })
      : await signUp.email({
          email: trimmedEmail,
          password,
          name: trimmedName,
        });

    if (response.error) {
      setMessage(response.error.message || "Noget gik galt. Prøv igen.");
      setIsSubmitting(false);
      return;
    }

    setPassword("");
    setMessage(shouldSignIn ? "Du er logget ind." : "Din konto er oprettet.");
    setIsSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isTablet && styles.cardTablet]}>
          <Text style={styles.brand}>Cut&Go</Text>
          <Text style={styles.title}>{titleByPortal[portalIntent]}</Text>
          <Text style={styles.subtitle}>{subtitleByPortal[portalIntent]}</Text>

          {allowSignUp ? (
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => {
                  setMode("sign-in");
                  setMessage(null);
                }}
                style={[
                  styles.segmentButton,
                  mode === "sign-in" && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    mode === "sign-in" && styles.segmentLabelActive,
                  ]}
                >
                  Log ind
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode("sign-up");
                  setMessage(null);
                }}
                style={[
                  styles.segmentButton,
                  mode === "sign-up" && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    mode === "sign-up" && styles.segmentLabelActive,
                  ]}
                >
                  Opret konto
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.modeLabel}>Kun login for salon</Text>
          )}

          {mode === "sign-up" && allowSignUp ? (
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="Fulde navn"
              placeholderTextColor="#95887b"
              style={styles.input}
              value={name}
            />
          ) : null}

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#95887b"
            style={styles.input}
            value={email}
          />

          <TextInput
            autoCapitalize="none"
            autoComplete={
              portalIntent === "salon" || mode === "sign-in"
                ? "current-password"
                : "new-password"
            }
            onChangeText={setPassword}
            placeholder="Adgangskode"
            placeholderTextColor="#95887b"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fffaf3" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {ctaByPortal[portalIntent]}
              </Text>
            )}
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.footer}>
            {!isCustomer ? (
              <Pressable
                onPress={() => {
                  setPortalIntent("client");
                  setMode("sign-in");
                  setMessage(null);
                }}
              >
                <Text style={styles.footerLink}>Tilbage til kunde-login</Text>
              </Pressable>
            ) : null}

            {isCustomer ? (
              <View style={styles.footerLinks}>
                <Pressable
                  onPress={() => {
                    setPortalIntent("salon");
                    setMode("sign-in");
                    setMessage(null);
                  }}
                >
                  <Text style={styles.footerLink}>Log ind som salon</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setPortalIntent("admin");
                    setMode("sign-in");
                    setMessage(null);
                  }}
                >
                  <Text style={styles.footerLink}>Admin</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f3eadc",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    alignSelf: "center",
    backgroundColor: "#fffaf3",
    borderColor: "#e8dcc8",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxWidth: 430,
    padding: 24,
    width: "100%",
  },
  cardTablet: {
    padding: 28,
  },
  brand: {
    color: "#c65a18",
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    color: "#1f2937",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b635b",
    fontSize: 14,
    lineHeight: 20,
  },
  segmentedControl: {
    backgroundColor: "#efe1cf",
    borderRadius: 18,
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: "#fffaf3",
  },
  segmentLabel: {
    color: "#776d62",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: "#1f2937",
  },
  modeLabel: {
    color: "#8d4a1c",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#f7efe4",
    borderColor: "#eadfce",
    borderRadius: 18,
    borderWidth: 1,
    color: "#1f2937",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#c65a18",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#fffaf3",
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    color: "#6b635b",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    borderTopColor: "#eadfce",
    borderTopWidth: 1,
    gap: 12,
    marginTop: 6,
    paddingTop: 14,
  },
  footerLinks: {
    flexDirection: "row",
    gap: 16,
  },
  footerLink: {
    color: "#7a6f64",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
