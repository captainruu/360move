/* ==========================================================================
   360 MOVE — Supabase Storage wrapper (Promo & Event artwork)
   -----------------------------------------------------------------------
   If js/supabase-config.js has a real project URL, uploaded promo artwork
   is pushed to Supabase Storage and the public URL is what gets saved on
   the promo record. Until then, this falls back to storing the image as a
   base64 data URL directly on the record (same as before) — see
   PromoStorage.upload() below, used by js/admin.js.
   ========================================================================== */

let _sbClient = null;
function getSupabaseClient(){
  if(!isSupabaseConfigured()) return null;
  if(_sbClient) return _sbClient;
  if(typeof supabase === 'undefined'){
    console.warn('Supabase SDK not loaded — check the <script> tag in this page.');
    return null;
  }
  _sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return _sbClient;
}

const PromoStorage = {
  isLive(){ return isSupabaseConfigured() && typeof supabase !== 'undefined'; },

  // file: a File from an <input type="file">. Returns a Promise<string> (URL to store on the promo record).
  async upload(file){
    if(this.isLive()){
      const client = getSupabaseClient();
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_')}`;
      const { error } = await client.storage.from(SUPABASE_CONFIG.bucket).upload(path, file, { upsert:false });
      if(error){
        console.warn('Supabase upload failed, falling back to local storage:', error.message);
        return this._toDataURL(file);
      }
      const { data } = client.storage.from(SUPABASE_CONFIG.bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    return this._toDataURL(file);
  },

  _toDataURL(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (ev)=> resolve(ev.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
