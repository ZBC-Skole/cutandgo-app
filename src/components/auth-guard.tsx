import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/lib/auth-client";

import AuthScreen from "./screens/auth-screen";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();

  if (isPending) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color="#c65a18" size="large" />
        <Text style={styles.stateTitle}>Tjekker din session</Text>
        <Text style={styles.stateSubtitle}>
          Vi forbinder til din Cut&Go konto lige nu.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.stateTitle}>Forbindelsen fejlede</Text>
        <Text style={styles.stateSubtitle}>
          Vi kunne ikke hente din session. Prøv igen om et øjeblik.
        </Text>
      </View>
    );
  }

  if (!session?.user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#f4ecdf",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    color: "#1f2937",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  stateSubtitle: {
    color: "#6b635b",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
