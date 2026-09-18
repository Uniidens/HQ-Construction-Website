import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const PROJECT_DIR = path.join(ROOT, 'content', 'projects');
const BASE_URL = 'https://hqconstructionllc.com';

const labels = {
  kitchen: 'Kitchen', bathroom: 'Bathroom', interior: 'Interior Remodel', addition: 'Home Addition',
  outdoor: 'Decks & Outdoor Living', commercial: 'Commercial / Retail', flooring: 'Flooring',
  cabinetry: 'Cabinetry & Built-ins', exterior: 'Exterior', other: 'Other'
};
const serviceMap = {
  kitchen: 'kitchen-remodeling.html', bathroom: 'bathroom-remodeling.html', interior: 'basement-remodeling.html',
  addition: 'home-additions.html', outdoor: 'decks-outdoor-living.html', commercial: 'commercial-remodeling.html',
  flooring: 'basement-remodeling.html', cabinetry: 'services.html', exterior: 'services.html', other: 'services.html'
};
const serviceCategories = {
  'kitchen-remodeling.html': ['kitchen'], 'bathroom-remodeling.html': ['bathroom'],
  'basement-remodeling.html': ['interior','flooring'], 'home-additions.html': ['addition'],
  'decks-outdoor-living.html': ['outdoor'], 'commercial-remodeling.html': ['commercial']
};
const locationPages = {
  'johns-creek-remodeling.html': 'johns creek',
  'alpharetta-remodeling.html': 'alpharetta',
  'roswell-remodeling.html': 'roswell',
  'cumming-remodeling.html': 'cumming',
  'canton-remodeling.html': 'canton'
};

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const publicPath = p => p?.startsWith('/') ? p : `/${p || ''}`;
const rel = p => publicPath(p).replace(/^\//,'');
const projectSlug = p => p._slug || slugify(p.title);
const metaDescription = (s='') => {
  const clean=String(s).replace(/\s+/g,' ').trim();
  if(clean.length>=70 && clean.length<=165) return clean;
  if(clean.length>165) return clean.slice(0,162).replace(/\s+\S*$/,'')+'...';
  const suffix=' Learn more about this HQ Construction & Remodeling project in North Atlanta.';
  const combined=(clean+suffix).trim();
  return combined.length>165 ? combined.slice(0,162).replace(/\s+\S*$/,'')+'...' : combined;
};
const markerReplace = (html, name, content) => {
  const start = `<!-- CMS:${name}:START -->`, end = `<!-- CMS:${name}:END -->`;
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`Missing CMS markers ${name}`);
  return html.slice(0,a+start.length) + '\n' + content + '\n' + html.slice(b);
};
async function exists(p){ try { await fs.access(p); return true; } catch { return false; } }
async function copyDir(src,dst){ await fs.mkdir(dst,{recursive:true}); for(const e of await fs.readdir(src,{withFileTypes:true})){ if(['dist','.git','node_modules','content','scripts','templates','netlify','api','qa'].includes(e.name)) continue; if(['package.json','package-lock.json','pnpm-lock.yaml','netlify.toml','ADMIN_SETUP.md','README.md','HQ-Construction-Website.code-workspace','START-HERE.md'].includes(e.name)) continue; const s=path.join(src,e.name), d=path.join(dst,e.name); if(e.isDirectory()) await copyDir(s,d); else await fs.copyFile(s,d); } }

async function loadProjects(){
  const files=(await fs.readdir(PROJECT_DIR)).filter(f=>f.endsWith('.json')).sort();
  const out=[];
  for(const file of files){
    const p=JSON.parse(await fs.readFile(path.join(PROJECT_DIR,file),'utf8'));
    p._slug=file.replace(/\.json$/,'');
    if(p.published === false) continue;
    for(const key of ['title','category','summary','cover_image']) if(!p[key]) throw new Error(`${file}: missing required field ${key}`);
    if(!labels[p.category]) throw new Error(`${file}: invalid category ${p.category}`);
    p.cover_alt=String(p.cover_alt || `${p.title} project by HQ Construction & Remodeling`).trim();
    p.images=(Array.isArray(p.images)?p.images:[]).map((img,i)=>({
      ...img,
      alt:String(img.alt || img.caption || `${p.title} project photo ${i+2}`).trim()
    }));
    const images=[{image:p.cover_image,alt:p.cover_alt,caption:p.project_type || p.title},...p.images];
    for(const [i,img] of images.entries()){
      if(!img.image) throw new Error(`${file}: image ${i+1} is missing its file`);
      const disk=path.join(ROOT,rel(img.image));
      if(!(await exists(disk))) throw new Error(`${file}: image not found ${img.image}`);
    }
    p.services=Array.isArray(p.services)?p.services:[];
    p.display_order=Number.isFinite(Number(p.display_order))?Number(p.display_order):100;
    out.push(p);
  }
  return out.sort((a,b)=>a.display_order-b.display_order || a.title.localeCompare(b.title));
}

