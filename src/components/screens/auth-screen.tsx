import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { signIn, signUp } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password.trim()) {
      setMessage("Skriv din email og adgangskode for at fortsætte.");
      return;
    }

    if (mode === "sign-up" && !trimmedName) {
      setMessage("Tilføj et navn for at oprette en konto.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const response =
      mode === "sign-in"
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
    setMessage(
      mode === "sign-in" ? "Du er logget ind." : "Din konto er oprettet.",
    );
    setIsSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Cut&Go</Text>
          <Text style={styles.title}>
            {mode === "sign-in" ? "Log ind" : "Opret konto"}
          </Text>

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
                Sign in
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
                Sign up
              </Text>
            </Pressable>
          </View>

          {mode === "sign-up" ? (
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="Fulde navn"
              placeholderTextColor="#8f877d"
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
            placeholderTextColor="#8f877d"
            style={styles.input}
            value={email}
          />

          <TextInput
            autoCapitalize="none"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            onChangeText={setPassword}
            placeholder="Adgangskode"
            placeholderTextColor="#8f877d"
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
                {mode === "sign-in" ? "Log ind" : "Opret konto"}
              </Text>
            )}
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4ecdf",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fffaf3",
    borderColor: "#e8dcc8",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 24,
  },
  eyebrow: {
    color: "#a44d17",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
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
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  message: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
