/* ==========================================================================
   360 MOVE — Data store
   -----------------------------------------------------------------------
   Every DB.* function is async and returns a Promise. When Firebase is
   configured (js/firebase-config.js has real values) and the Firestore SDK
   is loaded on the page, data reads/writes go straight to Firestore:

     members        — doc ID = memberId, e.g. members/360-AU6H7S
     checkins       — auto-ID docs, one per visit
     promos_events  — auto-ID docs, one per promo/event
     config/pricing    — { packageGroups: [...] }
     config/discounts  — { discountTiers: [...] }

   The very first time an admin visits with Firebase configured, this file
   seeds those collections from seedData() below (see ensureSeeded()) so
   there's demo content to explore immediately — same as the old
   localStorage-only version.

   When Firebase ISN'T configured, every function transparently falls back
   to the original localStorage-backed demo store (still async, so callers
   never need to know which backend is active).
   ========================================================================== */

const STORE_KEY = '360move_db_v4';
const SESSION_KEY = '360move_admin_session';
const MEMBER_SESSION_KEY = '360move_member_session';

function todayISO(){ return new Date().toISOString().slice(0,10); }

// Character set for generated Member IDs — deliberately excludes visually
// ambiguous characters (0/O, 1/I/L) so staff and members can read and type
// IDs correctly off a printed card or a phone screen without guesswork.
const SAFE_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genSafeCode(length = 6){
  let out = '';
  for(let i = 0; i < length; i++){
    out += SAFE_ID_CHARS[Math.floor(Math.random() * SAFE_ID_CHARS.length)];
  }
  return out;
}

function seedData(){
  const now = new Date();
  const plus = (days)=>{ const d=new Date(now); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
  const minus = (days)=>{ const d=new Date(now); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); };

  return {
    members: [
      { memberId:'360-MV0001', name:'Kadek Wirawan', phone:'0812-3456-7001', membershipPackage:'Monthly Unlimited', status:'Active', expiryDate:plus(24), createdAt:minus(6), discountTier:0, discountPercent:0 },
      { memberId:'360-MV0002', name:'Sarah Whitfield', phone:'0812-3456-7002', membershipPackage:'3-Month Performance', status:'Active', expiryDate:plus(58), createdAt:minus(32), discountTier:0, discountPercent:0 },
      { memberId:'360-MV0003', name:'Made Surya', phone:'0812-3456-7003', membershipPackage:'Annual All-Access', status:'Active', expiryDate:plus(210), createdAt:minus(155), discountTier:0, discountPercent:0 },
      { memberId:'360-MV0004', name:'Léa Dubois', phone:'0812-3456-7004', membershipPackage:'Drop-In 10 Pass', status:'Expired', expiryDate:minus(11), createdAt:minus(70), discountTier:0, discountPercent:0 },
      { memberId:'360-DEMO99', name:'Demo Member', phone:'0812-0000-0000', membershipPackage:'Monthly Unlimited', status:'Active', expiryDate:plus(19), createdAt:minus(10), discountTier:0, discountPercent:0 }
    ],
    checkins: [
      { id:'c1', memberId:'360-MV0001', name:'Kadek Wirawan', package:'Monthly Unlimited', status:'Active', date:todayISO(), time:'07:12' },
      { id:'c2', memberId:'360-MV0003', name:'Made Surya', package:'Annual All-Access', status:'Active', date:todayISO(), time:'08:45' },
      { id:'c3', memberId:'360-MV0002', name:'Sarah Whitfield', package:'3-Month Performance', status:'Active', date:minus(1), time:'17:20' }
    ],
    promos: [
      { id:'p1', title:'Uluwatu Anniversary Week', desc:'20% off all Annual All-Access sign-ups, this week only.', img:'assets/pt.jpg', createdAt:minus(2) },
      { id:'p2', title:'Bring a Friend, Free Class', desc:'Every Saturday Hot Pilates — bring a friend for free.', img:'assets/yoga.jpg', createdAt:minus(9) }
    ],
    packageGroups: [
      {
        id:'classes',
        category:'360 MOVE Classes',
        subtitle:'Access to all classes',
        note:'Includes Hot Pilates — Monday to Friday, 09:00.',
        tiers:[
          { id:'classes-dropin', name:'Drop In', price:150000 },
          { id:'classes-5', name:'5 Moves', price:700000 },
          { id:'classes-10', name:'10 Moves', price:1300000 },
          { id:'classes-15', name:'15 Moves', price:1800000 }
        ]
      },
      {
        id:'opengym',
        category:'360 MOVE Open Gym',
        subtitle:'Access to open gym — playground',
        note:'',
        tiers:[
          { id:'gym-dropin', name:'Drop In', price:100000 },
          { id:'gym-7', name:'7 Days', price:400000 },
          { id:'gym-14', name:'14 Days', price:675000 },
          { id:'gym-30', name:'30 Days', price:875000 },
          { id:'gym-90', name:'90 Days', price:1750000 },
          { id:'gym-180', name:'180 Days', price:2750000 }
        ]
      }
    ],
    discountTiers: [
      { tier:1, label:'Tier 1', percent:0 },
      { tier:2, label:'Tier 2', percent:5 },
      { tier:3, label:'Tier 3', percent:10 },
      { tier:4, label:'Tier 4', percent:15 },
      { tier:5, label:'Tier 5', percent:20 }
    ],
    admin: { email:'admin@360move.com', password:'360move2026' }
  };
}

