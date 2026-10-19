// Local QA only: an in-browser imitation of the Handova database and its server functions.
// Never used in production builds. Seeded accounts: admin@example.test, org@example.test, talent@example.test (password: any 12+ characters).
const KEY = "ia-mock-db-v1", SKEY = "ia-mock-session-v1";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const now = () => new Date().toISOString();
const ADMIN = "00000000-0000-4000-8000-00000000000a", ORGU = "00000000-0000-4000-8000-00000000000b", TAL = "00000000-0000-4000-8000-00000000000c", ORG = "00000000-0000-4000-8000-0000000000aa", NEED = "00000000-0000-4000-8000-0000000000bb";

function seed() {
  return {
    users: [
      { id: ADMIN, email: "admin@example.test", password: "", user_metadata: { role: "professional", full_name: "Test Admin" } },
      { id: ORGU, email: "org@example.test", password: "", user_metadata: { role: "organisation", full_name: "Wanjiru Kamau" } },
      { id: TAL, email: "talent@example.test", password: "", user_metadata: { role: "professional", full_name: "Amina Okoro" } },
    ],
    admins: [{ user_id: ADMIN }],
    profiles: [{ user_id: TAL, name: "Amina Okoro", headline: "Research and impact measurement", bio: "I turn complex evidence into clear decisions for community-led organisations.", experience: "Independent researcher, 2022 to now", location: "Nairobi · UTC+3", country: "Kenya", skills: ["Research", "Data analysis", "Training"], languages: ["English", "Swahili"], hours_available: 12, arrangement: "Remote", website: "", age_confirmed: true, unpaid_confirmed: true, published: true, review_status: "approved", approved_at: now(), created_at: now(), updated_at: now() }],
    organisations: [{ id: ORG, name: "Community Research Lab", country: "Kenya", city: "Kisumu", website: "https://example.org", summary: "A community research group helping village committees use evidence.", org_type: "Community organisation", locally_led_confirmed: true, status: "approved", approved_at: now(), created_at: now() }],
    organisation_members: [{ organisation_id: ORG, user_id: ORGU, role: "owner", full_name: "Wanjiru Kamau", created_at: now() }],
    needs: [{ id: NEED, organisation_id: ORG, title: "Create an accessible outcome report", description: "Help our team turn survey findings into an accessible report with a reusable template.", output: "A report template\nA short handover session", skills: ["Research", "Design"], languages: ["English", "Swahili"], hours: 8, arrangement: "Remote", location: "East Africa", country: "Kenya", deadline: null, places: 1, no_vulnerable_contact: true, status: "open", created_at: now(), updated_at: now() }],
    applications: [], invitations: [], conversations: [], messages: [], engagements: [], hours: [], reports: [], saved_needs: [], notifications: [], user_settings: [], agreement_signatures: [], app_settings: [{ key: "require_id_verification", value: "true" }], id_verifications: [],
  };
}
const load = () => { let d; try { d = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { d = seed(); } d.user_settings ||= []; d.user_private ||= []; d.survey_responses ||= []; return d; };
let D = load();
D.user_settings ||= []; D.user_private ||= []; D.survey_responses ||= [];
const save = () => localStorage.setItem(KEY, JSON.stringify(D));
const session = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } };
const me = () => session()?.user?.id || null;
const fail = (message, code) => { const e = new Error(message); e.code = code; throw e; };
const isMember = (org, u = me()) => D.organisation_members.some((m) => m.organisation_id === org && m.user_id === u);
const needOrg = (n) => D.needs.find((x) => x.id === n)?.organisation_id;
const notify = (user, kind, title, body = "", link = "") => user && D.notifications.push({ id: uid(), user_id: user, kind, title, body, link, read_at: null, created_at: now() });
const notifyOrg = (org, ...a) => D.organisation_members.filter((m) => m.organisation_id === org).forEach((m) => notify(m.user_id, ...a));
const notifyAdmins = (...a) => D.admins.forEach((x) => notify(x.user_id, ...a));
const profilePublic = (u) => D.profiles.some((p) => p.user_id === u && p.published && p.review_status === "approved");
const orgApproved = (o) => D.organisations.some((x) => x.id === o && x.status === "approved");

