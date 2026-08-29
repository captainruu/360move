# 360 MOVE Uluwatu — Web App

A responsive front-end build of the 360 MOVE Uluwatu gym web app, built directly
from `prd.md` and the brand assets provided (logo, storefront, class photos,
digital card & check-in popup references).

## How to open it

No build step — it's static HTML/CSS/JS.

- **Quickest:** double-click `index.html` to open in a browser (member login,
  join flow and the visual design all work; camera QR scan needs a real server,
  see below).
- **Recommended:** serve the folder so the camera scanner and all pages work
  the same way they will in production:
  ```bash
  cd 360move
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Public site — Hero, About, Our Service, Membership, Promo, Contact |
| `join.html` | Join Us flow — pick package → name + phone → handoff to reception |
| `login.html` | Member login (Member ID only, no password) |
| `member.html` | Member account/portal (details + Log Out) |
| `admin-login.html` | Admin login |
| `admin.html` | Admin dashboard — Overview / Members / Check-in / Promo & Event |

## Demo logins

- **Member:** Member ID `360-DEMO99` (or any seeded ID, e.g. `360-MV0001`) on `login.html`.
- **Admin:** `admin@360move.com` / `360move2026` on `admin-login.html` (used automatically until Firebase is configured — see below).

## Connecting your own backend (Firebase + Supabase)

Two integrations are wired up and ready — they just need your project's keys:

### Admin login → Firebase Authentication
1. Open `js/firebase-config.js` and fill in `FIREBASE_CONFIG` with the values from
   **Firebase Console → Project settings → General → Your apps → SDK setup and configuration**.
2. In the Firebase Console, enable **Authentication → Sign-in method → Email/Password**, then add your admin user(s) under **Users**.
3. That's it — `admin-login.html` and `admin.html` already load the Firebase SDK and
   `js/firebase-auth.js`. As soon as `apiKey` is a real value, admin login switches
   from the local demo credentials to real Firebase sign-in automatically (see
   `FirebaseAdminAuth.isLive()` in `js/firebase-auth.js`).

### Promo & Event artwork → Supabase Storage
1. In Supabase Dashboard, create a **public bucket** named `promo-images` (Storage → New bucket).
2. Open `js/supabase-config.js` and fill in `SUPABASE_CONFIG.url` and `.anonKey`
   from **Project Settings → API**.
3. `admin.html` already loads the Supabase JS SDK and `js/supabase-storage.js`.
   Once configured, uploads in **Admin → Promo/Event** go straight to Supabase
   Storage and the public URL is what's saved on the promo record — until then,
   uploads fall back to local base64 storage so the flow keeps working in the demo.

### Members / check-ins / packages (Firestore)
These now run on real Firestore automatically once `js/firebase-config.js`
has real values (same config used for Auth) — no extra code changes
needed. Collections used:
- `members` — doc ID is the Member ID itself (e.g. `members/360-AU6H7S`)
- `checkins` — one auto-ID doc per visit
- `promos_events` — one auto-ID doc per promo/event
- `config/pricing` — `{ packageGroups: [...] }`
- `config/discounts` — `{ discountTiers: [...] }`

The first time an admin visits with Firebase configured, these collections
are auto-seeded with the same demo content used in the local fallback, so
there's something to explore immediately. Paste `firestore.rules` (in this
folder) into **Firebase Console → Firestore Database → Rules** — it lets
members look up their own ID (passwordless login) and the public site read
promos/pricing, while all writes require the signed-in admin account.

When Firebase ISN'T configured, everything transparently falls back to the
original localStorage-only demo store — same function names, same
behavior, just per-browser instead of shared.

## Data layer (important)

The PRD calls for **Firebase Authentication** (admin login) and **Firestore**
(`members`, `checkins`, `promos_events` collections). Since this build has no
Firebase project/credentials attached, `js/store.js` implements the same
collections and function signatures on top of `localStorage`, so every flow in
the PRD is fully clickable end-to-end:

- `members`, `checkins`, `promos_events`, `membership_packages`, `discount_tiers`
- Member ID auto-generation
- CSV export with month/year filename pattern (`members_January_2026.csv`)
- Digital card render + PNG export (1080×1350, via `html2canvas`) + WhatsApp handoff
- QR check-in — manual entry works everywhere; **camera scanning** (via `jsQR`)
  needs the page served over `http(s)` with camera permission (not `file://`)

**To connect real Firebase:**
1. Add the Firebase SDK + your project config to each HTML page.
2. In `js/store.js`, swap `Auth.loginAdmin/logoutAdmin` for
   `signInWithEmailAndPassword` / `signOut`.
3. Swap the `DB.*` functions for Firestore reads/writes
   (`getDocs`, `addDoc`, `setDoc`, `deleteDoc`, `onSnapshot`) — the function
   names and return shapes used by `admin.js` / `member.js` / `index.html`
   can stay the same, so the UI does not need to change.
4. Swap the promo "upload" (currently stored as a base64 data URL) for
   Firebase Storage, and store the resulting download URL on the
   `promos_events` doc instead.

## Open items carried over from the PRD (section 21)

These were left unspecified in the source requirement, so this build uses
clearly-labelled placeholders you should confirm before going live:
- Final logo/asset polish, tagline copy
- Real membership pricing & package list (`DB.packages()` in `js/store.js`)
- The 5 discount tier percentages (`DB.discountTiers()` in `js/store.js`)
- Final Member ID format (`360-MV0001` pattern used here)
- WhatsApp message wording for join requests / card sharing
- Real promo/event content (seeded with 2 placeholder items)

## Design

- Palette: matte black, white, grey, soft gold (see `:root` in `css/style.css`)
- Type: Poppins (display), Inter (body), JetBrains Mono (IDs/data/labels)
- Signature element: the hero "Orbit" — concentric rings echoing the 360 logo,
  with cursor-parallax on desktop and a graceful static fallback on mobile.
