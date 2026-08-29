/* ==========================================================================
   360 MOVE — Firebase Authentication wrapper (Admin login)
   -----------------------------------------------------------------------
   If js/firebase-config.js has real values, this uses actual Firebase
   Authentication (signInWithEmailAndPassword / signOut). If it still has
   the placeholder values, it transparently falls back to the local demo
   login in js/store.js (Auth.loginAdmin) so the dashboard stays usable
   while you wire up your Firebase project.

   Requires (loaded before this file):
     <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
     js/firebase-config.js
     js/firebase-init.js   (provides getFirebaseApp())
   ========================================================================== */

const FirebaseAdminAuth = {
  isLive(){ return isFirebaseConfigured() && typeof firebase !== 'undefined'; },

  // Maps Firebase's error codes to plain, brand-neutral messages — the raw
  // err.message (e.g. "Firebase: Error (auth/wrong-password).") is never
  // shown to the person signing in.
  _friendlyError(err){
    const code = err && err.code ? err.code : '';
    const map = {
      'auth/wrong-password': 'Incorrect email or password.',
      'auth/user-not-found': 'Incorrect email or password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/invalid-email': "That doesn't look like a valid email address.",
      'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
      'auth/network-request-failed': 'Network error — check your connection and try again.',
      'auth/user-disabled': 'This account has been disabled.'
    };
    return map[code] || 'Login failed. Please try again.';
  },

  // Returns { ok: boolean, error?: string }
  async login(email, password){
    if(this.isLive()){
      try{
        getFirebaseApp();
        await firebase.auth().signInWithEmailAndPassword(email, password);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, loggedAt: Date.now(), via:'firebase' }));
        return { ok:true };
      }catch(err){
        return { ok:false, error: this._friendlyError(err) };
      }
    }
    // ---- Fallback: local demo auth (see js/store.js) ----
    const ok = Auth.loginAdmin(email, password);
    return ok ? { ok:true } : { ok:false, error:'Incorrect email or password.' };
  },

  async logout(){
    if(this.isLive()){
      try{ getFirebaseApp(); await firebase.auth().signOut(); }catch(err){ /* no-op */ }
    }
    Auth.logoutAdmin();
  },

  // Firebase Auth restores the signed-in session asynchronously on every
  // fresh page load (it takes a brief moment even though sign-in itself
  // already happened on a previous page). Firestore requests fired before
  // that restoration completes go out unauthenticated and get rejected by
  // security rules that require request.auth != null — which showed up as
  // "Membership Package" and other admin dropdowns loading empty. Call
  // this and await it before making any Firestore-backed DB.* call on a
  // page load.
  _readyPromise: null,
  waitForReady(){
    if(!this.isLive()) return Promise.resolve(null);
    if(!this._readyPromise){
      this._readyPromise = new Promise((resolve)=>{
        getFirebaseApp();
        const unsubscribe = firebase.auth().onAuthStateChanged((user)=>{
          unsubscribe();
          resolve(user);
        });
      });
    }
    return this._readyPromise;
  }
};