// ---------- visibility, loosely mirroring the database rules ----------
function visible(table, r) {
  const u = me(), admin = D.admins.some((a) => a.user_id === u);
  switch (table) {
    case "profiles": return (r.published && r.review_status === "approved") || r.user_id === u || admin || D.applications.some((a) => a.user_id === r.user_id && isMember(needOrg(a.need_id))) || D.engagements.some((e) => e.user_id === r.user_id && isMember(e.organisation_id));
    case "organisations": return r.status === "approved" || isMember(r.id) || admin;
    case "needs": return (["open", "closed"].includes(r.status) && orgApproved(r.organisation_id)) || isMember(r.organisation_id) || admin;
    case "applications": case "invitations": return r.user_id === u || isMember(needOrg(r.need_id)) || admin;
    case "conversations": return r.user_id === u || isMember(needOrg(r.need_id)) || (admin && D.reports.some((x) => x.target_id === r.id));
    case "messages": { const c = D.conversations.find((x) => x.id === r.conversation_id); return c && visible("conversations", c); }
    case "engagements": return r.user_id === u || isMember(r.organisation_id) || admin;
    case "hours": { const e = D.engagements.find((x) => x.id === r.engagement_id); return r.user_id === u || (e && isMember(e.organisation_id)) || admin; }
    case "reports": return r.reporter_id === u || admin;
    case "saved_needs": case "notifications": case "user_settings": case "user_private": return r.user_id === u || (table === "user_private" && admin);
    case "agreement_signatures": return r.user_id === u || admin;
    case "app_settings": return true;
    case "organisation_members": return r.user_id === u || isMember(r.organisation_id) || admin;
    default: return false;
  }
}

