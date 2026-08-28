/* ==========================================================================
   360 MOVE — Firebase config
   -----------------------------------------------------------------------
   Fill this in with YOUR Firebase project's values:
   Firebase Console → Project settings → General → "Your apps" → SDK setup
   and configuration → Config.

   Until you fill in a real apiKey, the admin login below automatically
   falls back to the local demo login (admin@360move.com / 360move2026)
   so the rest of the app stays fully clickable.
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

function isFirebaseConfigured(){
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}
