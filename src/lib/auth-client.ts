import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const fallbackScheme = "cutandgoapp";

const scheme =
  Constants.expoConfig?.scheme ??
  Constants.manifest2?.extra?.expoClient?.scheme ??
  fallbackScheme;

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveAuthBaseUrl() {
  const configuredBaseUrl =
    process.env.EXPO_PUBLIC_AUTH_URL?.replace(/\/$/, "") ??
    (Platform.OS === "web" ? "http://localhost:3211" : "http://127.0.0.1:3211");

  if (Platform.OS !== "web" || typeof window === "undefined") {
    return configuredBaseUrl;
  }

  try {
    const authUrl = new URL(configuredBaseUrl);
    const pageHostname = window.location.hostname;

    if (
      isLoopbackHostname(pageHostname) &&
      isLoopbackHostname(authUrl.hostname) &&
      pageHostname !== authUrl.hostname
    ) {
      authUrl.hostname = pageHostname;
    }

    return authUrl.toString().replace(/\/$/, "");
  } catch {
    return configuredBaseUrl;
  }
}

const webStorage =
  typeof window !== "undefined"
    ? {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) =>
          window.localStorage.setItem(key, value),
      }
    : undefined;

const authStorage = (Platform.OS === "web"
  ? webStorage
  : {
      getItem: (key: string) => SecureStore.getItem(key),
      setItem: (key: string, value: string) => SecureStore.setItem(key, value),
    }) ?? {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
};

export const authBaseUrl = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: authStorage,
    }),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
