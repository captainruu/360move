/* ==========================================================================
   360 MOVE — shared UI behaviors (navbar, mobile menu, toast)
   ========================================================================== */

function initNav(){
  const nav = document.querySelector('.nav');
  if(nav){
    const onScroll = ()=>{ nav.classList.toggle('is-scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });
  }
  const burger = document.querySelector('.nav-burger');
  const mobile = document.querySelector('.mobile-menu');
  if(burger && mobile){
    burger.addEventListener('click', ()=>{
      mobile.classList.toggle('is-open');
    });
    mobile.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click', ()=> mobile.classList.remove('is-open'));
    });
  }
}

function toast(msg){
  let el = document.querySelector('.toast');
  if(!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-shown');
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('is-shown'), 2600);
}

function initOrbitParallax(){
  const orbit = document.querySelector('.orbit');
  if(!orbit) return;
  const layers = orbit.querySelectorAll('[data-depth]');
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    window.addEventListener('mousemove', (e)=>{
      const r = orbit.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      layers.forEach(l=>{
        const depth = parseFloat(l.dataset.depth || 0);
        l.style.transform = `translate3d(${dx*depth}px, ${dy*depth}px, 0)`;
      });
    }, { passive:true });
  }
}

function initOrbitPhotoCycle(){
  const holder = document.getElementById('orbitPhoto');
  if(!holder) return;
  const imgs = Array.from(holder.querySelectorAll('img'));
  if(imgs.length < 2) return;
  let i = 0;
  setInterval(()=>{
    imgs[i].classList.remove('is-active');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('is-active');
  }, 3200);
}

document.addEventListener('DOMContentLoaded', ()=>{
  initNav();
  initOrbitParallax();
  initOrbitPhotoCycle();
});
