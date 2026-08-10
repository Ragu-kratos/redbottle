import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // Must match the project the Cloud Function verifies tokens against
  // (verifyIdToken checks the `aud` claim) -- see functions/index.js.
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

// Must run before any other Auth call, or the SDK throws
// auth/emulator-config-failed. connectAuthEmulator does not touch
// persistence -- IndexedDB-backed sign-in state behaves the same as against
// production, including staying signed in offline.
if (import.meta.env.VITE_USE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
