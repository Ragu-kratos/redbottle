import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
} from "firebase/auth";
import { auth } from "../utils/firebase.js";

// Single source of truth for auth error copy.
export const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "That email address looks invalid.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "No account with that email -- try Create account.",
  "auth/email-already-in-use": "An account already exists -- try Sign in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/network-request-failed": "You're offline -- signing in requires a connection.",
};

// Resolves once Auth has finished reading its IndexedDB-persisted state --
// awaiting this (rather than reading currentUser() directly) avoids a
// flash-of-wrong-page on load, since currentUser is null until this settles.
export function ready() {
  return auth.authStateReady();
}

export function currentUser() {
  return auth.currentUser;
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// getIdToken() resolves from cache (no network) unless the token is within
// ~30s of its 1-hour expiry, in which case it refreshes. It rejects with
// auth/network-request-failed if that refresh can't reach the network, or
// auth/user-token-expired if there's no refresh token at all.
export function getToken() {
  return auth.currentUser?.getIdToken();
}

export function onAuthChange(callback) {
  return onIdTokenChanged(auth, callback);
}

// Route guards for the per-screen entries (see src/entries/*.js). Screens
// render with a [data-auth-pending] attribute on <body> that hides content
// (see styles/index.css) until one of these resolves, so a signed-out
// visitor to /home never sees the page before the redirect fires.
//
// auth/network-request-failed while offline does NOT sign the user out --
// only auth/user-token-expired / auth/user-disabled do -- and Auth resolves
// a signed-in user from IndexedDB with no network at all, so these guards
// keep /home rendering offline.
export async function requireUser(redirectTo = "/login") {
  await ready();
  if (!currentUser()) {
    location.replace(redirectTo);
    return false;
  }
  document.body.removeAttribute("data-auth-pending");
  return true;
}

export async function requireAnonymous(redirectTo = "/home") {
  await ready();
  if (currentUser()) {
    location.replace(redirectTo);
    return false;
  }
  document.body.removeAttribute("data-auth-pending");
  return true;
}
