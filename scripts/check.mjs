import { promises as fs } from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const errors=[];
const allowedNoindex=new Set(['404.html','thank-you.html']);
const publicHtml=(await fs.readdir(root)).filter(f=>f.endsWith('.html'));

for(const f of publicHtml){
  const t=await fs.readFile(path.join(root,f),'utf8');
  if(/noindex/i.test(t)&&!allowedNoindex.has(f)) errors.push(`${f}: unexpected noindex`);
  if(!/<link[^>]+rel=["']canonical["']/i.test(t)&&!allowedNoindex.has(f)) errors.push(`${f}: missing canonical`);
  if(/hqconstruction\.netlify\.app/i.test(t)) errors.push(`${f}: Netlify subdomain leaked into public HTML`);
}

const categorySet=new Set(['kitchen','bathroom','interior','addition','outdoor','commercial','flooring','cabinetry','exterior','other']);
const projectFiles=(await fs.readdir(path.join(root,'content/projects'))).filter(f=>f.endsWith('.json'));
for(const f of projectFiles){
  try{
    const p=JSON.parse(await fs.readFile(path.join(root,'content/projects',f),'utf8'));
    for(const k of ['title','category','summary','cover_image']) if(!p[k]) errors.push(`${f}: missing ${k}`);
    if(p.category&&!categorySet.has(p.category)) errors.push(`${f}: invalid category ${p.category}`);
    const imgs=[p.cover_image,...(p.images||[]).map(x=>x.image)].filter(Boolean);
    for(const im of imgs){
      const disk=path.join(root,String(im).replace(/^\//,''));
      try{await fs.access(disk)}catch{errors.push(`${f}: missing image ${im}`)}
    }
  }catch(e){errors.push(`${f}: invalid JSON ${e.message}`)}
}

const config=await fs.readFile(path.join(root,'admin','config.yml'),'utf8');
if(!/repo:\s*Uniidens\/HQ-Construction-Website\b/.test(config)) errors.push('admin/config.yml: expected dedicated website repository');
if(!/media_processing:\s*[\s\S]*?default:\s*webp/.test(config)) errors.push('admin/config.yml: WebP upload processing is not enabled');
if(/git-gateway/.test(config)) errors.push('admin/config.yml: Git Gateway must not be used in this configuration');
if(/auth_scope:\s*repo/.test(config)) errors.push('admin/config.yml: broad private-repository OAuth scope must not be requested');

const forbidden=['QuikTrip No. 1750','AutoZone - Marietta'];
const scanTargets=[...publicHtml.map(f=>path.join(root,f)),...projectFiles.map(f=>path.join(root,'content','projects',f))];
for(const fp of scanTargets){
  const t=await fs.readFile(fp,'utf8');
  for(const phrase of forbidden) if(t.includes(phrase)) errors.push(`${path.relative(root,fp)}: bid-pack reference leaked (${phrase})`);
}

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Checks passed: ${publicHtml.length} public HTML files, ${projectFiles.length} CMS project records, SEO directives, CMS backend, uploads and project assets validated.`);
