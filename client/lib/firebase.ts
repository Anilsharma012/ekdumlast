// client/lib/firebase.ts
// -------------------------------------------------------
// Firebase init + Google & Phone auth helpers (TS + Vite)
// Dev safe logs, Firestore long-polling fix, SSR guards
// Recaptcha: invisible + auto-created hidden container
// -------------------------------------------------------

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type ConfirmationResult,
  type AuthError,
} from "firebase/auth";
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore";

// ---- ENV (support both VITE_FIREBASE_* and VITE_FB_*)
const envCfg = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ??
    import.meta.env.VITE_FB_API_KEY ??
    "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
    import.meta.env.VITE_FB_AUTH_DOMAIN ??
    "",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ??
    import.meta.env.VITE_FB_PROJECT_ID ??
    "",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    import.meta.env.VITE_FB_STORAGE_BUCKET ??
    "",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ??
    import.meta.env.VITE_FB_MESSAGING_SENDER_ID ??
    "",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    import.meta.env.VITE_FB_APP_ID ??
    "",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ??
    import.meta.env.VITE_FB_MEASUREMENT_ID ??
    "",
};

// quick sanity
const requiredOk =
  !!envCfg.apiKey && !!envCfg.authDomain && !!envCfg.projectId && !!envCfg.appId;
export const isFirebaseConfigured = requiredOk;
console.log("[FB] isFirebaseConfigured:", requiredOk);

// IMPORTANT: bucket must end with appspot.com (not firebasestorage.app)
const firebaseConfig = {
  apiKey: envCfg.apiKey,
  authDomain: envCfg.authDomain,
  projectId: envCfg.projectId,
  storageBucket: envCfg.storageBucket || undefined, // e.g. aashish-properties.appspot.com
  messagingSenderId: envCfg.messagingSenderId || undefined,
  appId: envCfg.appId,
  measurementId: envCfg.measurementId || undefined,
};

let app: FirebaseApp | null = null;
let analytics: any = undefined;
let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: Firestore | null = null;

if (requiredOk) {
  app = initializeApp(firebaseConfig);
  console.log("[FB] Initialized", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });

  authInstance = getAuth(app);

  // Firestore: long-polling → fixes 400 Listen in dev/proxies
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 30 },
  });

  if (
    typeof window !== "undefined" &&
    firebaseConfig.measurementId &&
    import.meta.env.MODE === "production"
  ) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("[FB] Analytics init skipped:", (e as any)?.message || e);
    }
  }

  if (typeof window !== "undefined" && dbInstance) {
    enableIndexedDbPersistence(dbInstance).catch((err: any) => {
      if (err?.code === "failed-precondition") {
        console.warn("[FB] Persistence off (multiple tabs).");
      } else if (err?.code === "unimplemented") {
        console.warn("[FB] Persistence not supported in this browser.");
      } else {
        console.warn("[FB] Persistence error:", err?.message || err);
      }
    });
  }
} else {
  console.warn("[FB] Missing required env vars. Firebase features disabled.");
}

// ✅ just export; DON'T redeclare
export { app };
export const analyticsInstance = analytics;
export const auth = authInstance as ReturnType<typeof getAuth>;
export const db = dbInstance as Firestore;

// ---- Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ---- Utilities
export const isUserSignedIn = (): boolean => !!(auth && auth.currentUser);
export const getCurrentUser = (): FirebaseUser | null =>
  auth ? auth.currentUser : null;

export async function getFreshIdToken(): Promise<string> {
  if (!auth?.currentUser) throw new Error("Not signed in");
  return auth.currentUser.getIdToken(true); // force refresh
}

