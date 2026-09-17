const COMPANY = {
  name: "HQ Construction & Remodeling LLC",
  phone: "678-300-2501",
  email: "sales.hqconstruction@gmail.com",
  site: "https://hqconstructionllc.com",
  logo: "https://hqconstructionllc.com/assets/images/hq-logo-official.png",
};

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const clean = (value) => String(value ?? "").trim();
const valueOrDash = (value) => clean(value) || "Not provided";

function parseJson(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function scalarValue(value) {
  if (value === null || value === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return clean(value);
  if (Array.isArray(value)) return value.map(scalarValue).filter(Boolean).join(", ");
  return "";
}

function pick(data, ...keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = scalarValue(data[key]);
    if (value) return value;
  }

  // Netlify preserves the exact HTML field name, including spaces,
  // capitalization, hyphens, and underscores. Match those presentation
  // differences so "Project type", "project-type", and "project_type"
  // resolve to the same submitted field.
  const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = new Set(keys.map(normalizeKey));
  for (const [key, rawValue] of Object.entries(data)) {
    if (!wanted.has(normalizeKey(key))) continue;
    const value = scalarValue(rawValue);
    if (value) return value;
  }
  return "";
}

function inspectFile(value, fallbackName = "") {
  const out = { name: clean(fallbackName), url: "" };
  const visit = (item, depth = 0) => {
    if (item === null || item === undefined || depth > 5) return;
    if (typeof item === "string") {
      const text = item.trim();
      if (!text || text === "[object Object]") return;
      if (/^https?:\/\//i.test(text)) { out.url ||= text; return; }
      const parsed = parseJson(text);
      if (parsed) { visit(parsed, depth + 1); return; }
      out.name ||= text;
      return;
    }
    if (Array.isArray(item)) { item.forEach((entry) => visit(entry, depth + 1)); return; }
    if (typeof item === "object") {
      for (const key of ["url", "secure_url", "download_url", "href", "asset_url", "public_url"]) {
        const candidate = item[key];
        if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) out.url ||= candidate;
      }
      for (const key of ["filename", "fileName", "name", "original_filename", "originalName"]) {
        const candidate = item[key];
        if (typeof candidate === "string" && candidate.trim() && candidate !== "[object Object]") out.name ||= candidate.trim();
      }
      for (const key of ["file", "asset", "upload", "data", "value"]) {
        if (key in item) visit(item[key], depth + 1);
      }
    }
  };
  visit(value);
  return out;
}

export function normalizeSubmission(raw = {}) {
  const embedded = parseJson(pick(raw, "notification_payload", "submission_payload")) || {};
  // The browser snapshot wins for text fields. Raw Netlify values remain the fallback.
  const combined = { ...raw, ...embedded };
  const file1 = inspectFile(raw.project_file_1 ?? raw.project_files ?? raw["Project File 1"], pick(combined, "project_file_1_name"));
  const file2 = inspectFile(raw.project_file_2 ?? raw["Project File 2"], pick(combined, "project_file_2_name"));
  const file3 = inspectFile(raw.project_file_3 ?? raw["Project File 3"], pick(combined, "project_file_3_name"));

  return {
    name: pick(combined, "name", "Name", "customer_name"),
    phone: pick(combined, "phone", "Phone", "telephone", "tel"),
    email: pick(combined, "email", "Email", "customer_email"),
    project_type: pick(combined, "project_type", "Project type", "Project Type", "projectType"),
    desired_timing: pick(combined, "timeline", "desired_timing", "Desired Timing", "Timeline", "desiredTiming"),
    project_zip_code: pick(combined, "project_zip", "project_zip_code", "Project ZIP", "Project Zip", "Project ZIP Code", "zip_code", "zip", "projectZip"),
    property_address_or_neighborhood: pick(combined, "location", "property_address_or_neighborhood", "Property Address or Neighborhood", "Property / Neighborhood", "Location", "property_address", "address", "neighborhood"),
    project_description: pick(combined, "project_details", "project_description", "Project details", "Project Description", "Project Details", "description", "details"),
    how_did_you_hear_about_us: pick(combined, "referral_source", "how_did_you_hear_about_us", "How Did You Hear About Us", "Referral source", "Referral Source", "source"),
    files: [file1, file2, file3].filter((file) => file.name || file.url),
    form_version: pick(combined, "form_version") || "unknown",
    embedded_payload_present: Object.keys(embedded).length > 0,
  };
}

function fieldRow(label, value, options = {}) {
  const raw = clean(value);
  const shown = esc(raw || "Not provided");
  let body = shown;
  if (options.type === "email" && raw) body = `<a href="mailto:${esc(raw)}" style="color:#0b0b0c;text-decoration:none;font-weight:700">${shown}</a>`;
  if (options.type === "phone" && raw) {
    const dial = raw.replace(/[^0-9+]/g, "");
    body = `<a href="tel:${esc(dial)}" style="color:#0b0b0c;text-decoration:none;font-weight:700">${shown}</a>`;
  }
  return `<tr><td style="padding:13px 0;border-bottom:1px solid #e7e0d3;color:#81786a;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;width:35%">${esc(label)}</td><td style="padding:13px 0 13px 20px;border-bottom:1px solid #e7e0d3;color:#0b0b0c;font-size:15px;line-height:1.55;vertical-align:top">${body}</td></tr>`;
}

function fileCard(file, index) {
  const label = file.name || `Project file ${index}`;
  if (file.url) return `<a href="${esc(file.url)}" style="margin:8px 8px 0 0;display:inline-block;padding:12px 16px;background:#0b0b0c;color:#fff;text-decoration:none;border-radius:5px;font-size:13px;font-weight:700">Open ${esc(label)}</a>`;
  return `<div style="margin:8px 8px 0 0;display:inline-block;padding:12px 15px;border:1px solid #d8cba9;border-radius:5px;color:#3f392f;font-size:13px"><strong>${esc(label)}</strong><br><span style="font-size:11px;color:#81786a">Stored with the Netlify submission</span></div>`;
}

export function buildEmail(input) {
  const data = input && Array.isArray(input.files) ? input : normalizeSubmission(input);
  const name = valueOrDash(data.name);
  const projectType = valueOrDash(data.project_type);
  const email = clean(data.email);
  const received = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" }).format(new Date());
  const files = data.files.map((file, i) => fileCard(file, i + 1)).join("");
  const subject = `New HQ Project Request — ${projectType} — ${name}`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#eee9df;font-family:Arial,Helvetica,sans-serif;color:#0b0b0c"><div style="display:none;max-height:0;overflow:hidden;opacity:0">New project request from ${esc(name)} for ${esc(projectType)}.</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eee9df;padding:28px 12px"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#fff;border:1px solid #ded6c8;border-radius:10px;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.08)"><tr><td style="background:#0b0b0c;padding:28px 34px 24px;text-align:center;border-bottom:4px solid #d2a84a"><img src="${COMPANY.logo}" alt="${COMPANY.name}" width="360" style="display:block;width:100%;max-width:360px;height:auto;margin:0 auto 22px"><div style="color:#d2a84a;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">New Project Request</div><h1 style="margin:10px 0 0;color:#fff;font-size:30px;line-height:1.15">${esc(name)}</h1><p style="margin:8px 0 0;color:#cbc5ba;font-size:15px">${esc(projectType)} · ${esc(valueOrDash(data.project_zip_code))}</p></td></tr><tr><td style="padding:30px 34px 10px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f3eb;border-left:4px solid #d2a84a;border-radius:5px"><tr><td style="padding:17px 18px;color:#4e473c;font-size:14px;line-height:1.55"><strong style="color:#0b0b0c">Received ${esc(received)} ET</strong><br>The request is stored in Netlify Forms. Replying to this email is addressed to the customer.</td></tr></table></td></tr><tr><td style="padding:16px 34px 4px"><h2 style="margin:0 0 8px;font-size:18px;letter-spacing:.04em">Customer</h2><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${fieldRow("Name", data.name)}${fieldRow("Phone", data.phone, {type:"phone"})}${fieldRow("Email", data.email, {type:"email"})}</table></td></tr><tr><td style="padding:26px 34px 4px"><h2 style="margin:0 0 8px;font-size:18px;letter-spacing:.04em">Project</h2><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${fieldRow("Project type", data.project_type)}${fieldRow("Desired timing", data.desired_timing)}${fieldRow("ZIP code", data.project_zip_code)}${fieldRow("Property / neighborhood", data.property_address_or_neighborhood)}${fieldRow("Referral source", data.how_did_you_hear_about_us)}</table></td></tr><tr><td style="padding:26px 34px 4px"><h2 style="margin:0 0 12px;font-size:18px;letter-spacing:.04em">Project Description</h2><div style="background:#f7f3eb;border:1px solid #e2d9c9;border-radius:6px;padding:20px;color:#292622;font-size:15px;line-height:1.7;white-space:pre-wrap">${esc(valueOrDash(data.project_description))}</div></td></tr>${files ? `<tr><td style="padding:26px 34px 4px"><h2 style="margin:0 0 6px;font-size:18px;letter-spacing:.04em">Files</h2>${files}<p style="margin:12px 0 0;color:#81786a;font-size:12px;line-height:1.5">When a direct file link is not supplied by the event, open this submission in Netlify Forms to view or download the upload.</p></td></tr>` : ""}<tr><td style="padding:30px 34px 36px">${email ? `<a href="mailto:${esc(email)}?subject=${encodeURIComponent(`Re: ${projectType} project request`)}" style="display:inline-block;background:#d2a84a;color:#0b0b0c;text-decoration:none;padding:14px 22px;border-radius:5px;font-size:14px;font-weight:800;letter-spacing:.04em">Reply to ${esc(name)}</a>` : ""}<a href="${COMPANY.site}/contact.html" style="display:inline-block;margin-left:8px;color:#5d5548;text-decoration:none;padding:13px 10px;font-size:14px;font-weight:700">Open HQ website</a></td></tr><tr><td style="background:#0b0b0c;padding:22px 34px;text-align:center;color:#bbb3a7;font-size:12px;line-height:1.6">${COMPANY.name}<br><a href="tel:+16783002501" style="color:#d2a84a;text-decoration:none">${COMPANY.phone}</a> · <a href="mailto:${COMPANY.email}" style="color:#d2a84a;text-decoration:none">${COMPANY.email}</a></td></tr></table></td></tr></table></body></html>`;
  const textFiles = data.files.map((file, i) => `File ${i + 1}: ${file.name || file.url || "Stored in Netlify Forms"}${file.url ? ` (${file.url})` : ""}`);
  const text = ["NEW HQ PROJECT REQUEST", "", `Name: ${valueOrDash(data.name)}`, `Phone: ${valueOrDash(data.phone)}`, `Email: ${valueOrDash(data.email)}`, `Project type: ${valueOrDash(data.project_type)}`, `Desired timing: ${valueOrDash(data.desired_timing)}`, `ZIP code: ${valueOrDash(data.project_zip_code)}`, `Property / neighborhood: ${valueOrDash(data.property_address_or_neighborhood)}`, `Referral source: ${valueOrDash(data.how_did_you_hear_about_us)}`, "", "Project description:", valueOrDash(data.project_description), ...(textFiles.length ? ["", ...textFiles] : [])].join("\n");
  return { subject, html, text, replyTo: email || undefined, normalized: data };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
    return Response.json({ ok:true, function:"hq-project-email", eventHandler:"formSubmitted", version:"v18-final-capture", environment:{ resendApiKeyConfigured:Boolean(process.env.RESEND_API_KEY), notificationEmailConfigured:Boolean(process.env.HQ_NOTIFICATION_EMAIL), fromAddressConfigured:Boolean(process.env.HQ_EMAIL_FROM) } });
  },
  async formSubmitted(event) {
    const rawData = event?.data ?? {};
    const data = normalizeSubmission(rawData);
    console.log("HQ formSubmitted event received", { rawFields:Object.keys(rawData), embeddedPayloadPresent:data.embedded_payload_present, formVersion:data.form_version, capturedFields:Object.entries(data).filter(([key,value]) => !["files","embedded_payload_present"].includes(key) && clean(value)).map(([key])=>key), fileCount:data.files.length });
    if (!clean(data.name) && !clean(data.email) && !clean(data.phone)) { console.log("Ignoring formSubmitted event without HQ customer fields."); return; }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) { console.error("RESEND_API_KEY is missing; branded form email was not sent."); return; }
    const { subject, html, text, replyTo } = buildEmail(data);
    const to = process.env.HQ_NOTIFICATION_EMAIL || COMPANY.email;
    const from = process.env.HQ_EMAIL_FROM || "HQ Construction <onboarding@resend.dev>";
    const payload = { from, to:[to], subject, html, text, ...(replyTo ? {reply_to:replyTo} : {}) };
    const response = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" }, body:JSON.stringify(payload) });
    if (!response.ok) { const details=await response.text(); console.error(`Resend failed (${response.status}): ${details}`); throw new Error(`Branded email failed with status ${response.status}`); }
    const result=await response.json();
    console.log(`Branded HQ project request email sent to ${to}.`, { resendEmailId:result.id });
  },
};
