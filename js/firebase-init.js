/* ==========================================================================
   360 MOVE — Firebase app + Firestore initializer (shared)
   -----------------------------------------------------------------------
   Load order matters: this file must come after js/firebase-config.js and
   the Firebase app/firestore SDK <script> tags, and before js/store.js,
   js/firebase-auth.js, or js/admin.js.
   ========================================================================== */

let _fbApp = null;
function getFirebaseApp(){
  if(!isFirebaseConfigured()) return null;
  if(_fbApp) return _fbApp;
  if(typeof firebase === 'undefined'){
    console.warn('Firebase SDK not loaded — check the <script> tags in this page.');
    return null;
  }
  _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
  return _fbApp;
}

let _fsDb = null;
function getFirestoreDb(){
  const app = getFirebaseApp();
  if(!app) return null;
  if(_fsDb) return _fsDb;
  if(typeof firebase.firestore !== 'function'){
    console.warn('Firestore SDK not loaded — check the <script> tags in this page.');
    return null;
  }
  _fsDb = firebase.firestore(app);
  return _fsDb;
}

// True when Firebase is configured AND the Firestore SDK is actually
// present on this page. Every Firestore-backed DB function checks this
// first and falls back to localStorage when it's false.
function isFirestoreLive(){
  return isFirebaseConfigured() && typeof firebase !== 'undefined' && typeof firebase.firestore === 'function';
}
