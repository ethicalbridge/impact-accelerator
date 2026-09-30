// Local QA only: an in-browser imitation of the Impact Accelerator database and its server functions.
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
    applications: [], invitations: [], conversations: [], messages: [], engagements: [], hours: [], reports: [], saved_needs: [], notifications: [],
  };
}
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
let D = load();
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
    case "needs": return (r.status !== "draft" && orgApproved(r.organisation_id)) || isMember(r.organisation_id) || admin;
    case "applications": case "invitations": return r.user_id === u || isMember(needOrg(r.need_id)) || admin;
    case "conversations": return r.user_id === u || isMember(needOrg(r.need_id)) || (admin && D.reports.some((x) => x.target_id === r.id));
    case "messages": { const c = D.conversations.find((x) => x.id === r.conversation_id); return c && visible("conversations", c); }
    case "engagements": return r.user_id === u || isMember(r.organisation_id) || admin;
    case "hours": { const e = D.engagements.find((x) => x.id === r.engagement_id); return r.user_id === u || (e && isMember(e.organisation_id)) || admin; }
    case "reports": return r.reporter_id === u || admin;
    case "saved_needs": case "notifications": return r.user_id === u;
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
  if (t === "profiles") {
    if (v.user_id !== u) fail("permission", "42501");
    if (v.published && !(v.age_confirmed && v.unpaid_confirmed)) fail("check", "23514");
    Object.assign(row, { review_status: v.published ? "pending" : "draft", updated_at: now() });
    delete row.id;
    if (v.published) notifyAdmins("profile_review", "Profile to review", v.name, "#admin");
  }
  if (t === "needs") {
    if (!isMember(v.organisation_id)) fail("new row violates row-level security policy", "42501");
    if (v.status !== "draft" && !orgApproved(v.organisation_id)) fail("new row violates row-level security policy", "42501");
    if (v.status !== "draft" && !v.no_vulnerable_contact) fail("check", "23514");
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
    if (r.status !== "draft" && v.status === "draft") fail("Close a published need instead of returning it to draft.");
    if (v.status === "open" && r.status !== "open" && D.needs.filter((n) => n.organisation_id === r.organisation_id && n.status === "open").length >= 3) fail("An organisation can have up to 3 open needs at a time. Close one first.");
    if ((v.status || r.status) !== "draft" && !(v.no_vulnerable_contact ?? r.no_vulnerable_contact)) fail("check", "23514");
    Object.assign(r, v, { updated_at: now() });
  } else if (t === "organisations") { if (!isMember(r.id)) fail("permission", "42501"); Object.assign(r, v); }
  else if (t === "notifications") { if (r.user_id !== u) fail("permission", "42501"); Object.assign(r, { read_at: v.read_at }); }
  else fail("permission denied", "42501");
}