function imageItems(project){ return [{image:project.cover_image,alt:project.cover_alt,caption:project.project_type || project.title},...project.images]; }
function galleryControls(projects){
  const present=new Set(projects.map(p=>p.category));
  const order=['kitchen','bathroom','interior','addition','outdoor','commercial','flooring','cabinetry','exterior','other'];
  return `<div class="gallery-controls"><button class="is-active" data-gallery-filter="all">All</button>${order.filter(c=>present.has(c)).map(c=>`<button data-gallery-filter="${c}">${esc(labels[c])}</button>`).join('')}</div>`;
}
function galleryGrid(projects, prefix=''){
  return `<div class="gallery-page-grid">${projects.flatMap(p=>imageItems(p).map((img,i)=>{
    const caption=img.caption || p.title;
    const projectNote=p.detail_page ? ` · ${p.title}` : '';
    return `<button class="gallery-item" data-category="${esc(p.category)}" data-caption="${esc(caption+projectNote)}" data-lightbox="${esc(prefix+rel(img.image))}"><img src="${esc(prefix+rel(img.image))}" alt="${esc(img.alt)}" loading="lazy" decoding="async"><span><b>${esc(labels[p.category])}</b>${esc(caption)}</span></button>`;
  })).join('')}</div>`;
}
function featuredWork(projects){
  let picks=projects.filter(p=>p.featured).slice(0,3); if(picks.length<3) picks=[...picks,...projects.filter(p=>!picks.includes(p)).slice(0,3-picks.length)];
  const card=(p,hero=false)=>{
    const inner=`<img alt="${esc(p.cover_alt)}" src="${esc(rel(p.cover_image))}"><span class="project-panel__shade"></span><span class="project-panel__content"><small>${esc(labels[p.category])}${p.location?` · ${esc(p.location)}`:''}</small><strong>${esc(p.title)}</strong><b>${p.detail_page?'View project ↗':'Open image ↗'}</b></span>`;
    return p.detail_page
      ? `<a class="project-panel${hero?' project-panel--hero':''} reveal" href="projects/${projectSlug(p)}.html">${inner}</a>`
      : `<button class="project-panel${hero?' project-panel--hero':''} reveal" data-caption="${esc(p.title)}" data-lightbox="${esc(rel(p.cover_image))}">${inner}</button>`;
  };
  if(!picks.length) return '';
  return `<div class="feature-grid">${card(picks[0],true)}<div class="feature-stack">${picks.slice(1,3).map(p=>card(p)).join('')}</div></div>`;
}
function recentWork(projects,cats){
  const picks=projects.filter(p=>cats.includes(p.category)).slice(0,3); if(!picks.length) return '';
  return `<section class="section section--cream cms-recent-work"><div class="shell"><div class="section-intro"><div><p class="kicker">Recent work</p><h2>Recent projects.</h2></div><p>A look at completed HQ Construction &amp; Remodeling work related to this service.</p></div><div class="cms-project-cards">${picks.map(p=>`<article class="cms-project-card"><button data-caption="${esc(p.title)}" data-lightbox="${esc(rel(p.cover_image))}"><img src="${esc(rel(p.cover_image))}" alt="${esc(p.cover_alt)}" loading="lazy"></button><div><small>${esc(labels[p.category])}${p.location?` · ${esc(p.location)}`:''}</small><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${p.detail_page?`<a class="text-link" href="projects/${projectSlug(p)}.html">View project <span>↗</span></a>`:`<a class="text-link" href="gallery.html">View gallery <span>↗</span></a>`}</div></article>`).join('')}</div></div></section>`;
}
function normalizeLocation(s=''){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function localWork(projects, city){
  const picks=projects.filter(p=>normalizeLocation(p.location).includes(city)).slice(0,3);
  if(!picks.length) return '';
  const displayCity=city.replace(/\b\w/g,c=>c.toUpperCase());
  return `<section class="section section--cream cms-recent-work"><div class="shell"><div class="section-intro"><div><p class="kicker">Completed work nearby</p><h2>HQ projects in ${esc(displayCity)}.</h2></div><p>Recent HQ Construction &amp; Remodeling projects completed in and around this service area.</p></div><div class="cms-project-cards">${picks.map(p=>`<article class="cms-project-card"><button data-caption="${esc(p.title)}" data-lightbox="${esc(rel(p.cover_image))}"><img src="${esc(rel(p.cover_image))}" alt="${esc(p.cover_alt)}" loading="lazy"></button><div><small>${esc(labels[p.category])}</small><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${p.detail_page?`<a class="text-link" href="projects/${projectSlug(p)}.html">View project <span>↗</span></a>`:`<a class="text-link" href="gallery.html">View gallery <span>↗</span></a>`}</div></article>`).join('')}</div></div></section>`;
}
function paragraphize(s=''){ return String(s).split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join(''); }
function projectPage(template,p){
  const slug=projectSlug(p), seoTitle=p.seo?.title || `${p.title} | HQ Construction & Remodeling`, seoDescription=metaDescription(p.seo?.description || p.summary);
  const imgs=imageItems(p);
  const facts=[p.project_type&&['Project type',p.project_type],p.location&&['Service area',p.location],p.year&&['Year',p.year]].filter(Boolean).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const services=p.services.length?`<div class="project-services"><h3>Scope & features</h3><ul>${p.services.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`:'';
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'CreativeWork',name:p.title,description:p.summary,url:`${BASE_URL}/projects/${slug}.html`,image:imgs.map(i=>`${BASE_URL}${publicPath(i.image)}`),creator:{'@type':'GeneralContractor',name:'HQ Construction & Remodeling LLC',url:`${BASE_URL}/`}}).replace(/</g,'\\u003c');
  const gallery=`${imgs.map(img=>`<button class="gallery-item" data-category="${esc(p.category)}" data-caption="${esc(img.caption||p.title)}" data-lightbox="../${esc(rel(img.image))}"><img src="../${esc(rel(img.image))}" alt="${esc(img.alt)}" loading="lazy" decoding="async"><span>${esc(img.caption||p.title)}</span></button>`).join('')}`;
  const replacements={SEO_TITLE:esc(seoTitle),SEO_DESCRIPTION:esc(seoDescription),SLUG:slug,COVER_IMAGE:publicPath(p.cover_image),COVER_RELATIVE:`../${rel(p.cover_image)}`,SCHEMA:schema,CATEGORY_LABEL:esc(labels[p.category]),LOCATION_META:p.location?` · ${esc(p.location)}`:'',TITLE:esc(p.title),SUMMARY:esc(p.summary),FACTS:facts,SERVICES:services,PROJECT_TYPE:esc(p.project_type||p.title),SCOPE_HTML:paragraphize(p.scope||p.summary),GALLERY:gallery};
  return Object.entries(replacements).reduce((html,[k,v])=>html.replaceAll(`{{${k}}}`,v),template);
}
function sitemap(projects){
  const staticUrls=['/','/services.html','/gallery.html','/contact.html','/about.html','/kitchen-remodeling.html','/bathroom-remodeling.html','/basement-remodeling.html','/home-additions.html','/decks-outdoor-living.html','/commercial-remodeling.html','/service-areas.html','/johns-creek-remodeling.html','/alpharetta-remodeling.html','/roswell-remodeling.html','/cumming-remodeling.html','/canton-remodeling.html'];
  const lastmod=new Date().toISOString().slice(0,10);
  const imageXml=(imgs)=>imgs.map(i=>`<image:image><image:loc>${BASE_URL}${esc(publicPath(i.image))}</image:loc><image:caption>${esc(i.alt)}</image:caption></image:image>`).join('');
  const entries=staticUrls.map(u=>{ const imgs=u==='/gallery.html'?projects.flatMap(imageItems):[]; return `<url><loc>${BASE_URL}${u}</loc><lastmod>${lastmod}</lastmod>${imageXml(imgs)}</url>`; });
  for(const p of projects.filter(p=>p.detail_page)) entries.push(`<url><loc>${BASE_URL}/projects/${projectSlug(p)}.html</loc><lastmod>${lastmod}</lastmod>${imageXml(imageItems(p))}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
}

function polishCustomerHtml(html, nested=false){
  const p=nested?'../':'';
  const explore=`<div><h3>Explore</h3><a href="${p}index.html">Home</a><a href="${p}services.html">Services</a><a href="${p}gallery.html">Our Work</a><a href="${p}index.html#reviews">Reviews</a><a href="${p}about.html">About</a><a href="${p}service-areas.html">Service Areas</a><a href="${p}contact.html">Contact</a></div>`;
  const services=`<div><h3>Services</h3><a href="${p}kitchen-remodeling.html">Kitchen Remodeling</a><a href="${p}bathroom-remodeling.html">Bathroom Remodeling</a><a href="${p}basement-remodeling.html">Basements &amp; Interiors</a><a href="${p}home-additions.html">Home Additions</a><a href="${p}decks-outdoor-living.html">Decks &amp; Outdoor Living</a><a href="${p}commercial-remodeling.html">Commercial Remodeling</a></div>`;
  html=html.replace(/<div><h3>Explore<\/h3>[\s\S]*?<\/div>/,explore);
  html=html.replace(/<div><h3>Services<\/h3>[\s\S]*?<\/div>/,services);
  html=html
    .replaceAll('Real photography from this HQ Construction &amp; Remodeling project.','Completed project photos from HQ Construction &amp; Remodeling.')
    .replaceAll('Real work. Real project photos.','Completed projects.')
    .replaceAll('Project stories','Featured projects');
  return html;
}

await fs.rm(DIST,{recursive:true,force:true}); await fs.mkdir(DIST,{recursive:true});
await copyDir(ROOT,DIST);
const projects=await loadProjects();

let gallery=await fs.readFile(path.join(ROOT,'gallery.html'),'utf8');
const detailProjects=projects.filter(p=>p.detail_page);
const projectIndex=detailProjects.length?`<div class="gallery-project-index"><p class="kicker">Project stories</p><div class="gallery-project-links">${detailProjects.map(p=>`<a href="projects/${projectSlug(p)}.html"><span>${esc(labels[p.category])}${p.location?` · ${esc(p.location)}`:''}</span><strong>${esc(p.title)}</strong><b>View project ↗</b></a>`).join('')}</div></div>`:'';
gallery=markerReplace(gallery,'GALLERY_CONTENT',`${projectIndex}${galleryControls(projects)}${galleryGrid(projects)}`);
await fs.writeFile(path.join(DIST,'gallery.html'),gallery);

let home=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
home=markerReplace(home,'FEATURED_WORK',featuredWork(projects));
await fs.writeFile(path.join(DIST,'index.html'),home);

for(const [file,cats] of Object.entries(serviceCategories)){
  let html=await fs.readFile(path.join(ROOT,file),'utf8');
  html=markerReplace(html,'RECENT_WORK',recentWork(projects,cats));
  await fs.writeFile(path.join(DIST,file),html);
}

for(const [file,city] of Object.entries(locationPages)){
  let html=await fs.readFile(path.join(ROOT,file),'utf8');
  html=markerReplace(html,'LOCAL_WORK',localWork(projects,city));
  await fs.writeFile(path.join(DIST,file),html);
}

const template=await fs.readFile(path.join(ROOT,'templates','project.html'),'utf8');
await fs.mkdir(path.join(DIST,'projects'),{recursive:true});
for(const p of projects.filter(p=>p.detail_page)) await fs.writeFile(path.join(DIST,'projects',`${projectSlug(p)}.html`),projectPage(template,p));
await fs.writeFile(path.join(DIST,'data','projects.json'),JSON.stringify(projects.map(({_slug,...p})=>({...p,slug:_slug})),null,2));
await fs.writeFile(path.join(DIST,'sitemap.xml'),sitemap(projects));

const rootHtml=(await fs.readdir(DIST)).filter(f=>f.endsWith('.html'));
for(const file of rootHtml){
  const fp=path.join(DIST,file);
  await fs.writeFile(fp,polishCustomerHtml(await fs.readFile(fp,'utf8'),false));
}
const projectOut=path.join(DIST,'projects');
if(await exists(projectOut)){
  for(const file of (await fs.readdir(projectOut)).filter(f=>f.endsWith('.html'))){
    const fp=path.join(projectOut,file);
    await fs.writeFile(fp,polishCustomerHtml(await fs.readFile(fp,'utf8'),true));
  }
}
console.log('Polished customer-facing HTML navigation, footer and copy.');
console.log(`Built ${projects.length} published project/photo sets; ${projects.filter(p=>p.detail_page).length} detail page(s).`);
