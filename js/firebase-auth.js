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

  // Returns { ok: boolean, error?: string }
  async login(email, password){
    if(this.isLive()){
      try{
        getFirebaseApp();
        await firebase.auth().signInWithEmailAndPassword(email, password);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, loggedAt: Date.now(), via:'firebase' }));
        return { ok:true };
      }catch(err){
        return { ok:false, error: err.message || 'Login failed.' };
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
  }
};