/* ---------------- localStorage backend (fallback / demo mode) ---------------- */
function loadDB(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw){ const seeded = seedData(); localStorage.setItem(STORE_KEY, JSON.stringify(seeded)); return seeded; }
    return JSON.parse(raw);
  }catch(e){
    const seeded = seedData();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}
function saveDB(db){ localStorage.setItem(STORE_KEY, JSON.stringify(db)); }

/* ---------------- Firestore backend ---------------- */
// Seeds Firestore from seedData() the first time it's used on an empty
// project (checked via the config/pricing doc). All concurrent callers
// share the same in-flight promise so it only runs once per page load.
let _seedPromise = null;
function ensureSeeded(){
  if(!isFirestoreLive()) return Promise.resolve();
  if(!_seedPromise){
    _seedPromise = (async ()=>{
      const db = getFirestoreDb();
      const pricingDoc = await db.collection('config').doc('pricing').get();
      if(pricingDoc.exists) return;
      const seed = seedData();
      const batch = db.batch();
      seed.members.forEach(m=>{
        const { memberId, ...rest } = m;
        batch.set(db.collection('members').doc(memberId), rest);
      });
      seed.checkins.forEach(c=>{
        const { id, ...rest } = c;
        batch.set(db.collection('checkins').doc(), rest);
      });
      seed.promos.forEach(p=>{
        const { id, ...rest } = p;
        batch.set(db.collection('promos_events').doc(), rest);
      });
      batch.set(db.collection('config').doc('pricing'), { packageGroups: seed.packageGroups });
      batch.set(db.collection('config').doc('discounts'), { discountTiers: seed.discountTiers });
      await batch.commit();
    })();
  }
  return _seedPromise;
}