// ---------- select parsing and embedding ----------
function splitTop(s) { const out = []; let depth = 0, cur = ""; for (const ch of s) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
const FK = { organisations: ["organisation_id", "id"], profiles: ["user_id", "user_id"], needs: ["need_id", "id"] };
function shape(table, row, cols) {
  if (!cols || cols === "*") return { ...row };
  const out = {};
  for (const part of splitTop(cols)) {
    const m = part.match(/^(?:(\w+):)?(\w+)\((.*)\)$/s);
    if (m) {
      const [, alias, t, inner] = m;
      const [local, remote] = FK[t];
      const target = D[t].find((x) => x[remote] === row[local] && visible(t, x));
      out[alias || t] = target ? shape(t, target, inner) : null;
    } else if (part === "*") Object.assign(out, row);
    else out[part] = row[part];
  }
  return out;
}

class Query {
  constructor(t) { this.t = t; this.f = []; this.op = "select"; this.cols = "*"; }
  select(cols = "*", opts = {}) { if (this.op === "select") this.op = "select"; this.cols = cols; this.opts = opts; this.returning = true; return this; }
  insert(v) { this.op = "insert"; this.val = v; return this; }
  update(v) { this.op = "update"; this.val = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k, v) { this.f.push((r) => String(r[k]) === String(v)); return this; }
  neq(k, v) { this.f.push((r) => String(r[k]) !== String(v)); return this; }
  in(k, arr) { this.f.push((r) => arr.map(String).includes(String(r[k]))); return this; }
  is(k, v) { this.f.push((r) => (v === null ? r[k] == null : r[k] === v)); return this; }
  order(k, o = {}) { this.ord = [k, o.ascending !== false]; return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.single = "maybe"; return this; }
  single() { this.single = "one"; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    try {
      D = load();
      const rows = D[this.t];
      if (!rows) fail(`Unknown table ${this.t}`);
      let data;
      if (this.op === "insert") data = (Array.isArray(this.val) ? this.val : [this.val]).map((v) => insertRow(this.t, { ...v }));
      else {
        let hit = rows.filter((r) => visible(this.t, r) && this.f.every((f) => f(r)));
        if (this.op === "update") { hit.forEach((r) => updateRow(this.t, r, this.val)); data = hit; }
        else if (this.op === "delete") { D[this.t] = rows.filter((r) => !hit.includes(r)); data = hit; }
        else data = hit;
      }
      save();
      if (this.ord) { const [k, asc] = this.ord; data = [...data].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
      if (this.lim) data = data.slice(0, this.lim);
      const count = data.length;
      if (this.opts?.head) return { data: null, count, error: null };
      data = data.map((r) => shape(this.t, r, this.cols));
      if (this.single === "maybe") return { data: data[0] || null, error: null };
      if (this.single === "one") return data.length ? { data: data[0], error: null } : { data: null, error: { message: "Not found" } };
      return { data, count, error: null };
    } catch (e) { return { data: null, error: { message: e.message, code: e.code } }; }
  }
}

function insertRow(t, v) {
  const u = me();
  if (!u) fail("Please sign in.", "42501");
  const row = { id: uid(), created_at: now(), ...v };
  if (t === "user_settings") { if (v.user_id && v.user_id !== u) fail("new row violates row-level security policy", "42501"); row.user_id = u; delete row.id; }
  if (t === "profiles") {
    if (v.user_id !== u) fail("permission", "42501");
    if (v.published && !(v.age_confirmed && v.unpaid_confirmed)) fail("check", "23514");
    Object.assign(row, { review_status: v.published ? "pending" : "draft", updated_at: now() });
    delete row.id;
    if (v.published) notifyAdmins("profile_review", "Profile to review", v.name, "#admin");
  }
  if (t === "needs") {
    if (!isMember(v.organisation_id)) fail("new row violates row-level security policy", "42501");
    if (!["draft", "pending"].includes(v.status) && !orgApproved(v.organisation_id)) fail("new row violates row-level security policy", "42501");
    if (v.status === "open") fail("Send your need for review. Handova checks every need and opens it once it is approved.");
    if (!v.no_vulnerable_contact) fail("check", "23514");
    if (v.status === "pending" && needsInUse(v.organisation_id, null, true) >= 3) fail("You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.");
    if (v.status === "pending") notifyAdmins("need_submitted", "A need is waiting for review", v.title, "#admin");
    if (v.status === "open" && D.needs.filter((n) => n.organisation_id === v.organisation_id && n.status === "open").length >= 3) fail("An organisation can have up to 3 open needs at a time. Close one first.");
  }
  if (t === "applications" || t === "invitations") {
    const n = D.needs.find((x) => x.id === v.need_id);
    if (!n || n.status !== "open") fail("new row violates row-level security policy", "42501");
    if (t === "applications" && (v.user_id !== u || !profilePublic(u))) fail("new row violates row-level security policy", "42501");
    if (t === "invitations" && (!isMember(n.organisation_id) || !profilePublic(v.user_id))) fail("new row violates row-level security policy", "42501");
    if (D[t].some((x) => x.need_id === v.need_id && x.user_id === v.user_id)) fail("duplicate", "23505");
    Object.assign(row, { status: "pending" });
    let c = D.conversations.find((x) => x.need_id === v.need_id && x.user_id === v.user_id);
    if (c) Object.assign(c, { status: "open", closed_reason: "" }); else D.conversations.push({ id: uid(), need_id: v.need_id, user_id: v.user_id, status: "open", closed_reason: "", created_at: now() });
    if (t === "applications") notifyOrg(n.organisation_id, "application", "New application", n.title, "#org"); else notify(v.user_id, "invitation", "You have been invited to a need", n.title, "#workspace");
  }
  if (t === "messages") {
    const c = D.conversations.find((x) => x.id === v.conversation_id);
    if (!c || c.status !== "open" || !visible("conversations", c) || v.sender_id !== u) fail("new row violates row-level security policy", "42501");
    const n = D.needs.find((x) => x.id === c.need_id);
    if (u === c.user_id) notifyOrg(n.organisation_id, "message", "New message", n.title, "#conversation/" + c.id); else notify(c.user_id, "message", "New message", n.title, "#conversation/" + c.id);
  }
  if (t === "hours") {
    const e = D.engagements.find((x) => x.id === v.engagement_id);
    if (!e || e.user_id !== u || e.status !== "active") fail("new row violates row-level security policy", "42501");
    Object.assign(row, { status: "pending", review_note: "" });
    notifyOrg(e.organisation_id, "hours", "Hours to review", e.scope.need_title, "#org");
  }
  if (t === "reports") { row.reporter_id = u; row.status = "open"; notifyAdmins("report", "New concern reported", `${v.reason} · ${v.target_type}`, "#admin"); }
  if (t === "saved_needs") delete row.id;
  D[t].push(row);
  return row;
}
function updateRow(t, r, v) {
  const u = me();
  if (t === "profiles") {
    if (r.user_id !== u) fail("permission", "42501");
    if ("review_status" in v) fail("permission denied", "42501");
    const was = r.published;
    Object.assign(r, v, { updated_at: now() });
    if (r.published && !(r.age_confirmed && r.unpaid_confirmed)) fail("check", "23514");
    if (r.published && !was && ["draft", "changes_requested"].includes(r.review_status)) { r.review_status = "pending"; notifyAdmins("profile_review", "Profile to review", r.name, "#admin"); }
  } else if (t === "needs") {
    if (!isMember(r.organisation_id)) fail("permission", "42501");
    if (["open", "closed"].includes(r.status) && ["draft", "pending"].includes(v.status)) fail("Close a published need instead of returning it to draft.");
    if (["open", "closed"].includes(r.status) && ["title", "description", "output", "skills", "languages", "hours", "location", "deadline", "places"].some((k) => k in v && JSON.stringify(v[k]) !== JSON.stringify(r[k]))) fail("A live need can’t be edited. Stop applications and send a corrected copy for review.");
    if (v.status === "open" && r.status !== "open" && !(r.status === "closed" && r.approved_at)) fail("Send your need for review. Handova checks every need and opens it once it is approved.");
    if (v.status === "pending" && r.status !== "pending" && needsInUse(r.organisation_id, r.id, true) >= 3) fail("You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.");
    if (v.status === "pending" && r.status !== "pending") { v = { ...v, review_note: null }; notifyAdmins("need_submitted", "A need is waiting for review", r.title, "#admin"); }
    if (v.status === "closed" && r.status === "open") closeNeedApps(r);
    if (v.status === "open" && r.status !== "open" && D.needs.filter((n) => n.organisation_id === r.organisation_id && n.status === "open").length >= 3) fail("An organisation can have up to 3 open needs at a time. Close one first.");
    if ((v.status || r.status) !== "draft" && !(v.no_vulnerable_contact ?? r.no_vulnerable_contact)) fail("check", "23514");
    Object.assign(r, v, { updated_at: now() });
  } else if (t === "organisations") { if (!isMember(r.id)) fail("permission", "42501"); Object.assign(r, v); }
  else if (t === "notifications") { if (r.user_id !== u) fail("permission", "42501"); Object.assign(r, { read_at: v.read_at }); }
  else fail("permission denied", "42501");
}

// ---------- server functions ----------
const rpcs = {
  sign_org_agreement({ p_version, p_name, p_role, p_text }) {
    if (!me()) throw Error("Please sign in first.");
    if (String(p_name || "").trim().length < 2) throw Error("Type your full name to sign.");
    if (String(p_role || "").trim().length < 2) throw Error("Add your role in the organisation.");
    D.agreement_signatures = D.agreement_signatures || [];
    const row = { id: uid(), user_id: me(), kind: "organisation", version: p_version, full_name: p_name.trim(), signer_role: p_role.trim(), agreement_text: p_text, signed_at: now(), organisation_id: null };
    D.agreement_signatures.push(row); return row.id;
  },
  sign_agreement({ p_kind, p_version, p_name, p_text, p_hours }) {
    if (!me()) throw Error("Please sign in first.");
    if (String(p_name || "").trim().length < 2) throw Error("Type your full name to sign.");
    if (String(p_text || "").length < 500) throw Error("The agreement text is missing.");
    D.agreement_signatures = D.agreement_signatures || [];
    const row = { id: uid(), user_id: me(), kind: p_kind, version: p_version, full_name: p_name.trim(), hours_committed: p_hours, agreement_text: p_text, signed_at: now() };
    D.agreement_signatures.push(row); return row.id;
  },
  is_admin: () => D.admins.some((a) => a.user_id === me()),
  create_organisation: (a) => { if (!me()) fail("Please sign in first."); if (!a.p_locally_led) fail("Handova is for locally led organisations."); const id = uid(); D.organisations.push({ id, name: a.p_name, country: a.p_country, city: a.p_city || "", website: a.p_website || "", summary: a.p_summary || "", org_type: a.p_org_type, locally_led_confirmed: true, status: "pending", created_at: now() }); D.organisation_members.push({ organisation_id: id, user_id: me(), role: "owner", full_name: a.p_full_name || "", created_at: now() }); notifyAdmins("org_review", "Organisation to review", a.p_name, "#admin"); return id; },
  admin_review_organisation: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); const o = D.organisations.find((x) => x.id === a.p_org); o.status = a.p_decision; if (a.p_decision === "approved") o.approved_at = now(); notifyOrg(o.id, "org_decision", a.p_decision === "approved" ? "Your organisation is approved" : "Please update your organisation details", a.p_note || "", "#org"); },
  admin_review_profile: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); const p = D.profiles.find((x) => x.user_id === a.p_user); p.review_status = a.p_decision; if (a.p_decision === "approved") p.approved_at = now(); notify(p.user_id, "profile_decision", a.p_decision === "approved" ? "Your profile is approved and public" : "Please update your profile", a.p_note || "", "#workspace"); },
  admin_review_need: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); const n = D.needs.find((x) => x.id === a.p_need); if (!n) fail("Need not found."); if (n.status !== "pending") fail("This need is not waiting for review."); if (a.p_decision === "approved") { if (!orgApproved(n.organisation_id)) fail("Approve the organisation first. The need stays pending until then."); Object.assign(n, { status: "open", approved_at: now(), review_note: null }); notifyOrg(n.organisation_id, "need_decision", "Your need is live", a.p_note || n.title, "#org/needs/" + n.id); } else { if (!String(a.p_note || "").trim()) fail("Write a note so the organisation knows what to change."); Object.assign(n, { status: "draft", review_note: a.p_note.trim() }); notifyOrg(n.organisation_id, "need_decision", "Please update your need", a.p_note, "#org/needs/" + n.id); } },
  record_first_call: (a) => { const x = D.engagements.find((y) => y.id === a.p_id); if (!x) fail("Not found"); if (x.status !== "active") fail("You can record the first call once both have signed."); let c = D.conversations.find((v) => v.need_id === x.need_id && v.user_id === x.user_id); if (!c) { c = { id: uid(), need_id: x.need_id, user_id: x.user_id, status: "open", closed_reason: "", created_at: now() }; D.conversations.push(c); } D.messages.push({ id: uid(), conversation_id: c.id, sender_id: me(), body: a.p_summary, kind: "user", created_at: now() }); Object.assign(x, { first_call_at: a.p_date || now(), first_call_by: me(), first_call_written: !!a.p_written }); },
  admin_update_report: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); Object.assign(D.reports.find((x) => x.id === a.p_id), { status: a.p_status }); },
  decide_application: (a) => { const x = D.applications.find((y) => y.id === a.p_id); if (!x || !isMember(needOrg(x.need_id))) fail("You cannot decide on this application."); if (x.status !== "pending") fail("This application has already been decided."); x.status = a.p_accept ? "accepted" : "declined"; if (a.p_accept) return engage(x.need_id, x.user_id); closeConv(x.need_id, x.user_id, "Application not selected"); notify(x.user_id, "application_decision", "Your application was not selected", "", "#workspace"); return null; },
  withdraw_application: (a) => { const x = D.applications.find((y) => y.id === a.p_id && y.user_id === me()); if (!x || x.status !== "pending") fail("Only a pending application can be withdrawn."); x.status = "withdrawn"; closeConv(x.need_id, x.user_id, "Application withdrawn"); },
  admin_introduce: (a) => { if (!D.admins.some((x) => x.user_id === me())) fail("Administrator access required."); const n = D.needs.find((x) => x.id === a.p_need); if (!n || n.status !== "open" || !orgApproved(n.organisation_id)) fail("This need is not open."); if (!profilePublic(a.p_user)) fail("Only approved, published profiles can be introduced."); if (D.invitations.some((x) => x.need_id === a.p_need && x.user_id === a.p_user) || D.applications.some((x) => x.need_id === a.p_need && x.user_id === a.p_user && ["pending", "accepted"].includes(x.status))) fail("This person is already connected to this need."); if (String(a.p_message || "").trim().length < 30) fail("Write a short introduction of at least 30 characters."); const id = uid(); D.invitations.push({ id, need_id: a.p_need, user_id: a.p_user, invited_by: me(), message: "[Introduced by Handova] " + a.p_message.trim(), status: "pending", created_at: now() }); let c = D.conversations.find((x) => x.need_id === a.p_need && x.user_id === a.p_user); if (c) Object.assign(c, { status: "open", closed_reason: "" }); else D.conversations.push({ id: uid(), need_id: a.p_need, user_id: a.p_user, status: "open", closed_reason: "", created_at: now() }); notify(a.p_user, "invitation", "You have been invited to a need", n.title, "#workspace"); notifyOrg(n.organisation_id, "introduction", "Handova introduced a professional", n.title, "#org"); return id; },
  respond_invitation: (a) => { const x = D.invitations.find((y) => y.id === a.p_id && y.user_id === me()); if (!x || x.status !== "pending") fail("You have already responded."); x.status = a.p_accept ? "accepted" : "declined"; if (a.p_accept) return engage(x.need_id, x.user_id); closeConv(x.need_id, x.user_id, "Invitation declined"); return null; },
  sign_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || e.status !== "awaiting_signatures") fail("This agreement is no longer awaiting signatures."); if (!a.p_name || a.p_name.trim().length < 2) fail("Type your full name to sign."); if (e.user_id === me()) { if (e.talent_signed_at) fail("You have already signed."); Object.assign(e, { talent_signed_name: a.p_name, talent_signed_at: now() }); } else if (isMember(e.organisation_id)) { if (e.org_signed_at) fail("Your organisation has already signed."); Object.assign(e, { org_signed_name: a.p_name, org_signed_at: now() }); } else fail("You are not a party to this agreement."); if (e.talent_signed_at && e.org_signed_at) e.status = "active"; return e.status; },
  review_hours: (a) => { const h = D.hours.find((x) => x.id === a.p_id); const e = D.engagements.find((x) => x.id === h?.engagement_id); if (!h || !isMember(e.organisation_id) || h.user_id === me()) fail("You cannot review this entry."); if (h.status !== "pending") fail("This entry has already been reviewed."); if (!a.p_approve && (a.p_note || "").trim().length < 5) fail("Explain what needs to change."); Object.assign(h, { status: a.p_approve ? "approved" : "changes_requested", review_note: a.p_note || "" }); notify(h.user_id, "hours_review", a.p_approve ? "Hours approved" : "Changes requested on your hours", e.scope.need_title, "#workspace"); },
  complete_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || !isMember(e.organisation_id)) fail("You cannot complete this contribution."); if (e.status !== "active") fail("Only an active contribution can be completed."); if (D.hours.some((h) => h.engagement_id === e.id && h.status === "pending")) fail("Review all pending hours first."); const endorse = (a.p_endorsement || "").trim(); if (a.p_delivered === "all" && endorse.length < 100) fail("Write an endorsement of at least 100 characters."); if (!(a.p_skills || []).length) fail("Choose at least one skill you saw in this work."); Object.assign(e, { status: "completed", completed_at: now(), followup_due: new Date(Date.now() + 182 * 864e5).toISOString().slice(0, 10), delivered_as_agreed: a.p_delivered, deliverables: a.p_deliverables, confirmed_skills: a.p_skills || [], endorsement: endorse || null, endorsement_language: a.p_language, endorsed_by_role: a.p_role, endorser_name: a.p_name, show_endorser_name: a.p_show_name, note_to_professional: a.p_note || null, rating: null }); closeConv(e.need_id, e.user_id, "Contribution completed"); notify(e.user_id, "completed", "Your endorsement is ready", e.scope.need_title, "#workspace"); },
  request_endorsement_correction: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || e.user_id !== me()) fail("Only the professional can ask for a correction."); if (e.correction_requested_at) fail("You have already asked for a correction."); Object.assign(e, { correction_requested_at: now(), correction_reason: a.p_reason, correction_note: a.p_note, public: false }); },
  edit_endorsement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || !isMember(e.organisation_id)) fail("You cannot edit this endorsement."); if (!e.correction_requested_at || e.endorsement_edited_at) fail("Not possible."); Object.assign(e, { deliverables: a.p_deliverables, endorsement: a.p_endorsement || null, confirmed_skills: a.p_skills, endorsement_edited_at: now() }); },
  mark_delivered: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || e.user_id !== me()) fail("Only the professional can say the work is delivered."); if (e.status !== "active") fail("This contribution is not in progress."); if (e.talent_delivered_at) fail("You have already told the organisation."); e.talent_delivered_at = now(); notify(D.organisation_members.find((m) => m.organisation_id === e.organisation_id)?.user_id, "delivered", `${e.scope.talent} has delivered everything`, e.scope.need_title, `#org/needs/${e.need_id}`); },
  set_career_stage: (a) => { const u = me(); let r = D.user_private.find((x) => x.user_id === u); if (!r) D.user_private.push(r = { user_id: u }); r.career_stage = a.p_stage; },
  set_research_contact: (a) => { const u = me(); let r = D.user_private.find((x) => x.user_id === u); if (!r) D.user_private.push(r = { user_id: u }); r.research_contact = a.p_yes; },
  submit_survey: (a) => { const e = D.engagements.find((x) => x.id === a.p_engagement); if (!e || e.status !== "completed") fail("This contribution is not finished."); const old = D.survey_responses.find((r) => r.engagement_id === e.id && r.kind === a.p_kind); if (old && old.status !== "skipped") return; if (old) D.survey_responses = D.survey_responses.filter((r) => r !== old); D.survey_responses.push({ id: uid(), engagement_id: e.id, kind: a.p_kind, respondent: me(), status: a.p_status, short_form: !!a.p_short, q_version: a.p_version, lang: a.p_lang, answers: a.p_status === "submitted" ? a.p_answers : {}, created_at: now() }); },
  survey_pending: () => { const u = me(); const out = []; for (const e of D.engagements.filter((x) => x.status === "completed")) { const has = (k) => D.survey_responses.some((r) => r.engagement_id === e.id && r.kind === k); if (isMember(e.organisation_id) && !has("organisation")) out.push({ engagement_id: e.id, kind: "organisation", short_form: D.survey_responses.some((r) => r.kind === "organisation" && r.status === "submitted" && !r.short_form && D.engagements.find((x) => x.id === r.engagement_id)?.organisation_id === e.organisation_id), need_title: e.scope.need_title, other_name: e.scope.talent }); if (e.user_id === u && !has("professional")) out.push({ engagement_id: e.id, kind: "professional", short_form: false, need_title: e.scope.need_title, other_name: e.scope.organisation }); } return out; },
  admin_survey_data: () => D.engagements.filter((e) => e.status === "completed").map((e) => { const o = D.organisations.find((x) => x.id === e.organisation_id) || {}; const p = D.profiles.find((x) => x.user_id === e.user_id) || {}; const up = D.user_private.find((x) => x.user_id === e.user_id) || {}; const r = (k) => { const x = D.survey_responses.find((y) => y.engagement_id === e.id && y.kind === k); return x ? { id: x.id, kind: x.kind, status: x.status, short_form: x.short_form, q_version: x.q_version, lang: x.lang, answers: x.answers, created_at: x.created_at } : null; }; return { engagement_id: e.id, completed_at: e.completed_at, organisation_id: e.organisation_id, professional_id: e.user_id, org_country: o.country, org_type: o.org_type, staff_size: o.staff_size, pro_country: p.country, career_stage: up.career_stage, hours_planned: e.scope.hours, hours_approved: D.hours.filter((h) => h.engagement_id === e.id && h.status === "approved").reduce((t, h) => t + Number(h.hours), 0), delivered: e.delivered_as_agreed, still_in_use: e.followup_in_use, followup_answered_at: e.followup_answered_at, work_again: null, research_contact_org: null, research_contact_pro: up.research_contact ?? null, org_response: r("organisation"), pro_response: r("professional"), six_months: r("six_months"), need_title: e.scope.need_title }; }),
  admin_delete_contribution: (a) => { if (String(a.p_confirm || "").trim().toUpperCase() !== "DELETE") fail("Type DELETE to confirm."); const n = D.engagements.length; D.engagements = D.engagements.filter((e) => e.id !== a.p_id); if (D.engagements.length === n) fail("Contribution not found."); D.hours = D.hours.filter((h) => h.engagement_id !== a.p_id); },
  admin_delete_organisation: (a) => { const o = D.organisations.find((x) => x.id === a.p_org); if (!o) fail("Organisation not found."); if ((a.p_confirm || "").trim() !== o.name) fail("Type the organisation’s name exactly to confirm."); if (D.engagements.some((e) => e.organisation_id === o.id)) fail("This organisation has contribution records."); const ids = D.needs.filter((n) => n.organisation_id === o.id).map((n) => n.id); D.needs = D.needs.filter((n) => n.organisation_id !== o.id); D.applications = D.applications.filter((x) => !ids.includes(x.need_id)); D.organisation_members = D.organisation_members.filter((m) => m.organisation_id !== o.id); D.organisations = D.organisations.filter((x) => x !== o); },
  admin_endorsements_waiting: () => D.engagements.filter((e) => e.status === "active" && e.talent_delivered_at).map((e) => ({ id: e.id, organisation: e.scope.organisation, talent: e.scope.talent, need_title: e.scope.need_title, since: e.talent_delivered_at, talent_delivered: true })),
  end_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || !(e.user_id === me() || isMember(e.organisation_id))) fail("You are not a party to this engagement."); const ok = D.hours.filter((h) => h.engagement_id === e.id && h.status === "approved").reduce((t, h) => t + Number(h.hours), 0); if (e.user_id !== me() && e.status === "active" && ok >= Number(e.scope.hours) && !D.hours.some((h) => h.engagement_id === e.id && h.status === "pending")) fail("All the agreed hours are approved, so the work is finished. Complete it and write the endorsement instead. If something is wrong, contact Handova."); e.status = "ended"; closeConv(e.need_id, e.user_id, "Engagement ended"); },
  set_contribution_visibility: (a) => { const e = D.engagements.find((x) => x.id === a.p_id && x.user_id === me() && x.status === "completed"); if (!e) fail("Only your own completed contributions can be published."); e.public = a.p_public; },
  answer_followup: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); Object.assign(e, { followup_in_use: a.p_in_use, followup_answered_at: now() }); },
  close_conversation: (a) => { const c = D.conversations.find((x) => x.id === a.p_id); if (!c || !visible("conversations", c)) fail("You are not part of this conversation."); Object.assign(c, { status: "closed", closed_reason: "Ended by a participant" }); },
  public_contributions: (a) => D.engagements.filter((e) => e.user_id === a.p_user && e.status === "completed" && ((e.public && profilePublic(a.p_user)) || e.user_id === me())).map((e) => ({ id: e.id, need_title: e.scope.need_title, organisation: e.scope.organisation, organisation_country: e.scope.organisation_country, need: e.scope.description, output: e.scope.output, skills: (e.confirmed_skills || []).length ? e.confirmed_skills : e.scope.skills, skills_confirmed: !!(e.confirmed_skills || []).length, deliverables: e.deliverables, endorsement: e.endorsement, endorsed_by_role: e.endorsed_by_role, endorser_name: e.show_endorser_name ? e.endorser_name : null, endorsement_language: e.endorsement_language, hours: D.hours.filter((h) => h.engagement_id === e.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0), started: e.created_at, signed: e.org_signed_at, completed: e.completed_at, still_in_use: e.followup_in_use, followup_checked: e.followup_answered_at })),
  delete_my_account: () => { const u = me(); D.engagements.filter((e) => e.user_id === u).forEach((e) => { e.scope.talent = "Former member"; e.user_id = null; e.public = false; }); D.messages = D.messages.filter((m) => m.sender_id !== u); for (const t of ["profiles", "applications", "invitations", "saved_needs", "notifications", "organisation_members"]) D[t] = D[t].filter((r) => r.user_id !== u); D.conversations = D.conversations.filter((c) => c.user_id !== u); D.users = D.users.filter((x) => x.id !== u); localStorage.removeItem(SKEY); },
};
function needsInUse(org, except, withPending) { return D.needs.filter((n) => n.organisation_id === org && n.id !== except && (n.status === "open" || (withPending && n.status === "pending") || (n.status === "closed" && D.engagements.some((e) => e.need_id === n.id && ["awaiting_signatures", "active"].includes(e.status))))).length; }
function closeNeedApps(n) { for (const a of D.applications.filter((x) => x.need_id === n.id && x.status === "pending")) { Object.assign(a, { status: "declined", decided_at: now() }); closeConv(n.id, a.user_id, "Need closed"); notify(a.user_id, "application_decision", "The need you applied to is closed", n.title + ": it is no longer taking applications. Thank you for applying.", "#workspace"); } }
function closeConv(need, user, reason) { const c = D.conversations.find((x) => x.need_id === need && x.user_id === user); if (c) Object.assign(c, { status: "closed", closed_reason: reason }); }
function engage(needId, user) {
  const n = D.needs.find((x) => x.id === needId), o = D.organisations.find((x) => x.id === n.organisation_id), p = D.profiles.find((x) => x.user_id === user);
  if (n.status !== "open") fail("This need is no longer open.");
  const filled = D.engagements.filter((e) => e.need_id === needId && e.status !== "ended").length;
  if (filled >= n.places) fail("All places on this need are already filled.");
  const id = uid();
  D.engagements.push({ id, need_id: needId, organisation_id: n.organisation_id, user_id: user, terms_version: "2026-10-v1", scope: { need_title: n.title, description: n.description, output: n.output, skills: n.skills, languages: n.languages, hours: n.hours, arrangement: n.arrangement, location: n.location, country: n.country, organisation: o.name, organisation_country: o.country, talent: p.name }, talent_signed_name: "", talent_signed_at: null, org_signed_name: "", org_signed_at: null, status: "awaiting_signatures", public: false, created_at: now() });
  if (filled + 1 >= n.places) { n.status = "closed"; closeNeedApps(n); }
  notify(user, "agreement", "Sign your contribution agreement", n.title, "#agreement/" + id);
  notifyOrg(n.organisation_id, "agreement", "Sign your contribution agreement", n.title, "#agreement/" + id);
  return id;
}

