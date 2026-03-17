# Cut & Go Expo App

This Expo app is wired to an existing Better Auth backend. It only contains the
client-side auth setup, so there is no Convex server configuration in this
repository.

## Auth setup

- Backend base URL: `http://localhost:3211` on web, `http://127.0.0.1:3211` on native simulator/device
- Auth routes: `http://localhost:3211/api/auth/*` on web
- App scheme: `cutandgoapp`

You can override the backend URLs with Expo public env vars:

```bash
cp .env.example .env.local
```

```bash
EXPO_PUBLIC_AUTH_URL=http://localhost:3211
EXPO_PUBLIC_API_URL=http://localhost:8787
```

`EXPO_PUBLIC_AUTH_URL` should point at the Better Auth server.

`EXPO_PUBLIC_API_URL` should point at the Cut&Go API server that exposes `/api/v1`.

## Run the app

```bash
bun install
bun start
```

## Notes

- The auth client lives in `src/lib/auth-client.ts`.
- Web uses the Convex cross-domain auth plugin, so auth requests do not depend on browser third-party cookies.
- The starter screen in `src/app/index.tsx` is intentionally simple and is only
  meant to prove session, sign-in, sign-up, and sign-out flows.
- If you test on an Android emulator, `127.0.0.1` usually needs to become
  `10.0.2.2`.