// ---- Google Sign-in
export const signInWithGoogle = async (): Promise<{
  idToken: string;
  profile: {
    uid: string;
    email: string | null;
    name: string | null;
    photoURL: string | null;
  };
}> => {
  if (!auth) throw new Error("Firebase not configured");

  try {
    // redirect fallback (if popup blocked earlier)
    try {
      const red = await getRedirectResult(auth);
      if (red?.user) {
        const u = red.user;
        const idToken = await u.getIdToken(true);
        console.log("[FB][Google] Redirect sign-in OK]:", {
          uid: u.uid,
          email: u.email,
        });
        return {
          idToken,
          profile: {
            uid: u.uid,
            email: u.email,
            name: u.displayName,
            photoURL: u.photoURL,
          },
        };
      }
    } catch (e) {
      console.warn("[FB][Google] getRedirectResult warn:", (e as any)?.message || e);
    }

    console.log("[FB][Google] Opening popup…");
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("[FB][Google] Signed in:", { uid: user.uid, email: user.email });

    const idToken = await user.getIdToken(true);
    console.log("[FB][Google] Got ID token length:", idToken.length);

    return {
      idToken,
      profile: {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
      },
    };
  } catch (err) {
    const e = err as AuthError;
    let message = "Google authentication failed";
    switch (e?.code) {
      case "auth/popup-closed-by-user":
        message = "Authentication cancelled by user";
        break;
      case "auth/popup-blocked":
        message = "Popup blocked. Allow popups and retry.";
        break;
      case "auth/cancelled-popup-request":
        message = "Authentication cancelled (another popup requested).";
        break;
      case "auth/operation-not-allowed":
        message = "Google auth is not enabled in Firebase Console.";
        break;
      case "auth/unauthorized-domain":
        message = "Domain not authorized in Firebase Authentication settings.";
        break;
      case "auth/network-request-failed":
        message =
          "Network error. Add your dev/preview domain to Authorized domains.";
        break;
      default:
        message = e?.message || message;
    }
    console.error("[FB][Google] Error:", e?.code, message);
    throw new Error(message);
  }
};

// ---- Phone OTP (INVISIBLE reCAPTCHA, no UI needed)
export class PhoneAuthService {
  private recaptcha: RecaptchaVerifier | null = null;
  private confirmation: ConfirmationResult | null = null;

  private ensureHiddenContainer(): HTMLElement {
    let el = document.getElementById("fb-recaptcha");
    if (!el) {
      el = document.createElement("div");
      el.id = "fb-recaptcha";
      // off-screen but present
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.bottom = "0";
      document.body.appendChild(el);
    }
    return el;
  }

  private ensureRecaptcha(): RecaptchaVerifier {
    if (!auth) throw new Error("Firebase not configured");
    if (this.recaptcha) return this.recaptcha;

    const el = this.ensureHiddenContainer();
    // Modular API signature: new RecaptchaVerifier(auth, containerOrId, params)
    this.recaptcha = new RecaptchaVerifier(auth, el, { size: "invisible" });
    return this.recaptcha;
  }

  private toE164(raw: string) {
    const digits = raw.replace(/\D/g, "");
    return raw.startsWith("+") ? raw : `+91${digits}`;
  }

  async sendOTP(rawPhone: string): Promise<void> {
    if (!auth) throw new Error("Firebase not configured");
    try {
      const appVerifier = this.ensureRecaptcha();
      const phone = this.toE164(rawPhone);
      console.log("[FB][OTP] Sending to:", phone);
      this.confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      console.log("[FB][OTP] OTP sent");
    } catch (e) {
      console.error("[FB][OTP] Send failed:", e);
      try { this.recaptcha?.clear(); } catch {}
      this.recaptcha = null;
      throw e;
    }
  }

  async verifyOTP(code: string): Promise<{
    firebaseUser: FirebaseUser;
    idToken: string;
  }> {
    if (!this.confirmation) throw new Error("OTP not sent yet");
    try {
      const cred = await this.confirmation.confirm(code);
      const idToken = await cred.user.getIdToken(true);
      console.log("[FB][OTP] Verified");
      return { firebaseUser: cred.user, idToken };
    } catch (e) {
      console.error("[FB][OTP] Verify failed:", e);
      throw e;
    }
  }

  reset(): void {
    try { this.recaptcha?.clear(); } catch {}
    this.recaptcha = null;
    this.confirmation = null;
  }
}

export const phoneAuth = new PhoneAuthService();

// ---- Auth state listener & signout
export const onAuthStateChange = (cb: (u: FirebaseUser | null) => void) =>
  auth ? onAuthStateChanged(auth, cb) : () => {};

export const signOutUser = async () => {
  if (!auth) return;
  await signOut(auth);
  console.log("[FB] Signed out");
};

// ---- Dev helpers
declare global {
  interface Window {
    testGoogle?: () => Promise<string>;
    showFbCfg?: () => void;
  }
}
if (typeof window !== "undefined") {
  window.testGoogle = async () => {
    const res = await signInWithGoogle();
    console.log("[TEST] UID:", res.profile.uid, "| Email:", res.profile.email);
    return res.idToken;
  };
  window.showFbCfg = () => {
    console.log("[FB][CFG]", {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasApiKey: !!firebaseConfig.apiKey,
      hasAppId: !!firebaseConfig.appId,
    });
  };
}

export default app;