// ---------- server functions ----------
const rpcs = {
  is_admin: () => D.admins.some((a) => a.user_id === me()),
  create_organisation: (a) => { if (!me()) fail("Please sign in first."); if (!a.p_locally_led) fail("Impact Accelerator is for locally led organisations."); const id = uid(); D.organisations.push({ id, name: a.p_name, country: a.p_country, city: a.p_city || "", website: a.p_website || "", summary: a.p_summary || "", org_type: a.p_org_type, locally_led_confirmed: true, status: "pending", created_at: now() }); D.organisation_members.push({ organisation_id: id, user_id: me(), role: "owner", full_name: a.p_full_name || "", created_at: now() }); notifyAdmins("org_review", "Organisation to review", a.p_name, "#admin"); return id; },
  admin_review_organisation: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); const o = D.organisations.find((x) => x.id === a.p_org); o.status = a.p_decision; if (a.p_decision === "approved") o.approved_at = now(); notifyOrg(o.id, "org_decision", a.p_decision === "approved" ? "Your organisation is approved" : "Please update your organisation details", a.p_note || "", "#org"); },
  admin_review_profile: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); const p = D.profiles.find((x) => x.user_id === a.p_user); p.review_status = a.p_decision; if (a.p_decision === "approved") p.approved_at = now(); notify(p.user_id, "profile_decision", a.p_decision === "approved" ? "Your profile is approved and public" : "Please update your profile", a.p_note || "", "#workspace"); },
  admin_update_report: (a) => { if (!rpcs.is_admin()) fail("Administrator access required."); Object.assign(D.reports.find((x) => x.id === a.p_id), { status: a.p_status }); },
  decide_application: (a) => { const x = D.applications.find((y) => y.id === a.p_id); if (!x || !isMember(needOrg(x.need_id))) fail("You cannot decide on this application."); if (x.status !== "pending") fail("This application has already been decided."); x.status = a.p_accept ? "accepted" : "declined"; if (a.p_accept) return engage(x.need_id, x.user_id); closeConv(x.need_id, x.user_id, "Application not selected"); notify(x.user_id, "application_decision", "Your application was not selected", "", "#workspace"); return null; },
  withdraw_application: (a) => { const x = D.applications.find((y) => y.id === a.p_id && y.user_id === me()); if (!x || x.status !== "pending") fail("Only a pending application can be withdrawn."); x.status = "withdrawn"; closeConv(x.need_id, x.user_id, "Application withdrawn"); },
  respond_invitation: (a) => { const x = D.invitations.find((y) => y.id === a.p_id && y.user_id === me()); if (!x || x.status !== "pending") fail("You have already responded."); x.status = a.p_accept ? "accepted" : "declined"; if (a.p_accept) return engage(x.need_id, x.user_id); closeConv(x.need_id, x.user_id, "Invitation declined"); return null; },
  sign_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || e.status !== "awaiting_signatures") fail("This agreement is no longer awaiting signatures."); if (!a.p_name || a.p_name.trim().length < 2) fail("Type your full name to sign."); if (e.user_id === me()) { if (e.talent_signed_at) fail("You have already signed."); Object.assign(e, { talent_signed_name: a.p_name, talent_signed_at: now() }); } else if (isMember(e.organisation_id)) { if (e.org_signed_at) fail("Your organisation has already signed."); Object.assign(e, { org_signed_name: a.p_name, org_signed_at: now() }); } else fail("You are not a party to this agreement."); if (e.talent_signed_at && e.org_signed_at) e.status = "active"; return e.status; },
  review_hours: (a) => { const h = D.hours.find((x) => x.id === a.p_id); const e = D.engagements.find((x) => x.id === h?.engagement_id); if (!h || !isMember(e.organisation_id) || h.user_id === me()) fail("You cannot review this entry."); if (h.status !== "pending") fail("This entry has already been reviewed."); if (!a.p_approve && (a.p_note || "").trim().length < 5) fail("Explain what needs to change."); Object.assign(h, { status: a.p_approve ? "approved" : "changes_requested", review_note: a.p_note || "" }); notify(h.user_id, "hours_review", a.p_approve ? "Hours approved" : "Changes requested on your hours", e.scope.need_title, "#workspace"); },
  complete_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || !isMember(e.organisation_id)) fail("You cannot complete this engagement."); if (e.status !== "active") fail("Only an active engagement can be completed."); if ((a.p_deliverables || "").trim().length < 10) fail("Describe what was delivered."); if ((a.p_endorsement || "").trim().length < 20) fail("Write an endorsement of at least 20 characters."); if (!(a.p_rating >= 1 && a.p_rating <= 5)) fail("Choose a private rating from 1 to 5."); if (D.hours.some((h) => h.engagement_id === e.id && h.status === "pending")) fail("Review all pending hours first."); Object.assign(e, { status: "completed", completed_at: now(), followup_due: new Date(Date.now() + 182 * 864e5).toISOString().slice(0, 10), deliverables: a.p_deliverables, endorsement: a.p_endorsement, endorsed_by_role: a.p_role, rating: a.p_rating }); closeConv(e.need_id, e.user_id, "Engagement completed"); notify(e.user_id, "completed", "Your contribution is complete and endorsed", e.scope.need_title, "#workspace"); },
  end_engagement: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); if (!e || !(e.user_id === me() || isMember(e.organisation_id))) fail("You are not a party to this engagement."); e.status = "ended"; closeConv(e.need_id, e.user_id, "Engagement ended"); },
  set_contribution_visibility: (a) => { const e = D.engagements.find((x) => x.id === a.p_id && x.user_id === me() && x.status === "completed"); if (!e) fail("Only your own completed contributions can be published."); e.public = a.p_public; },
  answer_followup: (a) => { const e = D.engagements.find((x) => x.id === a.p_id); Object.assign(e, { followup_in_use: a.p_in_use, followup_answered_at: now() }); },
  close_conversation: (a) => { const c = D.conversations.find((x) => x.id === a.p_id); if (!c || !visible("conversations", c)) fail("You are not part of this conversation."); Object.assign(c, { status: "closed", closed_reason: "Ended by a participant" }); },
  public_contributions: (a) => D.engagements.filter((e) => e.user_id === a.p_user && e.status === "completed" && ((e.public && profilePublic(a.p_user)) || e.user_id === me())).map((e) => ({ id: e.id, need_title: e.scope.need_title, organisation: e.scope.organisation, organisation_country: e.scope.organisation_country, need: e.scope.description, output: e.scope.output, skills: e.scope.skills, deliverables: e.deliverables, endorsement: e.endorsement, endorsed_by_role: e.endorsed_by_role, hours: D.hours.filter((h) => h.engagement_id === e.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0), started: e.created_at.slice(0, 10), completed: e.completed_at.slice(0, 10), still_in_use: e.followup_in_use ?? null, public: e.public })),
  delete_my_account: () => { const u = me(); D.engagements.filter((e) => e.user_id === u).forEach((e) => { e.scope.talent = "Former member"; e.user_id = null; e.public = false; }); D.messages = D.messages.filter((m) => m.sender_id !== u); for (const t of ["profiles", "applications", "invitations", "saved_needs", "notifications", "organisation_members"]) D[t] = D[t].filter((r) => r.user_id !== u); D.conversations = D.conversations.filter((c) => c.user_id !== u); D.users = D.users.filter((x) => x.id !== u); localStorage.removeItem(SKEY); },
};
function closeConv(need, user, reason) { const c = D.conversations.find((x) => x.need_id === need && x.user_id === user); if (c) Object.assign(c, { status: "closed", closed_reason: reason }); }
function engage(needId, user) {
  const n = D.needs.find((x) => x.id === needId), o = D.organisations.find((x) => x.id === n.organisation_id), p = D.profiles.find((x) => x.user_id === user);
  if (n.status !== "open") fail("This need is no longer open.");
  const filled = D.engagements.filter((e) => e.need_id === needId && e.status !== "ended").length;
  if (filled >= n.places) fail("All places on this need are already filled.");
  const id = uid();
  D.engagements.push({ id, need_id: needId, organisation_id: n.organisation_id, user_id: user, terms_version: "2026-10-v1", scope: { need_title: n.title, description: n.description, output: n.output, skills: n.skills, languages: n.languages, hours: n.hours, arrangement: n.arrangement, location: n.location, country: n.country, organisation: o.name, organisation_country: o.country, talent: p.name }, talent_signed_name: "", talent_signed_at: null, org_signed_name: "", org_signed_at: null, status: "awaiting_signatures", public: false, created_at: now() });
  if (filled + 1 >= n.places) n.status = "closed";
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
    rpc: (fn, args = {}) => ({ then(res, rej) { return Promise.resolve().then(() => { try { D = load(); const data = rpcs[fn](args); save(); return { data: data ?? null, error: null }; } catch (e) { return { data: null, error: { message: e.message } }; } }).then(res, rej); } }),
  };
}
window.__iaMockReset = () => { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); };