// ---------- auth ----------
const listeners = [];
const emit = (event) => listeners.forEach((cb) => cb(event, session()));
const auth = {
  async getSession() { return { data: { session: session() }, error: null }; },
  onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
  async signUp({ email, password, options }) { D = load(); if (D.users.some((x) => x.email === email)) return { data: {}, error: { message: "User already registered" } }; const user = { id: uid(), email, password, user_metadata: options?.data || {} }; D.users.push(user); save(); return { data: { user, session: null }, error: null }; },
  async signInWithPassword({ email, password }) { D = load(); const user = D.users.find((x) => x.email === email && (x.password ? x.password === password : String(password).length > 0)); if (!user) return { data: {}, error: { message: "Invalid login credentials" } }; localStorage.setItem(SKEY, JSON.stringify({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } })); emit("SIGNED_IN"); return { data: { user, session: session() }, error: null }; },
  async signOut() { localStorage.removeItem(SKEY); emit("SIGNED_OUT"); return { error: null }; },
  async updateUser({ data, password }) { D = load(); const user = D.users.find((x) => x.id === me()); if (data) user.user_metadata = { ...user.user_metadata, ...data }; if (password) user.password = password; save(); localStorage.setItem(SKEY, JSON.stringify({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } })); return { data: { user }, error: null }; },
  async resetPasswordForEmail() { return { data: {}, error: null }; },
};

