import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const fallbackScheme = "cutandgoapp";

const scheme =
  Constants.expoConfig?.scheme ??
  Constants.manifest2?.extra?.expoClient?.scheme ??
  fallbackScheme;

export const authBaseUrl =
  process.env.EXPO_PUBLIC_AUTH_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:3211";

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
