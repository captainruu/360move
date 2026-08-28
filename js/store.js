/* ==========================================================================
   360 MOVE — Data store
   -----------------------------------------------------------------------
   This is a client-side mock of the Firestore collections described in the
   PRD (`members`, `checkins`, `promos_events`, `membership_packages`,
   `discount_tiers`) so the whole app is fully clickable/demoable without a
   backend. Everything lives in localStorage under the STORE_KEY below.

   TO GO LIVE WITH FIREBASE:
   - Replace the read/write helpers at the bottom of this file
     (DB.get/DB.set/collection helpers) with Firestore calls
     (getDocs/setDoc/addDoc/onSnapshot from the Firebase SDK).
   - Replace Auth.loginAdmin()/logoutAdmin() with
     signInWithEmailAndPassword / signOut from Firebase Authentication.
   - Keep the same function signatures used by admin.js / member.js / main.js
     so the UI layer does not need to change.
   ========================================================================== */

const STORE_KEY = '360move_db_v1';
const SESSION_KEY = '360move_admin_session';
const MEMBER_SESSION_KEY = '360move_member_session';

function todayISO(){ return new Date().toISOString().slice(0,10); }

function seedData(){
  const now = new Date();
  const plus = (days)=>{ const d=new Date(now); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
  const minus = (days)=>{ const d=new Date(now); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); };

  return {
    members: [
      { memberId:'360-MV0001', name:'Kadek Wirawan', phone:'0812-3456-7001', membershipPackage:'Monthly Unlimited', status:'Active', expiryDate:plus(24), createdAt:minus(6) },
      { memberId:'360-MV0002', name:'Sarah Whitfield', phone:'0812-3456-7002', membershipPackage:'3-Month Performance', status:'Active', expiryDate:plus(58), createdAt:minus(32) },
      { memberId:'360-MV0003', name:'Made Surya', phone:'0812-3456-7003', membershipPackage:'Annual All-Access', status:'Active', expiryDate:plus(210), createdAt:minus(155) },
      { memberId:'360-MV0004', name:'Léa Dubois', phone:'0812-3456-7004', membershipPackage:'Drop-In 10 Pass', status:'Expired', expiryDate:minus(11), createdAt:minus(70) },
      { memberId:'360-DEMO01', name:'Demo Member', phone:'0812-0000-0000', membershipPackage:'Monthly Unlimited', status:'Active', expiryDate:plus(19), createdAt:minus(10) }
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
    // Package pricing — from 360 MOVE's official price list (Classes & Open Gym),
    // grouped by category, each with a set of tiers. Editable from
    // Admin → Pricing (DB.updatePackages).
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
    // 5-tier discount system (PRD §14) — percent off the tier price above.
    // Editable from Admin → Pricing (DB.updateDiscountTiers).
    discountTiers: [
      { tier:1, label:'Tier 1', percent:0 },
      { tier:2, label:'Tier 2', percent:5 },
      { tier:3, label:'Tier 3', percent:10 },
      { tier:4, label:'Tier 4', percent:15 },
      { tier:5, label:'Tier 5', percent:20 }
    ],
    admin: { email:'admin@360move.com', password:'360move2026' },
    seq: 5
  };
}

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

const DB = {
  all(){ return loadDB(); },

  // ---- members ----
  members(){ return loadDB().members; },
  getMember(memberId){ return loadDB().members.find(m=>m.memberId===memberId) || null; },
  addMember({name, phone, membershipPackage, durationDays=30, discountTier=0}){
    const db = loadDB();
    db.seq += 1;
    const memberId = '360-MV' + String(db.seq).padStart(4,'0');
    const expiry = new Date(); expiry.setDate(expiry.getDate() + Number(durationDays||30));
    const tierInfo = db.discountTiers.find(t=>t.tier===Number(discountTier));
    const member = {
      memberId, name, phone, membershipPackage,
      status:'Active', expiryDate: expiry.toISOString().slice(0,10),
      createdAt: todayISO(),
      discountTier: tierInfo ? tierInfo.tier : 0,
      discountPercent: tierInfo ? tierInfo.percent : 0
    };
    db.members.unshift(member);
    saveDB(db);
    return member;
  },
  deleteMember(memberId){
    const db = loadDB();
    db.members = db.members.filter(m=>m.memberId!==memberId);
    saveDB(db);
  },
  refreshStatus(member){
    if(!member) return member;
    member.status = (member.expiryDate < todayISO()) ? 'Expired' : 'Active';
    return member;
  },

  // ---- checkins ----
  checkins(){ return loadDB().checkins; },
  checkinsForMember(memberId){ return loadDB().checkins.filter(c=>c.memberId===memberId).sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time)); },
  addCheckin(member){
    const db = loadDB();
    const now = new Date();
    const entry = {
      id: 'c' + Date.now(),
      memberId: member.memberId,
      name: member.name,
      package: member.membershipPackage,
      status: member.status,
      date: todayISO(),
      time: now.toTimeString().slice(0,5)
    };
    db.checkins.unshift(entry);
    saveDB(db);
    return entry;
  },
  todaysCheckins(){ return loadDB().checkins.filter(c=>c.date===todayISO()); },

  // ---- promos/events ----
  promos(){ return loadDB().promos.sort((a,b)=> b.createdAt.localeCompare(a.createdAt)); },
  addPromo({title, desc, img}){
    const db = loadDB();
    db.promos.unshift({ id:'p'+Date.now(), title, desc, img, createdAt: todayISO() });
    saveDB(db);
  },
  deletePromo(id){
    const db = loadDB();
    db.promos = db.promos.filter(p=>p.id!==id);
    saveDB(db);
  },

  // ---- packages / discounts ----
  packageGroups(){ return loadDB().packageGroups; },
  updatePackageGroups(groups){ const db = loadDB(); db.packageGroups = groups; saveDB(db); },
  // Flat list of every tier across every category, for pickers/selects.
  flatTiers(){
    const groups = loadDB().packageGroups;
    const out = [];
    groups.forEach(g=>{
      g.tiers.forEach(t=>{
        out.push({ groupId:g.id, groupName:g.category, tierId:t.id, name:t.name, price:t.price, label:`${g.category} — ${t.name}` });
      });
    });
    return out;
  },
  discountTiers(){ return loadDB().discountTiers; },
  updateDiscountTiers(tiers){ const db = loadDB(); db.discountTiers = tiers; saveDB(db); },
  applyDiscount(price, percent){ return Math.round(price * (1 - (Number(percent)||0)/100)); },

  // ---- admin ----
  adminCreds(){ return loadDB().admin; }
};

/* ---------------- Auth (mock — swap for Firebase Authentication) ---------------- */
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

  loginMember(memberId){
    const m = DB.getMember(memberId.trim().toUpperCase());
    if(!m) return null;
    DB.refreshStatus(m); saveDB(loadDB());
    sessionStorage.setItem(MEMBER_SESSION_KEY, memberId.trim().toUpperCase());
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