export function createClient() {
  return {
    auth,
    from: (t) => new Query(t),
    // Identity checks: the mock approves straight away, as if Didit had approved the document.
    functions: { async invoke(name, { body } = {}) {
      D = load(); const u = me(); const p = D.profiles.find((x) => x.user_id === u);
      if (name !== "id-verify" || !p) return { data: null, error: { message: "Create your professional profile first." } };
      if (body?.action === "start") { p.id_status = "started"; save(); return { data: { url: "#verify-done" }, error: null }; }
      if (body?.action === "check") { if (p.id_status === "started") { p.id_status = "approved"; p.id_verified_at = now(); p.id_document_name = p.name.toUpperCase(); save(); } return { data: { status: p.id_status }, error: null }; }
      return { data: null, error: { message: "Unknown action" } };
    } },
    // Storage: files kept as data URLs in localStorage, so photo uploads work offline.
    storage: { from: (bucket) => ({
      async upload(path, blob) { const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); localStorage.setItem(`ia-mock-file:${bucket}/${path}`, url); return { data: { path }, error: null }; },
      getPublicUrl(path) { return { data: { publicUrl: localStorage.getItem(`ia-mock-file:${bucket}/${path}`) || "" } }; },
      async remove(paths) { paths.forEach((p) => localStorage.removeItem(`ia-mock-file:${bucket}/${p}`)); return { data: [], error: null }; },
    }) },
    rpc: (fn, args = {}) => ({ then(res, rej) { return Promise.resolve().then(() => { try { D = load(); const data = rpcs[fn](args); save(); return { data: data ?? null, error: null }; } catch (e) { return { data: null, error: { message: e.message } }; } }).then(res, rej); } }),
  };
}
window.__iaMockReset = () => { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); };
