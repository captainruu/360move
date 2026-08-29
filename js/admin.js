/* ==========================================================================
   360 MOVE — Admin dashboard logic
   ========================================================================== */

// ---- Auth guard ----
if(!Auth.isAdminLoggedIn()){
  location.href = 'admin-login.html';
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // Wait for Firebase Auth's session to actually be restored on this fresh
  // page load before touching Firestore — see waitForReady() for why.
  await FirebaseAdminAuth.waitForReady();

  const creds = DB.adminCreds();
  document.getElementById('whoAmI').textContent = creds.email;

  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    await FirebaseAdminAuth.logout();
    location.href = 'admin-login.html';
  });

  // ---- Sidebar tab switching ----
  const navButtons = document.querySelectorAll('.admin-nav button');
  navButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      navButtons.forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('is-active'));
      document.getElementById('panel-' + btn.dataset.panel).classList.add('is-active');
    });
  });

  // ---- Shared month/year filter population ----
  function fillMonthYear(monthSel, yearSel){
    const months = ['All Months','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    months.forEach((m,i)=>{
      const opt = document.createElement('option');
      opt.value = i===0 ? 'all' : String(i-1);
      opt.textContent = m;
      monthSel.appendChild(opt);
    });
    const years = ['All Years', 2026, 2027, 2028, 2029];
    years.forEach(y=>{
      const opt = document.createElement('option');
      opt.value = y==='All Years' ? 'all' : String(y);
      opt.textContent = y;
      yearSel.appendChild(opt);
    });
  }
  fillMonthYear(document.getElementById('ovMonth'), document.getElementById('ovYear'));
  fillMonthYear(document.getElementById('memMonth'), document.getElementById('memYear'));

  function matchesFilter(dateStr, monthVal, yearVal){
    if(!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    if(monthVal !== 'all' && d.getMonth() !== Number(monthVal)) return false;
    if(yearVal !== 'all' && d.getFullYear() !== Number(yearVal)) return false;
    return true;
  }
  function periodLabel(monthVal, yearVal){
    let s = '';
    if(monthVal !== 'all') s += monthName(Number(monthVal)) + '_';
    if(yearVal !== 'all') s += yearVal;
    return s || 'All';
  }

  /* ==========================================================
     OVERVIEW
     ========================================================== */
  async function renderOverview(){
    const monthVal = document.getElementById('ovMonth').value;
    const yearVal = document.getElementById('ovYear').value;
    const members = (await DB.members()).map(DB.refreshStatus);
    const checkins = await DB.checkins();

    const inPeriodMembers = members.filter(m=>matchesFilter(m.createdAt, monthVal, yearVal));
    const inPeriodCheckins = checkins.filter(c=>matchesFilter(c.date, monthVal, yearVal));

    document.getElementById('statTotal').textContent = members.length;
    document.getElementById('statActive').textContent = members.filter(m=>m.status==='Active').length;
    document.getElementById('statExpired').textContent = members.filter(m=>m.status==='Expired').length;
    document.getElementById('statCheckins').textContent = inPeriodCheckins.length;

    const body = document.getElementById('ovMembersBody');
    body.innerHTML = '';
    if(inPeriodMembers.length===0){
      body.innerHTML = `<tr class="empty-row"><td colspan="4">No members joined in this period.</td></tr>`;
    }else{
      inPeriodMembers.forEach(m=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="idm">${m.memberId}</td><td>${m.name}</td><td>${m.membershipPackage}</td><td>${formatDate(m.createdAt)}</td>`;
        body.appendChild(tr);
      });
    }
  }
  document.getElementById('ovMonth').addEventListener('change', renderOverview);
  document.getElementById('ovYear').addEventListener('change', renderOverview);

  document.getElementById('ovDownload').addEventListener('click', ()=> exportMembersCsv('ov'));
  document.getElementById('ovExport').addEventListener('click', ()=> exportMembersCsv('ov'));

  async function exportMembersCsv(prefix){
    const monthVal = document.getElementById(prefix+'Month').value;
    const yearVal = document.getElementById(prefix+'Year').value;
    const members = (await DB.members()).map(DB.refreshStatus).filter(m=>matchesFilter(m.createdAt, monthVal, yearVal));
    const rows = [['Member ID','Name','Phone','Package','Status','Expiry Date','Joined']];
    members.forEach(m=> rows.push([m.memberId, m.name, m.phone, m.membershipPackage, m.status, m.expiryDate, m.createdAt]));
    csvDownload(`members_${periodLabel(monthVal, yearVal)}.csv`, rows);
    toast('CSV exported');
  }

  /* ==========================================================
     MEMBERS
     ========================================================== */
  async function renderMembers(){
    const monthVal = document.getElementById('memMonth').value;
    const yearVal = document.getElementById('memYear').value;
    const all = (await DB.members()).map(DB.refreshStatus);
    const list = (monthVal==='all' && yearVal==='all') ? all : all.filter(m=>matchesFilter(m.createdAt, monthVal, yearVal));

    const body = document.getElementById('membersBody');
    body.innerHTML = '';
    if(list.length===0){
      body.innerHTML = `<tr class="empty-row"><td colspan="8">No members match this filter.</td></tr>`;
      return;
    }
    list.forEach(m=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="idm">${m.memberId}</td>
        <td>${m.name}</td>
        <td>${m.membershipPackage}</td>
        <td><span class="tag ${m.status==='Active'?'tag-active':'tag-expired'}">${m.status.toUpperCase()}</span></td>
        <td>${formatDate(m.expiryDate)}</td>
        <td><button class="icon-btn" data-card="${m.memberId}">🪪 Card</button></td>
        <td><button class="icon-btn" data-details="${m.memberId}">Details</button></td>
        <td><button class="icon-btn danger" data-delete="${m.memberId}">Delete</button></td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll('[data-card]').forEach(b=> b.addEventListener('click', ()=> openCardModal(b.dataset.card)));
    body.querySelectorAll('[data-details]').forEach(b=> b.addEventListener('click', ()=> openDetailsModal(b.dataset.details)));
    body.querySelectorAll('[data-delete]').forEach(b=> b.addEventListener('click', ()=> deleteMember(b.dataset.delete)));
  }
  document.getElementById('memMonth').addEventListener('change', renderMembers);
  document.getElementById('memYear').addEventListener('change', renderMembers);
  document.getElementById('memDownload').addEventListener('click', ()=> exportMembersCsv('mem'));
  document.getElementById('memExport').addEventListener('click', ()=> exportMembersCsv('mem'));

  async function deleteMember(memberId){
    if(!confirm(`Delete member ${memberId}? This cannot be undone.`)) return;
    await DB.deleteMember(memberId);
    renderMembers();
    renderOverview();
    toast('Member deleted');
  }

  // ---- Add Member modal ----
  async function fillPackageSelect(){
    const packageSelect = document.getElementById('nmPackage');
    packageSelect.innerHTML = '';
    (await DB.flatTiers()).forEach(t=>{
      const opt = document.createElement('option');
      opt.value = t.label; opt.textContent = `${t.label} — ${formatIDR(t.price)}`;
      packageSelect.appendChild(opt);
    });
  }
  async function fillDiscountSelect(){
    const sel = document.getElementById('nmDiscount');
    sel.innerHTML = '<option value="0">No discount</option>';
    (await DB.discountTiers()).forEach(t=>{
      if(t.percent<=0) return;
      const opt = document.createElement('option');
      opt.value = t.tier; opt.textContent = `${t.label} — ${t.percent}% off`;
      sel.appendChild(opt);
    });
  }

  document.getElementById('addMemberBtn').addEventListener('click', ()=>{
    openModalEl(document.getElementById('modalAddMember'));
    fillPackageSelect();
    fillDiscountSelect();
  });

  document.getElementById('addMemberForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('nmName').value.trim();
    const phone = document.getElementById('nmPhone').value.trim();
    const membershipPackage = document.getElementById('nmPackage').value;
    const durationDays = document.getElementById('nmDuration').value;
    const discountTier = document.getElementById('nmDiscount').value;
    if(!name || !phone) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Registering…';

    const member = await DB.addMember({ name, phone, membershipPackage, durationDays, discountTier });

    submitBtn.disabled = false; submitBtn.textContent = 'Register & Generate Member ID';
    closeModal('modalAddMember');
    document.getElementById('addMemberForm').reset();
    document.getElementById('nmDuration').value = 30;

    document.getElementById('newMemberId').textContent = member.memberId;
    window._lastRegisteredId = member.memberId;
    openModalEl(document.getElementById('modalRegistered'));

    renderMembers();
    renderOverview();
  });

  document.getElementById('genCardBtn').addEventListener('click', ()=>{
    closeModal('modalRegistered');
    openCardModal(window._lastRegisteredId);
  });

  /* ==========================================================
     DIGITAL CARD
     ========================================================== */
  async function openCardModal(memberId){
    const m = DB.refreshStatus(await DB.getMember(memberId));
    if(!m) return;

    document.getElementById('dcardId').textContent = m.memberId;
    document.getElementById('dcardName').textContent = m.name;
    document.getElementById('dcardPkg').textContent = m.membershipPackage;
    document.getElementById('dcardExp').textContent = 'Expires ' + formatDate(m.expiryDate);
    const statusEl = document.getElementById('dcardStatus');
    statusEl.textContent = m.status.toUpperCase();
    statusEl.className = 'dcard-status ' + (m.status==='Active' ? 'active' : 'expired');

    const qrHolder = document.getElementById('dcardQr');
    qrHolder.innerHTML = '';
    new QRCode(qrHolder, { text: m.memberId, width: 300, height: 300, colorDark:'#0b0b0c', colorLight:'#ffffff', correctLevel: QRCode.CorrectLevel.M });

    window._currentCardMember = m;
    openModalEl(document.getElementById('modalCard'));
  }

  document.getElementById('downloadCardBtn').addEventListener('click', async ()=>{
    const el = document.getElementById('dcardEl');
    const btn = document.getElementById('downloadCardBtn');
    btn.disabled = true; btn.textContent = 'Generating…';
    try{
      const canvas = await html2canvas(el, { backgroundColor:'#ffffff', scale: 1080 / el.offsetWidth });
      const out = document.createElement('canvas');
      out.width = 1080; out.height = 1350;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,1080,1350);
      const scale = Math.min(1080/canvas.width, 1350/canvas.height);
      const w = canvas.width*scale, h = canvas.height*scale;
      ctx.drawImage(canvas, (1080-w)/2, (1350-h)/2, w, h);
      const link = document.createElement('a');
      link.download = `360move-card-${window._currentCardMember.memberId}.png`;
      link.href = out.toDataURL('image/png');
      link.click();
      toast('Card downloaded (1080×1350)');
    }catch(err){
      toast('Could not generate PNG — try again');
    }
    btn.disabled = false; btn.textContent = '⬇ Download PNG';
  });

  document.getElementById('waCardBtn').addEventListener('click', ()=>{
    const m = window._currentCardMember;
    if(!m) return;
    const msg = `360 MOVE Uluwatu Digital Card%0AName: ${encodeURIComponent(m.name)}%0AMember ID: ${encodeURIComponent(m.memberId)}%0APackage: ${encodeURIComponent(m.membershipPackage)}%0AStatus: ${encodeURIComponent(m.status)}%0AExpiry: ${encodeURIComponent(formatDate(m.expiryDate))}`;
    const phoneDigits = (m.phone||'').replace(/\D/g,'');
    const target = phoneDigits ? phoneDigits.replace(/^0/,'62') : '';
    window.open(`https://wa.me/${target}?text=${msg}`, '_blank');
    toast('Attach the downloaded PNG manually in WhatsApp');
  });

  /* ==========================================================
     MEMBER DETAILS & HISTORY
     ========================================================== */
  async function openDetailsModal(memberId){
    const m = DB.refreshStatus(await DB.getMember(memberId));
    if(!m) return;
    const grid = document.getElementById('detailGrid');
    grid.innerHTML = `
      <div class="d"><label>Member ID</label><div style="font-family:var(--font-mono);color:var(--gold);">${m.memberId}</div></div>
      <div class="d"><label>Name</label><div>${m.name}</div></div>
      <div class="d"><label>Phone</label><div>${m.phone}</div></div>
      <div class="d"><label>Package</label><div>${m.membershipPackage}</div></div>
      <div class="d"><label>Status</label><div>${m.status}</div></div>
      <div class="d"><label>Expiry</label><div>${formatDate(m.expiryDate)}</div></div>
    `;
    const history = await DB.checkinsForMember(memberId);
    const body = document.getElementById('historyBody');
    body.innerHTML = '';
    if(history.length===0){
      body.innerHTML = `<tr class="empty-row"><td colspan="4">No check-ins recorded yet.</td></tr>`;
    }else{
      history.forEach(h=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatDate(h.date)}</td><td>${h.time}</td><td>${h.package}</td><td><span class="tag ${h.status==='Active'?'tag-active':'tag-expired'}">${h.status.toUpperCase()}</span></td>`;
        body.appendChild(tr);
      });
    }
    openModalEl(document.getElementById('modalDetails'));
  }

  /* ==========================================================
     CHECK-IN
     ========================================================== */
  async function showVerification(memberId){
    const card = document.getElementById('verifyCard');
    card.innerHTML = `<div class="verify-placeholder">Looking up "${memberId}"…</div>`;
    const m = DB.refreshStatus(await DB.getMember(memberId));
    if(!m){
      card.innerHTML = `<div class="verify-placeholder">No member found for ID "${memberId}". Double-check the code and try again.</div>`;
      return;
    }
    card.innerHTML = `
      <div class="verify-head"><img src="assets/logo.png" alt="logo"></div>
      <div class="verify-body">
        <div class="verify-status"><span class="tag ${m.status==='Active'?'tag-active':'tag-expired'}">${m.status.toUpperCase()}</span></div>
        <div class="verify-row"><label>Member ID</label><div style="font-family:var(--font-mono);">${m.memberId}</div></div>
        <div class="verify-row name"><label>Name</label><div>${m.name}</div></div>
        <div class="verify-row"><label>Phone</label><div>${m.phone}</div></div>
        <div class="verify-row exp"><label>Expiry Date</label><div>${formatDate(m.expiryDate)}</div></div>
        <button class="btn btn-gold btn-block" id="doCheckinBtn" style="margin-top:24px;">CHECK IN</button>
      </div>
    `;
    document.getElementById('doCheckinBtn').addEventListener('click', async ()=>{
      await DB.addCheckin(m);
      toast(`${m.name} checked in`);
      renderDailyLog();
      renderOverview();
      card.innerHTML = `<div class="verify-placeholder">✅ Check-in saved for <strong style="color:var(--gold);">${m.name}</strong>.<br>Scan the next member or enter another ID.</div>`;
      document.getElementById('manualId').value = '';
    });
  }

  document.getElementById('manualForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('manualId').value.trim().toUpperCase();
    if(!id) return;
    showVerification(id);
  });

  async function renderDailyLog(){
    const body = document.getElementById('dailyLogBody');
    const rows = await DB.todaysCheckins();
    body.innerHTML = '';
    if(rows.length===0){
      body.innerHTML = `<tr class="empty-row"><td colspan="4">No check-ins yet today.</td></tr>`;
      return;
    }
    rows.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${c.time}</td><td>${c.name} <span style="color:var(--grey-400);font-family:var(--font-mono);font-size:11.5px;">(${c.memberId})</span></td><td>${c.package}</td><td><span class="tag ${c.status==='Active'?'tag-active':'tag-expired'}">${c.status.toUpperCase()}</span></td>`;
      body.appendChild(tr);
    });
  }

  // ---- Camera QR scan (jsQR) ----
  let scanning = false, scanStream = null;
  const scanToggle = document.getElementById('scanToggle');
  const video = document.getElementById('scanVideo');
  const scanHint = document.getElementById('scanHint');

  scanToggle.addEventListener('click', async ()=>{
    if(scanning){ stopScan(); return; }
    if(typeof jsQR !== 'function'){
      toast('QR scanner library failed to load — check your connection and reload the page');
      return;
    }
    try{
      // Ask for the camera's higher resolution — since we now only analyze
      // the small cropped region inside the reticle (see scanLoop below)
      // rather than a downscaled full frame, more native detail here
      // directly means more pixels-per-QR-module where it actually
      // matters, without the processing cost of scanning the whole frame.
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      video.srcObject = scanStream;
      video.style.display = 'block';
      scanHint.style.display = 'none';
      document.getElementById('scanReticle').style.display = 'block';
      await video.play();

      // Best-effort: ask for continuous autofocus. Browsers focus far less
      // aggressively than native camera apps by default, which was the
      // main reason scans looked blurry compared to the phone's own
      // camera app. Silently ignored on devices/browsers that don't
      // support it (no downside to trying).
      try{
        const track = scanStream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if(caps.focusMode && caps.focusMode.includes('continuous')){
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      }catch(focusErr){ /* not supported — no-op */ }

      scanning = true;
      scanToggle.textContent = '⏹ Stop Camera Scan';
      requestAnimationFrame(scanLoop);
    }catch(err){
      toast('Camera unavailable — use manual entry instead');
    }
  });

  function stopScan(){
    scanning = false;
    if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream = null; }
    video.style.display = 'none';
    document.getElementById('scanReticle').style.display = 'none';
    scanHint.style.display = 'block';
    scanToggle.textContent = '📷 Start Camera Scan';
  }

  // Tap the video to nudge the camera into refocusing — helpful on phones
  // where autofocus doesn't kick in fast enough after the stream starts.
  video.addEventListener('click', async ()=>{
    if(!scanStream) return;
    try{
      const track = scanStream.getVideoTracks()[0];
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if(caps.focusMode && caps.focusMode.includes('single-shot')){
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
      }else if(caps.focusMode && caps.focusMode.includes('continuous')){
        await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] });
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      }
    }catch(err){ /* not supported — no-op */ }
  });

  // willReadFrequently hints the browser to optimize this canvas for
  // repeated getImageData() calls, which noticeably helps scan speed on
  // mobile Chrome/Safari.
  const canvasEl = document.createElement('canvas');
  const canvasCtx = canvasEl.getContext('2d', { willReadFrequently: true });
  // Only analyze the region inside the yellow reticle guide (see
  // .scan-reticle inset:14% in css/style.css) instead of the whole,
  // downscaled frame. Cropping to where the user is actually holding the
  // code gives jsQR far more effective pixels-per-module to work with,
  // which matters more for detection than raw frame resolution — this
  // fixed scans that stayed undetected even once the camera was in focus.
  const RETICLE_INSET = 0.14;
  const SCAN_MAX_DIM = 900; // cap on the cropped region, not the full frame

  function scanLoop(){
    if(!scanning) return;
    if(video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth){
      const vw = video.videoWidth, vh = video.videoHeight;
      // scan-box is a square (aspect-ratio:1/1), so map the reticle's
      // percentage inset onto the shorter video dimension, centered.
      const shortSide = Math.min(vw, vh);
      const cropSize = Math.round(shortSide * (1 - RETICLE_INSET * 2));
      const sx = Math.round((vw - cropSize) / 2);
      const sy = Math.round((vh - cropSize) / 2);

      const scale = Math.min(1, SCAN_MAX_DIM / cropSize);
      const outSize = Math.round(cropSize * scale);
      canvasEl.width = outSize; canvasEl.height = outSize;
      canvasCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
      const imgData = canvasCtx.getImageData(0, 0, outSize, outSize);
      const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
      if(code && code.data){
        const id = code.data.trim().toUpperCase();
        stopScan();
        document.getElementById('manualId').value = id;
        showVerification(id);
        return;
      }
    }
    requestAnimationFrame(scanLoop);
  }

  /* ==========================================================
     PROMO / EVENT
     ========================================================== */
  let selectedPromoFile = null;
  document.getElementById('promoImg').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    selectedPromoFile = file;
    const reader = new FileReader();
    reader.onload = (ev)=>{
      document.getElementById('uploadPreviewImg').src = ev.target.result;
      document.getElementById('uploadPreviewImg').style.display = 'block';
      document.getElementById('uploadPreviewText').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  const promoStorageNote = document.createElement('p');
  promoStorageNote.style.cssText = 'font-size:11.5px;color:var(--grey-400);margin-top:10px;';
  promoStorageNote.textContent = PromoStorage.isLive()
    ? 'Artwork uploads to Supabase Storage.'
    : 'Supabase not configured yet — artwork is stored locally for this demo (see js/supabase-config.js).';
  document.getElementById('promoForm').appendChild(promoStorageNote);

  document.getElementById('promoForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const title = document.getElementById('promoTitle').value.trim();
    const desc = document.getElementById('promoDesc').value.trim();
    if(!title || !selectedPromoFile){ toast('Add a title and artwork first'); return; }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Uploading…';

    try{
      const imgUrl = await PromoStorage.upload(selectedPromoFile);
      await DB.addPromo({ title, desc, img: imgUrl });
      e.target.reset();
      selectedPromoFile = null;
      document.getElementById('uploadPreviewImg').style.display = 'none';
      document.getElementById('uploadPreviewText').textContent = 'Click to upload artwork (JPG/PNG)';
      renderPromoAdmin();
      toast('Promo published to website');
    }catch(err){
      toast('Upload failed — try again');
    }
    submitBtn.disabled = false; submitBtn.textContent = 'Publish to Website';
  });

  async function renderPromoAdmin(){
    const grid = document.getElementById('promoAdminGrid');
    const promos = await DB.promos();
    grid.innerHTML = '';
    if(promos.length===0){
      grid.innerHTML = `<div class="promo-empty" style="grid-column:1/-1;">Nothing published yet.</div>`;
      return;
    }
    promos.forEach(p=>{
      const div = document.createElement('div');
      div.className = 'promo-admin-card';
      div.innerHTML = `<img src="${p.img}" alt="${p.title}"><div class="pa-body"><h5>${p.title}</h5><button class="icon-btn danger" data-del="${p.id}">Remove</button></div>`;
      grid.appendChild(div);
    });
    grid.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        await DB.deletePromo(b.dataset.del);
        renderPromoAdmin();
        toast('Promo removed');
      });
    });
  }

  /* ==========================================================
     PRICING & DISCOUNTS
     ========================================================== */
  async function renderPricing(){
    const wrap = document.getElementById('pricingGroups');
    wrap.innerHTML = '';
    const groups = await DB.packageGroups();

    groups.forEach((g, gi)=>{
      const box = document.createElement('div');
      box.className = 'card-box';
      box.innerHTML = `
        <div class="pricing-group-head">
          <div class="titles">
            <input class="g-title" data-g="${gi}" data-field="category" value="${g.category}">
            <input data-g="${gi}" data-field="subtitle" value="${g.subtitle}" placeholder="Subtitle shown under the category">
            <input data-g="${gi}" data-field="note" value="${g.note||''}" placeholder="Optional note (e.g. class schedule)">
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Tier name</th><th>Price (IDR)</th><th></th></tr></thead>
            <tbody data-tiers-for="${gi}"></tbody>
          </table>
        </div>
        <div class="pricing-actions">
          <button class="icon-btn" data-add-tier="${gi}">+ Add Tier</button>
          <button class="btn btn-gold btn-sm" data-save-group="${gi}">Save Changes</button>
        </div>
      `;
      wrap.appendChild(box);
      renderTierRows(gi, groups);
    });

    wrap.querySelectorAll('[data-add-tier]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const gi = Number(b.dataset.addTier);
        groups[gi].tiers.push({ id: 'tier-' + Date.now(), name:'New Tier', price:0 });
        renderTierRows(gi, groups);
      });
    });
    wrap.querySelectorAll('[data-save-group]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const gi = Number(b.dataset.saveGroup);
        const box = b.closest('.card-box');
        box.querySelectorAll('[data-field]').forEach(inp=>{
          groups[gi][inp.dataset.field] = inp.value.trim();
        });
        box.querySelectorAll('[data-tier-name]').forEach(inp=>{
          const ti = Number(inp.dataset.tierName);
          groups[gi].tiers[ti].name = inp.value.trim();
        });
        box.querySelectorAll('[data-tier-price]').forEach(inp=>{
          const ti = Number(inp.dataset.tierPrice);
          groups[gi].tiers[ti].price = Number(inp.value) || 0;
        });
        b.disabled = true; const oldText = b.textContent; b.textContent = 'Saving…';
        await DB.updatePackageGroups(groups);
        b.disabled = false; b.textContent = oldText;
        fillPackageSelect();
        toast(`${groups[gi].category} pricing saved`);
      });
    });
  }

  function renderTierRows(gi, groups){
    const body = document.querySelector(`[data-tiers-for="${gi}"]`);
    body.innerHTML = '';
    groups[gi].tiers.forEach((t, ti)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input class="table-input" data-tier-name="${ti}" value="${t.name}"></td>
        <td><input class="table-input" type="number" data-tier-price="${ti}" value="${t.price}"></td>
        <td><button class="icon-btn danger" data-remove-tier="${gi}:${ti}">Remove</button></td>
      `;
      body.appendChild(tr);
    });
    body.querySelectorAll('[data-remove-tier]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const [gIdx, tIdx] = b.dataset.removeTier.split(':').map(Number);
        groups[gIdx].tiers.splice(tIdx, 1);
        renderTierRows(gIdx, groups);
      });
    });
  }

  async function renderDiscountTiers(){
    const body = document.getElementById('discountBody');
    const tiers = await DB.discountTiers();
    body.innerHTML = '';
    tiers.forEach((t, i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:var(--font-mono);color:var(--gold);">Tier ${t.tier}</td>
        <td><input class="table-input" data-dt-label="${i}" value="${t.label}"></td>
        <td><input class="table-input" type="number" min="0" max="100" data-dt-percent="${i}" value="${t.percent}"></td>
      `;
      body.appendChild(tr);
    });

    document.getElementById('saveDiscountsBtn').onclick = async ()=>{
      document.querySelectorAll('[data-dt-label]').forEach(inp=>{
        tiers[Number(inp.dataset.dtLabel)].label = inp.value.trim();
      });
      document.querySelectorAll('[data-dt-percent]').forEach(inp=>{
        tiers[Number(inp.dataset.dtPercent)].percent = Math.max(0, Math.min(100, Number(inp.value)||0));
      });
      const btn = document.getElementById('saveDiscountsBtn');
      btn.disabled = true; const oldText = btn.textContent; btn.textContent = 'Saving…';
      await DB.updateDiscountTiers(tiers);
      btn.disabled = false; btn.textContent = oldText;
      fillDiscountSelect();
      toast('Discount tiers saved');
    };
  }

  /* ==========================================================
     MODAL helpers
     ========================================================== */
  function openModalEl(el){ el.classList.add('is-open'); }
  function closeModal(id){ document.getElementById(id).classList.remove('is-open'); }
  document.querySelectorAll('.modal-veil').forEach(veil=>{
    veil.addEventListener('click', (e)=>{ if(e.target===veil) veil.classList.remove('is-open'); });
    veil.querySelectorAll('[data-close]').forEach(b=> b.addEventListener('click', ()=> veil.classList.remove('is-open')));
  });

  // ---- initial render ----
  try{
    await Promise.all([
      renderOverview(),
      renderMembers(),
      renderDailyLog(),
      renderPromoAdmin(),
      renderPricing(),
      renderDiscountTiers(),
      fillPackageSelect(),
      fillDiscountSelect()
    ]);
  }catch(err){
    console.error('Dashboard failed to load data:', err);
    toast('Could not load data — check Firestore rules & console (F12)');
  }
});
