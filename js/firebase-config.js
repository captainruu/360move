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
  apiKey: "AIzaSyA8IkFiXmcm0p-SkOYRxSmKW3BOn6bfyHA",
  authDomain: "move-76021.firebaseapp.com",
  projectId: "move-76021",
  storageBucket: "move-76021.firebasestorage.app",
  messagingSenderId: "481856099663",
  appId: "1:481856099663:web:b1ec947909cc21fa31a13a",
  measurementId: "G-J5QG28RMBX"
};

function isFirebaseConfigured(){
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}
