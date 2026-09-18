(()=>{'use strict';
const body=document.body,nav=document.querySelector('.site-nav'),toggle=document.querySelector('.nav-toggle');
const closeNav=()=>{if(!nav||!toggle)return;nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');body.classList.remove('nav-open')};
if(nav&&toggle){
  toggle.addEventListener('click',()=>{const open=!nav.classList.contains('is-open');nav.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));body.classList.toggle('nav-open',open)});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
}
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const reveals=[...document.querySelectorAll('.reveal:not(.is-visible)')];
if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -25px'});reveals.forEach(el=>io.observe(el))}else reveals.forEach(el=>el.classList.add('is-visible'));
const modal=document.querySelector('[data-lightbox-modal]');
if(modal){
  const img=modal.querySelector('img'),cap=modal.querySelector('figcaption'),closeBtn=modal.querySelector('[data-lightbox-close]');
  let returnFocus=null;
  const close=()=>{if(!modal.classList.contains('is-open'))return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');body.classList.remove('lightbox-open');img.src='';returnFocus?.focus?.();returnFocus=null};
  document.querySelectorAll('[data-lightbox]').forEach(btn=>btn.addEventListener('click',()=>{returnFocus=document.activeElement;img.src=btn.dataset.lightbox||'';img.alt=btn.querySelector('img')?.alt||btn.dataset.caption||'Project image';cap.textContent=btn.dataset.caption||'';modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');body.classList.add('lightbox-open');closeBtn?.focus()}));
  closeBtn?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal.classList.contains('is-open'))close();else closeNav()}});
}else document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav()});
const filters=[...document.querySelectorAll('[data-gallery-filter]')],items=[...document.querySelectorAll('[data-category]')];
filters.forEach(btn=>btn.addEventListener('click',()=>{const filter=btn.dataset.galleryFilter||'all';filters.forEach(b=>{const active=b===btn;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});items.forEach(item=>item.classList.toggle('is-hidden',filter!=='all'&&!(item.dataset.category||'').split(' ').includes(filter)))}));
})();