const DB = {
  // ---- members ----
  async members(){
    if(isFirestoreLive()){
      await ensureSeeded();
      const snap = await getFirestoreDb().collection('members').orderBy('createdAt','desc').get();
      return snap.docs.map(d => ({ memberId:d.id, ...d.data() }));
    }
    return loadDB().members;
  },

  async getMember(memberId){
    if(isFirestoreLive()){
      const doc = await getFirestoreDb().collection('members').doc(memberId).get();
      return doc.exists ? { memberId:doc.id, ...doc.data() } : null;
    }
    return loadDB().members.find(m=>m.memberId===memberId) || null;
  },

  async addMember({name, phone, membershipPackage, durationDays=30, discountTier=0}){
    const expiry = new Date(); expiry.setDate(expiry.getDate() + Number(durationDays||30));
    const expiryDate = expiry.toISOString().slice(0,10);
    const tiers = await DB.discountTiers();
    const tierInfo = tiers.find(t=>t.tier===Number(discountTier));
    const record = {
      name, phone, membershipPackage,
      status:'Active', expiryDate,
      createdAt: todayISO(),
      discountTier: tierInfo ? tierInfo.tier : 0,
      discountPercent: tierInfo ? tierInfo.percent : 0
    };

    if(isFirestoreLive()){
      const db = getFirestoreDb();
      let memberId, exists = true;
      while(exists){
        memberId = '360-' + genSafeCode(6);
        exists = (await db.collection('members').doc(memberId).get()).exists;
      }
      await db.collection('members').doc(memberId).set(record);
      return { memberId, ...record };
    }

    const db = loadDB();
    let memberId;
    do{
      memberId = '360-' + genSafeCode(6);
    }while(db.members.some(m => m.memberId === memberId));
    const member = { memberId, ...record };
    db.members.unshift(member);
    saveDB(db);
    return member;
  },

  async deleteMember(memberId){
    if(isFirestoreLive()){
      await getFirestoreDb().collection('members').doc(memberId).delete();
      return;
    }
    const db = loadDB();
    db.members = db.members.filter(m=>m.memberId!==memberId);
    saveDB(db);
  },

  // Pure computation, no I/O — safe to keep synchronous. Used for display;
  // does not persist the recomputed status.
  refreshStatus(member){
    if(!member) return member;
    member.status = (member.expiryDate < todayISO()) ? 'Expired' : 'Active';
    return member;
  },

  // ---- checkins ----
  async checkins(){
    if(isFirestoreLive()){
      const snap = await getFirestoreDb().collection('checkins').get();
      return snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
    }
    return loadDB().checkins;
  },

  async checkinsForMember(memberId){
    const all = await DB.checkins();
    return all.filter(c=>c.memberId===memberId).sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
  },

  async addCheckin(member){
    const now = new Date();
    const entry = {
      memberId: member.memberId,
      name: member.name,
      package: member.membershipPackage,
      status: member.status,
      date: todayISO(),
      time: now.toTimeString().slice(0,5)
    };
    if(isFirestoreLive()){
      const ref = await getFirestoreDb().collection('checkins').add(entry);
      return { id:ref.id, ...entry };
    }
    const db = loadDB();
    const record = { id:'c'+Date.now(), ...entry };
    db.checkins.unshift(record);
    saveDB(db);
    return record;
  },

  async todaysCheckins(){
    const all = await DB.checkins();
    return all.filter(c=>c.date===todayISO());
  },

  // ---- promos/events ----
  async promos(){
    if(isFirestoreLive()){
      await ensureSeeded();
      const snap = await getFirestoreDb().collection('promos_events').get();
      return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
    }
    return loadDB().promos.sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
  },

  async addPromo({title, desc, img}){
    const entry = { title, desc, img, createdAt: todayISO() };
    if(isFirestoreLive()){
      await getFirestoreDb().collection('promos_events').add(entry);
      return;
    }
    const db = loadDB();
    db.promos.unshift({ id:'p'+Date.now(), ...entry });
    saveDB(db);
  },

  async deletePromo(id){
    if(isFirestoreLive()){
      await getFirestoreDb().collection('promos_events').doc(id).delete();
      return;
    }
    const db = loadDB();
    db.promos = db.promos.filter(p=>p.id!==id);
    saveDB(db);
  },

  // ---- packages / discounts ----
  async packageGroups(){
    if(isFirestoreLive()){
      await ensureSeeded();
      const doc = await getFirestoreDb().collection('config').doc('pricing').get();
      return doc.exists ? doc.data().packageGroups : [];
    }
    return loadDB().packageGroups;
  },

  async updatePackageGroups(groups){
    if(isFirestoreLive()){
      await getFirestoreDb().collection('config').doc('pricing').set({ packageGroups: groups });
      return;
    }
    const db = loadDB();
    db.packageGroups = groups;
    saveDB(db);
  },

  // Flat list of every tier across every category, for pickers/selects.
  async flatTiers(){
    const groups = await DB.packageGroups();
    const out = [];
    groups.forEach(g=>{
      g.tiers.forEach(t=>{
        out.push({ groupId:g.id, groupName:g.category, tierId:t.id, name:t.name, price:t.price, label:`${g.category} — ${t.name}` });
      });
    });
    return out;
  },

  async discountTiers(){
    if(isFirestoreLive()){
      await ensureSeeded();
      const doc = await getFirestoreDb().collection('config').doc('discounts').get();
      return doc.exists ? doc.data().discountTiers : [];
    }
    return loadDB().discountTiers;
  },

  async updateDiscountTiers(tiers){
    if(isFirestoreLive()){
      await getFirestoreDb().collection('config').doc('discounts').set({ discountTiers: tiers });
      return;
    }
    const db = loadDB();
    db.discountTiers = tiers;
    saveDB(db);
  },

  applyDiscount(price, percent){ return Math.round(price * (1 - (Number(percent)||0)/100)); },

  // ---- admin (local-fallback credentials only — real Firebase Authentication
  // is handled in js/firebase-auth.js and never touches this) ----
  adminCreds(){ return loadDB().admin; }
};

/* ---------------- Auth ---------------- */
const Auth = {
  loginAdmin(email, password){
    const creds = DB.adminCreds();
    if(email.trim().toLowerCase()===creds.email && password===creds.password){
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, loggedAt: Date.now() }));
      return true;
    }
    return false;
  },
  isAdminLoggedIn(){ return !!sessionStorage.getItem(SESSION_KEY); },
  logoutAdmin(){ sessionStorage.removeItem(SESSION_KEY); },

  async loginMember(memberId){
    const id = memberId.trim().toUpperCase();
    const m = await DB.getMember(id);
    if(!m) return null;
    DB.refreshStatus(m);
    sessionStorage.setItem(MEMBER_SESSION_KEY, id);
    return m;
  },
  currentMemberId(){ return sessionStorage.getItem(MEMBER_SESSION_KEY); },
  logoutMember(){ sessionStorage.removeItem(MEMBER_SESSION_KEY); }
};

/* ---------------- helpers ---------------- */
function formatIDR(n){
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
function formatDate(iso){
  if(!iso) return '-';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function monthName(i){
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
}
function csvDownload(filename, rows){
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
