import AuthGuard from "@/components/auth-guard";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#f5efe6",
          },
          headerTintColor: "#1f2937",
          headerTitleStyle: {
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: "#f5efe6",
          },
        }}
      />
    </AuthGuard>
  );
}
