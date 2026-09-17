(()=>{
  'use strict';

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;


  function hydrateSocialEmbed(slide){
    const stage=slide?.querySelector('[data-embed-type]');
    if(!stage||stage.dataset.loaded==='true') return;

    const type=stage.dataset.embedType;
    const title=stage.dataset.embedTitle||`${type||'Social'} project post`;
    const iframe=document.createElement('iframe');
    iframe.title=title;
    iframe.loading='lazy';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    iframe.setAttribute('allowtransparency','true');
    iframe.setAttribute('scrolling','no');

    if(type==='instagram'){
      iframe.src=stage.dataset.embedSrc;
      iframe.allow='encrypted-media; picture-in-picture; autoplay';
    }else if(type==='facebook'){
      const postUrl=stage.dataset.facebookUrl;
      const width=Math.max(280,Math.min(500,Math.floor(stage.clientWidth-28)));
      iframe.src=`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(postUrl)}&show_text=true&width=${width}`;
      iframe.width=String(width);
      iframe.allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
    }else{return}

    iframe.addEventListener('load',()=>stage.classList.add('is-loaded'),{once:true});
    stage.appendChild(iframe);
    stage.dataset.loaded='true';
  }

  function initCarousel(root){
    if(!root) return;
    root._carouselCleanup?.();

    const track=root.querySelector('[data-carousel-track]');
    const slides=[...root.querySelectorAll('[data-carousel-slide]')];
    const dotsWrap=root.querySelector('[data-carousel-dots]');
    const prev=root.querySelector('[data-carousel-prev]');
    const next=root.querySelector('[data-carousel-next]');
    const toggle=root.querySelector('[data-carousel-toggle]');
    if(!track||slides.length===0) return;

    const interval=Math.max(4000,Number(root.dataset.interval)||8000);
    let index=root.dataset.randomStart==='true' ? Math.floor(Math.random()*slides.length) : 0;
    let timer=null;
    let manuallyPaused=false;
    let interactionPaused=false;
    const listeners=[];

    if(dotsWrap){
      dotsWrap.replaceChildren();
      slides.forEach((_,i)=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='carousel-dot';
        b.setAttribute('aria-label',`Show item ${i+1} of ${slides.length}`);
        b.addEventListener('click',()=>{show(i);restart()});
        dotsWrap.appendChild(b);
      });
    }
    const dots=[...(dotsWrap?.querySelectorAll('.carousel-dot')||[])];

    function show(newIndex){
      index=(newIndex+slides.length)%slides.length;
      track.style.transform=`translate3d(-${index*100}%,0,0)`;
      slides.forEach((slide,i)=>{
        const active=i===index;
        slide.classList.toggle('is-active',active);
        slide.setAttribute('aria-hidden',String(!active));
        if('inert' in slide) slide.inert=!active;
        slide.querySelectorAll('a,button,input,iframe').forEach(el=>{
          if(active) el.removeAttribute('tabindex'); else el.setAttribute('tabindex','-1');
        });
      });
      dots.forEach((dot,i)=>{
        dot.classList.toggle('is-active',i===index);
        dot.setAttribute('aria-current',i===index?'true':'false');
      });
      hydrateSocialEmbed(slides[index]);
      hydrateSocialEmbed(slides[(index+1)%slides.length]);
      root.style.setProperty('--carousel-index',index);
    }

    function stop(){if(timer){clearInterval(timer);timer=null;}}
    function start(){
      stop();
      if(reducedMotion||manuallyPaused||interactionPaused||slides.length<2||document.hidden) return;
      timer=setInterval(()=>show(index+1),interval);
    }
    function restart(){stop();start()}
    function setInteractionPause(value){interactionPaused=value; value?stop():start()}
    function add(el,event,fn,opts){el?.addEventListener(event,fn,opts);listeners.push(()=>el?.removeEventListener(event,fn,opts))}

    add(prev,'click',()=>{show(index-1);restart()});
    add(next,'click',()=>{show(index+1);restart()});
    add(toggle,'click',()=>{
      manuallyPaused=!manuallyPaused;
      toggle.textContent=manuallyPaused?'Play':'Pause';
      toggle.setAttribute('aria-label',manuallyPaused?'Resume automatic rotation':'Pause automatic rotation');
      manuallyPaused?stop():start();
    });
    add(root,'mouseenter',()=>setInteractionPause(true));
    add(root,'mouseleave',()=>setInteractionPause(false));
    add(root,'focusin',()=>setInteractionPause(true));
    add(root,'focusout',e=>{if(!root.contains(e.relatedTarget))setInteractionPause(false)});
    const visibility=()=>document.hidden?stop():start();
    add(document,'visibilitychange',visibility);

    show(index);
    start();
    root._carouselCleanup=()=>{stop();listeners.forEach(fn=>fn())};
  }

  const reviewDataNode=document.getElementById('review-data');
  let fallbackData=null;
  try{fallbackData=reviewDataNode?JSON.parse(reviewDataNode.textContent):null}catch(error){console.warn('Review data could not be read.',error)}

  function initials(name='Client'){
    return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  }

  function stars(rating=5){
    const whole=Math.max(1,Math.min(5,Math.round(Number(rating)||5)));
    return '★'.repeat(whole)+'☆'.repeat(5-whole);
  }

  function renderReviews(data){
    const root=document.querySelector('[data-review-carousel]');
    const track=document.querySelector('[data-review-track]');
    if(!root||!track||!data?.reviews?.length) return;
    track.replaceChildren();

    data.reviews.forEach(review=>{
      const slide=document.createElement('article');
      slide.className='carousel-slide review-slide';
      slide.dataset.carouselSlide='';

      const card=document.createElement('div');
      card.className='review-card';

      const top=document.createElement('div');
      top.className='review-card-top';
      const starEl=document.createElement('div');
      starEl.className='review-stars';
      starEl.setAttribute('aria-label',`${review.rating||5} out of 5 stars`);
      starEl.textContent=stars(review.rating);
      const source=document.createElement('span');
      source.className=`review-source-pill review-source-pill--${String(review.source||'review').toLowerCase()}`;
      source.textContent=review.source||'Review';
      top.append(starEl,source);

      const quote=document.createElement('blockquote');
      quote.textContent=`“${String(review.text||'').replace(/^[“"]|[”"]$/g,'')}”`;

      const person=document.createElement('div');
      person.className='review-person';
      const avatar=document.createElement('span');
      avatar.className='review-avatar';
      avatar.textContent=initials(review.name);
      const details=document.createElement('div');
      const strong=document.createElement('strong');
      strong.textContent=review.name||'Verified client';
      const context=document.createElement('span');
      context.textContent=[review.project,review.relativeTime].filter(Boolean).join(' · ')||`${review.source||'Verified'} review`;
      details.append(strong,context);
      person.append(avatar,details);

      const bottom=document.createElement('div');
      bottom.className='review-card-bottom';
      bottom.append(person);
      if(review.url){
        const link=document.createElement('a');
        link.href=review.url;
        link.target='_blank';
        link.rel='noopener';
        link.textContent=`Read on ${review.source||'source'} ↗`;
        bottom.append(link);
      }

      card.append(top,quote,bottom);
      slide.append(card);
      track.append(slide);
    });
    initCarousel(root);
  }


  async function fetchJSON(url,timeout=4500){
    const controller=new AbortController();
    const id=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok) throw new Error(`${response.status}`);
      return await response.json();
    }finally{clearTimeout(id)}
  }

  async function tryLiveGoogle(base){
    if(location.protocol==='file:') return;
    const endpoints=['/.netlify/functions/google-reviews'];
    for(const endpoint of endpoints){
      try{
        const live=await fetchJSON(endpoint);
        if(!live?.reviews?.length) continue;
        const googleReviews=live.reviews.slice(0,4).map(review=>({
          name:review.name||'Google reviewer',
          source:'Google',
          rating:review.rating||5,
          project:'Google review',
          relativeTime:review.relativeTime||'',
          text:review.text||'',
          url:review.url||base.google.url
        }));
        const thumbReviews=base.reviews.filter(review=>review.source==='Thumbtack').slice(0,2);
        const merged={
          ...base,
          google:{...base.google,rating:live.rating||base.google.rating,count:live.count||base.google.count},
          reviews:[...googleReviews,...thumbReviews]
        };
        renderReviews(merged);
        return;
      }catch(error){/* fallback is already visible */}
    }
  }

  document.querySelectorAll('[data-carousel]:not([data-review-carousel])').forEach(initCarousel);
  if(fallbackData){renderReviews(fallbackData);tryLiveGoogle(fallbackData)}
})();
