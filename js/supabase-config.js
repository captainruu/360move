/* ==========================================================================
   360 MOVE — Supabase config
   -----------------------------------------------------------------------
   Fill this in with YOUR Supabase project's values:
   Supabase Dashboard → Project Settings → API → Project URL / anon public key.

   Used to store Promo & Event artwork in Supabase Storage instead of
   embedding images as base64 in localStorage. Until you fill in a real
   URL, promo uploads automatically fall back to local base64 storage
   (see js/supabase-storage.js) so the dashboard stays fully usable.

   Bucket setup (one-time, in Supabase Dashboard → Storage):
     1. Create a public bucket named  promo-images
     2. Storage → Policies → allow public SELECT, and INSERT/DELETE for
        the role you sign admins in with (or keep it open for a quick demo).
   ========================================================================== */

const SUPABASE_CONFIG = {
  url: "https://ebvpkvuokcwfgqumctmy.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidnBrdnVva2N3ZmdxdW1jdG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjQzNjAsImV4cCI6MjEwMzUwMDM2MH0.GEcHAHRvYDs_V3UtYeJzg04ye8OXHrolVY_rVo0nm_c",
  bucket: "promo-images"
};

function isSupabaseConfigured(){
  return SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== "YOUR_SUPABASE_PROJECT_URL";
}
