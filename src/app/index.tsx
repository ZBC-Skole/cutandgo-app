import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Cut&Go</Text>
        <Text style={styles.title}>Du er logget ind</Text>
        <Text style={styles.subtitle}>
          Den beskyttede del af appen kan bygges videre her. Auth-flowet ligger
          nu i `auth-screen.tsx`, sa layoutet kan pakkes ind i `AuthGuard`.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: "#f4ecdf",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fffaf3",
    borderColor: "#e8dcc8",
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 24,
    width: "100%",
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
    fontSize: 15,
    lineHeight: 22,
  },
});
