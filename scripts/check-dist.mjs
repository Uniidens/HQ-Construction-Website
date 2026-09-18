import { promises as fs } from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dist=path.join(root,'dist');
const errors=[];
const noindexAllowed=new Set(['404.html','thank-you.html']);
const forbiddenCustomerCopy=['bid-pack reference','never bid-pack','reference imagery','Projects are shown only when the project entry is tagged','Real project photography.','Selected completed work from HQ Construction & Remodeling project files.'];
const legacyImageRefs=['assets/images/hero-kitchen.jpg','assets/images/project-living-dark.webp','assets/images/project-kitchen-forest.webp','assets/images/service-addition.webp'];

async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()) out.push(...await walk(p)); else out.push(p)}return out}
async function exists(p){try{await fs.access(p);return true}catch{return false}}
const htmlFiles=(await walk(dist)).filter(p=>p.endsWith('.html')&&!p.includes(path.sep+'admin'+path.sep));

for(const fp of htmlFiles){
  const rel=path.relative(dist,fp).replaceAll('\\','/');
  const html=await fs.readFile(fp,'utf8');
  const noindex=/content=["'][^"']*noindex/i.test(html);
  const h1s=[...html.matchAll(/<h1\b/gi)].length;
  if(h1s!==1) errors.push(rel+': expected exactly one h1, found '+h1s);
  if(!/<title>[^<]{8,}<\/title>/i.test(html)) errors.push(rel+': missing/short title');
  if(!noindexAllowed.has(rel)){
    const desc=(html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)||[])[1]||'';
    if(desc.length<70||desc.length>165) errors.push(rel+': meta description length '+desc.length+' (target 70-165)');
    const hasCanonical=/<link[^>]+rel=["']canonical["'][^>]*href=["']https:\/\/hqconstructionllc\.com\//i.test(html)||/<link[^>]+href=["']https:\/\/hqconstructionllc\.com\/[^"']*["'][^>]*rel=["']canonical["']/i.test(html);
    if(!hasCanonical) errors.push(rel+': missing canonical');
    if(noindex) errors.push(rel+': unexpected noindex');
  }else if(!noindex) errors.push(rel+': should be noindex');
  if(rel!=='404.html'&&rel!=='thank-you.html'){
    for(const label of ['Home','Services','Our Work','Reviews','About','Contact']) if(!new RegExp('<a[^>]*>'+label+'<\\/a>','i').test(html)) errors.push(rel+': primary navigation missing '+label);
    if(!/Request an Estimate/i.test(html)) errors.push(rel+': missing primary estimate CTA');
  }
  if(/<footer class=["']site-footer["']/i.test(html)){
    if(!/<h3>Explore<\/h3>[\s\S]*?>Contact<\/a>/i.test(html)) errors.push(rel+': footer Explore missing Contact link');
    const footer=(html.match(/<footer class=["']site-footer["']>[\s\S]*?<\/footer>/i)||[])[0]||'';
    if((footer.match(/services\.html#/g)||[]).length) errors.push(rel+': footer contains duplicate service-anchor navigation');
  }
  for(const phrase of forbiddenCustomerCopy) if(html.includes(phrase)) errors.push(rel+': internal/process-facing copy leaked: '+phrase);
  for(const ref of legacyImageRefs) if(html.includes(ref)) errors.push(rel+': legacy/generic image referenced: '+ref);
  for(const m of html.matchAll(/<img\b([^>]*)>/gi)){const alt=(m[1].match(/\balt=["']([^"']*)["']/i)||[])[1];if(alt===undefined||!alt.trim()) errors.push(rel+': image missing meaningful alt text')}
  for(const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)){
    const raw=m[1]; if(!raw||raw.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    const clean=raw.split('#')[0].split('?')[0]; if(!clean) continue;
    const target=path.resolve(path.dirname(fp),clean);
    if(!(await exists(target))&&!(await exists(target+'.html'))&&!(await exists(path.join(target,'index.html')))) errors.push(rel+': broken local reference '+raw);
  }
}

const contact=await fs.readFile(path.join(dist,'contact.html'),'utf8');
for(const token of ['data-netlify="true"','name="project-request"','netlify-honeypot="bot-field"','enctype="multipart/form-data"','action="thank-you.html"']) if(!contact.includes(token)) errors.push('contact.html: form configuration missing '+token);

const css=await fs.readFile(path.join(dist,'css','styles.css'),'utf8');
if(!css.includes('FINAL CUSTOMER-FACING PAGE NORMALIZATION')) errors.push('styles.css: final normalization layer missing');
for(const ref of legacyImageRefs) if(css.includes(ref)) errors.push('styles.css: legacy/generic image referenced: '+ref);

const sitemap=await fs.readFile(path.join(dist,'sitemap.xml'),'utf8');
const expectedStatic=['/','/services.html','/gallery.html','/contact.html','/about.html','/kitchen-remodeling.html','/bathroom-remodeling.html','/basement-remodeling.html','/home-additions.html','/decks-outdoor-living.html','/commercial-remodeling.html','/service-areas.html','/johns-creek-remodeling.html','/alpharetta-remodeling.html','/roswell-remodeling.html','/cumming-remodeling.html','/canton-remodeling.html'];
for(const u of expectedStatic) if(!sitemap.includes('<loc>https://hqconstructionllc.com'+u+'</loc>')) errors.push('sitemap.xml: missing '+u);

const robots=await fs.readFile(path.join(dist,'robots.txt'),'utf8');
if(!robots.includes('Sitemap: https://hqconstructionllc.com/sitemap.xml')) errors.push('robots.txt: sitemap declaration missing');
if(!(await exists(path.join(dist,'admin','index.html')))) errors.push('admin/index.html: missing from build');

if(errors.length){console.error('Production QA failed:\n'+errors.join('\n'));process.exit(1)}
console.log('Production QA passed: '+htmlFiles.length+' customer-facing HTML pages validated for navigation, SEO, accessibility basics, internal links, forms, imagery, sitemap and customer-facing copy.');
