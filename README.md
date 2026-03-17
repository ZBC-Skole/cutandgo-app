# Cut & Go Expo App

This Expo app is wired to an existing Better Auth backend. It only contains the
client-side auth setup, so there is no Convex server configuration in this
repository.

## Auth setup

- Backend base URL: `http://127.0.0.1:3211`
- Auth routes: `http://127.0.0.1:3211/api/auth/*`
- App scheme: `cutandgoapp`

You can override the backend URL with an Expo public env var:

```bash
cp .env.example .env.local
```

```bash
EXPO_PUBLIC_AUTH_URL=http://127.0.0.1:3211
```

## Run the app

```bash
bun install
bun start
```

## Notes

- The auth client lives in `src/lib/auth-client.ts`.
- The starter screen in `src/app/index.tsx` is intentionally simple and is only
  meant to prove session, sign-in, sign-up, and sign-out flows.
- If you test on an Android emulator, `127.0.0.1` usually needs to become
  `10.0.2.2`.
