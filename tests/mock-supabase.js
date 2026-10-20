// Local QA only: an in-browser imitation of the Handova database and its server functions.
// Never used in production builds. Seeded accounts: admin@example.test, org@example.test, talent@example.test (password: any 12+ characters).
// Mirrors the latest definitions in supabase/migrations (the newest file that defines a function wins).
const KEY = "ia-mock-db-v1", SKEY = "ia-mock-session-v1";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const now = () => new Date().toISOString();
const DAY = 864e5;
// current_date, in the browser's own time zone (the date the UI offers by default).
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
// True when the timestamp is more than `days` days in the past.
const ago = (t, days) => !!t && Date.parse(t) < Date.now() - days * DAY;
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
    needs: [{ id: NEED, organisation_id: ORG, title: "Create an accessible outcome report", description: "Help our team turn survey findings into an accessible report with a reusable template.", output: "A report template\nA short handover session", skills: ["Research", "Design"], languages: ["English", "Swahili"], hours: 8, arrangement: "Remote", location: "East Africa", country: "Kenya", deadline: null, places: 1, no_vulnerable_contact: true, status: "open", approved_at: now(), created_at: now(), updated_at: now() }],
    applications: [], invitations: [], conversations: [], messages: [], engagements: [], hours: [], reports: [], saved_needs: [], notifications: [], user_settings: [], agreement_signatures: [], app_settings: [{ key: "require_id_verification", value: "true" }], id_verifications: [],
    user_private: [], survey_responses: [], contribution_signatures: [], completion_private: [], admin_actions: [], organisation_changes: [], account_deletion_authorizations: [],
    terms_acceptances: [], client_errors: [],
  };
}
// Tables added after the first mock: older saved mock databases get them empty.
const LATER = ["need_safety_notes", "id_consents", "id_video_requests", "user_suspensions", "removed_identities", "report_cases", "user_settings", "user_private", "survey_responses", "agreement_signatures", "id_verifications", "contribution_signatures", "completion_private", "admin_actions", "account_deletion_authorizations", "organisation_changes", "terms_acceptances", "client_errors", "report_case_versions", "integrity_signal_checks", "org_member_invites"];
const load = () => { let d; try { d = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { d = seed(); } for (const t of LATER) d[t] ||= []; return d; };
let D = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(D));
const session = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } };
const me = () => session()?.user?.id || null;
const fail = (message, code) => { const e = new Error(message); e.code = code; throw e; };
const RLS = () => fail("new row violates row-level security policy", "42501");
const CHECK = (t) => fail(`new row for relation "${t}" violates check constraint`, "23514");
// "x is the signed-in user" (never true for a missing user, unlike x === me() when signed out).
const own = (x, u = me()) => u != null && x === u;
const isAdmin = (u = me()) => u != null && D.admins.some((a) => a.user_id === u);
const requireAdmin = () => { if (!isAdmin()) fail("Administrator access required."); };
const isMember = (org, u = me()) => u != null && D.organisation_members.some((m) => m.organisation_id === org && m.user_id === u);
// is_suspended / suspension_guard (20261020021003, 20261020120300): an active suspension or removal blocks acting.
const isSuspended = (u) => u != null && D.user_suspensions.some((s) => s.user_id === u && !s.lifted_at);
const SUSPENDED = "Your account is suspended while Handova looks into a concern. Write to safeguarding@handova.org if you have questions.";
const suspensionGuard = () => { const u = me(); if (u && !isAdmin(u) && isSuspended(u)) fail(SUSPENDED); };
// current_policy_version / record_agreement_terms (20261020120200): the current Terms and privacy notice.
const TERMS = "terms-2026-10-20-2", PRIVACY = "privacy-2026-10-20-2";
const CURRENT_AGREEMENT = { professional: "professional-2026-10-20-v3", organisation: "organisation-2026-10-20-v3" };
const acceptTerms = (user_id, terms_version, privacy_version, source, extra = {}) => {
  if (!user_id || !terms_version || D.terms_acceptances.some((t) => t.user_id === user_id && t.terms_version === terms_version && t.privacy_version === privacy_version)) return;
  D.terms_acceptances.push({ id: uid(), user_id, terms_version, privacy_version, accepted_at: now(), source, adult_confirmed: null, account_closed_at: null, ...extra });
};
const agreementTerms = (sig) => { if (sig.version === CURRENT_AGREEMENT[sig.kind]) acceptTerms(sig.user_id, TERMS, PRIVACY, "agreement " + sig.version); };
// An open report about something (status open or reviewing).
const openReport = (f) => D.reports.some((r) => r.status !== "resolved" && f(r));
// The owner, or any member when nobody is the owner (20261020123000_org_team.sql, is_org_owner).
const orgOwner = (org, u = me()) => isMember(org, u) && (D.organisation_members.some((m) => m.organisation_id === org && m.user_id === u && m.role === "owner") || !D.organisation_members.some((m) => m.organisation_id === org && m.role === "owner"));
// need_safety_guard (20261020100000): every safety question answered before a need goes for review.
const safetyCheck = (sg = {}) => {
  if (["remote", "no_contact", "no_child_images", "no_money"].some((k) => sg[k] !== "yes")) fail("Confirm the safety questions before sending the need for review: all work is remote, no contact with the people you serve, no images of children, and no handling of your money.");
  if (!["none", "exception"].includes(sg.personal_data) || ["leak_risk", "distressing", "regulated"].some((k) => !["no", "yes"].includes(sg[k]))) fail("Answer every safety question before sending the need for review.");
};
const needOrg = (n) => D.needs.find((x) => x.id === n)?.organisation_id;
const isParty = (c) => !!c && (own(c.user_id) || isMember(needOrg(c.need_id)));
const notify = (user, kind, title, body = "", link = "", ref = null) => user && D.notifications.push({ id: uid(), user_id: user, kind, title, body, link, ref, read_at: null, created_at: now() });
const notifyOrg = (org, ...a) => D.organisation_members.filter((m) => m.organisation_id === org).forEach((m) => notify(m.user_id, ...a));
const notifyAdmins = (...a) => D.admins.forEach((x) => notify(x.user_id, ...a));
const adminAction = (action, target_type, target_id, detail = {}) => D.admin_actions.push({ id: uid(), admin_id: me(), action, target_type, target_id, detail, created_at: now() });
const profilePublic = (u) => D.profiles.some((p) => p.user_id === u && p.published && p.review_status === "approved");
const orgApproved = (o) => D.organisations.some((x) => x.id === o && x.status === "approved");
const orgBlocked = (o) => D.organisations.some((x) => x.id === o && ["suspended", "rejected"].includes(x.status));
const idRequired = () => D.app_settings.some((s) => s.key === "require_id_verification" && s.value === "true");
const trimmed = (v) => String(v ?? "").trim();
const orNull = (v) => trimmed(v) || null;
// 'DD Mon YYYY HH24:MI' in UTC, as the notifications print it.
const utcStamp = (d = new Date()) => `${String(d.getUTCDate()).padStart(2, "0")} ${"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

// SHA-256 of a UTF-8 string as hex, like encode(sha256(convert_to(text, 'UTF8')), 'hex').
function sha256(text) {
  const K = [], H = [], prime = (n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  for (let n = 2, i = 0; i < 64; n++) if (prime(n)) { if (i < 8) H[i] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0; K[i++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0; }
  const bytes = Array.from(new TextEncoder().encode(text)), bits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? Math.floor(bits / 2 ** (i * 8)) & 255 : (bits >>> (i * 8)) & 255);
  const h = H.slice(), w = new Array(64), rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) w[i] = (w[i - 16] + (rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3)) + w[i - 7] + (rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10))) | 0;
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, k].forEach((x, i) => (h[i] = (h[i] + x) | 0));
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

// ---------- contribution helpers (hours_ready_at, endorsement_due_since, endorsement_overdue) ----------
const hoursOf = (e, st) => D.hours.filter((h) => h.engagement_id === e.id && h.status === st);
const approvedHours = (e) => hoursOf(e, "approved").reduce((t, h) => t + Number(h.hours), 0);
function hoursReadyAt(e) {
  const ok = hoursOf(e, "approved"), planned = Number(e.scope?.hours) || 0;
  if (!planned || !ok.length || hoursOf(e, "pending").length || approvedHours(e) < planned) return null;
  return ok.map((h) => h.reviewed_at || h.created_at).sort().pop();
}
const endorsementDueSince = (e) => (e.status === "active" ? [e.talent_delivered_at, hoursReadyAt(e)].filter(Boolean).sort()[0] || null : null);
const endorsementOverdue = (org) => D.engagements.some((e) => e.organisation_id === org && e.status === "active" && ago(endorsementDueSince(e), 14));
// Admins can read a conversation once it, or the contribution it belongs to, is reported.
const conversationReported = (c) => D.reports.some((r) => (r.target_type === "conversation" && r.target_id === c.id) || (r.target_type === "contribution" && D.engagements.some((e) => e.id === r.target_id && e.need_id === c.need_id && e.user_id != null && e.user_id === c.user_id)));

// ---------- visibility, loosely mirroring the database rules ----------
function visible(table, r) {
  const u = me(), admin = isAdmin(u);
  switch (table) {
    case "profiles": return (r.published && r.review_status === "approved") || own(r.user_id) || admin || D.applications.some((a) => a.user_id === r.user_id && isMember(needOrg(a.need_id))) || D.engagements.some((e) => e.user_id === r.user_id && isMember(e.organisation_id));
    case "organisations": return r.status === "approved" || isMember(r.id) || admin;
    case "needs": return (["open", "closed"].includes(r.status) && orgApproved(r.organisation_id)) || isMember(r.organisation_id) || admin;
    case "applications": case "invitations": return own(r.user_id) || isMember(needOrg(r.need_id)) || admin;
    case "conversations": return isParty(r) || (admin && conversationReported(r));
    case "messages": { const c = D.conversations.find((x) => x.id === r.conversation_id); return !!c && visible("conversations", c); }
    case "engagements": return own(r.user_id) || isMember(r.organisation_id) || admin;
    case "hours": { const e = D.engagements.find((x) => x.id === r.engagement_id); return own(r.user_id) || (e && isMember(e.organisation_id)) || admin; }
    case "reports": return own(r.reporter_id) || admin;
    case "saved_needs": case "notifications": case "user_settings": case "user_private": return own(r.user_id) || (table === "user_private" && admin);
    case "agreement_signatures": case "id_verifications": return own(r.user_id) || admin;
    case "contribution_signatures": return own(r.user_id) || isMember(r.organisation_id) || admin || D.engagements.some((e) => e.id === r.engagement_id && own(e.user_id));
    case "completion_private": case "admin_actions": case "survey_responses": return admin;
    case "app_settings": return true;
    case "organisation_changes": return isMember(r.organisation_id) || admin;
    // 20261020100000_policy_safety_tools.sql
    case "need_safety_notes": return admin || isMember(needOrg(r.need_id));
    case "id_consents": case "id_video_requests": case "user_suspensions": return own(r.user_id) || admin;
    case "removed_identities": case "report_cases": return admin;
    // 20261020120200, 20261020120500
    case "terms_acceptances": return own(r.user_id) || admin;
    case "client_errors": return admin;
    case "organisation_members": return own(r.user_id) || isMember(r.organisation_id) || admin;
    // 20261020123000_org_team.sql
    case "org_member_invites": return isMember(r.organisation_id) || admin;
    default: return ["report_case_versions", "integrity_signal_checks", "client_errors"].includes(table) ? admin : false;
  }
}
const STRICT_COLUMNS = new Set(["user_suspensions"]);
// Column grants: signers see each other's name, role, focal point and version, not email, IP or browser.
// 20261020120000: a suspended person reads their own suspension, not the reason Handova wrote (admins read it in admin_actions).
const GRANTED = { user_suspensions: ["user_id", "removed", "suspended_at", "lifted_at"], contribution_signatures: ["id", "engagement_id", "organisation_id", "party", "full_name", "signer_role", "focal_point_name", "focal_point_contact", "version", "text_sha256", "language", "signed_at"] };

// ---------- select parsing and embedding ----------
function splitTop(s) { const out = []; let depth = 0, cur = ""; for (const ch of s) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
const FK = { organisations: ["organisation_id", "id"], profiles: ["user_id", "user_id"], needs: ["need_id", "id"] };
function shape(table, row, cols) {
  if (GRANTED[table]) row = Object.fromEntries(GRANTED[table].map((k) => [k, row[k]]));
  if (!cols || cols === "*") return { ...row };
  const out = {};
  for (const part of splitTop(cols)) {
    const m = part.match(/^(?:(\w+):)?(\w+)\((.*)\)$/s);
    if (m) {
      const [, alias, t, inner] = m;
      const [local, remote] = FK[t];
      const target = row[local] == null ? null : D[t].find((x) => x[remote] === row[local] && visible(t, x));
      out[alias || t] = target ? shape(t, target, inner) : null;
    } else if (part === "*") Object.assign(out, row);
    else out[part] = row[part];
  }
  return out;
}

// Range filters: numbers as numbers, dates and text as strings (ISO timestamps sort correctly as text). null never matches, as in SQL.
const numeric = (x) => typeof x === "number" || (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x)) && !/^\d{4}-\d{2}-\d{2}/.test(x));
function compare(a, b) {
  if (a == null || b == null) return NaN;
  if (numeric(a) && numeric(b)) return Number(a) - Number(b);
  const x = String(a), y = String(b);
  return x > y ? 1 : x < y ? -1 : 0;
}

class Query {
  constructor(t) { this.t = t; this.f = []; this.op = "select"; this.cols = "*"; }
  select(cols = "*", opts = {}) { if (this.op === "select") this.op = "select"; this.cols = cols; this.opts = opts; this.returning = true; return this; }
  insert(v) { this.op = "insert"; this.val = v; return this; }
  update(v) { this.op = "update"; this.val = v; return this; }
  upsert(v) { this.op = "upsert"; this.val = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k, v) { this.f.push((r) => String(r[k]) === String(v)); return this; }
  neq(k, v) { this.f.push((r) => String(r[k]) !== String(v)); return this; }
  in(k, arr) { this.f.push((r) => arr.map(String).includes(String(r[k]))); return this; }
  is(k, v) { this.f.push((r) => (v === null ? r[k] == null : r[k] === v)); return this; }
  gt(k, v) { this.f.push((r) => compare(r[k], v) > 0); return this; }
  gte(k, v) { this.f.push((r) => compare(r[k], v) >= 0); return this; }
  lt(k, v) { this.f.push((r) => compare(r[k], v) < 0); return this; }
  lte(k, v) { this.f.push((r) => compare(r[k], v) <= 0); return this; }
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
      // Column grants that make a select of other columns (or *) fail, as in the database.
      if (STRICT_COLUMNS.has(this.t) && this.returning && (this.cols === "*" || splitTop(this.cols).some((c) => !GRANTED[this.t].includes(c)))) fail(`permission denied for table ${this.t}`, "42501");
      let data;
      if (this.op === "insert") data = (Array.isArray(this.val) ? this.val : [this.val]).map((v) => insertRow(this.t, { ...v }));
      else if (this.op === "upsert") {
        const pk = { need_safety_notes: "need_id", report_cases: "report_id", user_settings: "user_id", user_private: "user_id" }[this.t] || "id";
        if (this.t === "need_safety_notes") suspensionGuard();
        data = (Array.isArray(this.val) ? this.val : [this.val]).map((v) => { const ex = rows.find((r) => String(r[pk]) === String(v[pk]) && visible(this.t, r)); if (ex) { Object.assign(ex, v); return ex; } return insertRow(this.t, { ...v }); });
      }
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

const REPORT_TYPES = ["profile", "need", "organisation", "conversation", "contribution", "other"];
const REPORT_REASONS = ["safety", "exploitation", "harassment", "fraud", "misleading", "privacy", "spam", "other"];
function insertRow(t, v) {
  const u = me();
  if (!u) fail("Please sign in.", "42501");
  const row = { id: uid(), created_at: now(), ...v };
  if (t === "user_settings") { if (v.user_id && v.user_id !== u) RLS(); row.user_id = u; delete row.id; }
  if (t === "id_consents") row.user_id = u;
  if (["messages", "applications", "invitations", "hours", "needs", "need_safety_notes"].includes(t)) suspensionGuard();
  if (["terms_acceptances", "client_errors", "user_suspensions", "removed_identities", "id_video_requests"].includes(t)) fail(`permission denied for table ${t}`, "42501");
  if (t === "id_consents") { row.user_id = u; if (localStorage.getItem("mock-fail-consent")) fail("permission denied for table id_consents", "42501"); }
  if (["need_safety_notes", "report_cases"].includes(t)) delete row.id;
  if (t === "profiles") {
    if (v.user_id !== u) fail("permission", "42501");
    if (v.published && !(v.age_confirmed && v.unpaid_confirmed)) fail("check", "23514");
    if (v.published && isSuspended(u) && !isAdmin(u)) fail("Your account is suspended while Handova looks into a concern, so your profile can’t be published. Write to safeguarding@handova.org if you have questions.");
    Object.assign(row, { review_status: v.published ? "pending" : "draft", updated_at: now() });
    delete row.id;
    if (v.published) notifyAdmins("profile_review", "Profile to review", v.name, "#admin");
  }
  if (t === "needs") {
    if (!isMember(v.organisation_id)) RLS();
    if (!["draft", "pending"].includes(v.status) && !orgApproved(v.organisation_id)) RLS();
    // need_guard
    if (v.status === "closed" && !isAdmin()) fail("Only a need Handova has approved can be closed. Send it for review first.");
    if (v.status === "open") fail("Send your need for review. Handova checks every need and opens it once it is approved.");
    if (!v.no_vulnerable_contact) fail("check", "23514");
    if (v.status === "pending" && !isAdmin()) safetyCheck(v.safeguarding);
    if (v.status === "pending" && !isAdmin() && orgBlocked(v.organisation_id)) fail("Your organisation can’t send needs for review at the moment. Write to hello@handova.org if you have questions.");
    if (v.status === "pending" && !isAdmin() && endorsementOverdue(v.organisation_id)) fail("A finished contribution has been waiting for your endorsement for more than 14 days. Finish and endorse it first, then you can send new needs for review.");
    if (v.status === "pending" && needsInUse(v.organisation_id, null, true) >= 3) fail("You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.");
    if (v.status === "pending") { row.review_note = null; notifyAdmins("need_submitted", "A need is waiting for review", v.title, "#admin"); }
    row.updated_at = now();
  }
  if (t === "applications" || t === "invitations") {
    const n = D.needs.find((x) => x.id === v.need_id);
    if (!n || n.status !== "open") RLS();
    if (t === "applications" && (v.user_id !== u || !profilePublic(u))) RLS();
    if (t === "invitations" && (!isMember(n.organisation_id) || !profilePublic(v.user_id))) RLS();
    if (D[t].some((x) => x.need_id === v.need_id && x.user_id === v.user_id)) fail("duplicate", "23505");
    Object.assign(row, { status: "pending", decided_at: null });
    conversationFor(v.need_id, v.user_id);
    if (t === "applications") notifyOrg(n.organisation_id, "application", "New application", n.title, "#org"); else notify(v.user_id, "invitation", "You have been invited to a need", n.title, "#workspace");
    // conflict_notify (20261020120100): a declared link reaches Handova.
    const note = trimmed(v.conflict_note);
    if (note) notifyAdmins("conflict_declared", "Declared link: " + n.title, `${t === "applications" ? "Application from " : "Invitation to "}${D.profiles.find((p) => p.user_id === v.user_id)?.name || "a professional"}: ${note.slice(0, 500)}`, "#admin");
  }
  if (t === "messages") {
    const c = D.conversations.find((x) => x.id === v.conversation_id);
    if (!c || c.status !== "open" || !isParty(c) || v.sender_id !== u) RLS();
    const body = trimmed(v.body);
    if (!body || body.length > 4000) CHECK("messages");
    // Column grants: members insert only conversation_id, sender_id and body; Handova's own messages come from server functions.
    if (Object.keys(v).some((k) => !["conversation_id", "sender_id", "body"].includes(k))) fail("permission denied for table messages", "42501");
    Object.assign(row, { kind: "user", sender_closed_at: null });
    messageNotify(row, c);
  }
  if (t === "hours") {
    // hours_notify (before insert): at most 12 hours a day across all contributions.
    const hrs = Number(v.hours);
    if (D.hours.filter((h) => h.user_id === v.user_id && h.work_date === v.work_date && h.status !== "changes_requested").reduce((s, h) => s + Number(h.hours), 0) + hrs > 12) fail("You can log up to 12 hours in one day.");
    const e = D.engagements.find((x) => x.id === v.engagement_id);
    if (!e || !own(e.user_id) || v.user_id !== u || e.status !== "active") RLS();
    const desc = trimmed(v.description);
    if (!(hrs > 0 && hrs <= 12) || !v.work_date || v.work_date > today() || desc.length < 10 || desc.length > 2000 || (v.evidence && !/^https:\/\//.test(v.evidence))) CHECK("hours");
    Object.assign(row, { evidence: v.evidence || "", status: "pending", review_note: "", reviewed_by: null, reviewed_at: null });
    notifyOrg(e.organisation_id, "hours", "Hours to review", e.scope.need_title, "#org");
  }
  if (t === "reports") {
    Object.assign(row, { reporter_id: u, status: "open", admin_note: "", resolved_at: null, source: "platform", source_ref: null, reporter_name: "", reporter_email: "", outcome_message: "", outcome_sent_at: null });
    if (v.target_type === "conversation" && !isParty(D.conversations.find((c) => c.id === v.target_id))) RLS();
    if (D.reports.filter((r) => r.reporter_id === u && !ago(r.created_at, 1)).length >= 10) RLS();
    const details = trimmed(v.details);
    if (!REPORT_TYPES.includes(v.target_type) || !REPORT_REASONS.includes(v.reason) || details.length < 10 || details.length > 4000) CHECK("reports");
    notifyAdmins("report", v.reason === "exploitation" ? "Urgent: sexual exploitation or abuse reported" : v.reason === "safety" ? "Urgent: safety or safeguarding concern reported" : "New concern reported", `${v.reason} · ${v.target_type}`, "#admin");
    notify(u, "report_received", "We received your report", `Thank you. Our safeguarding lead reads every report and will contact you if we need more information. Reference ${String(row.id).slice(0, 8).toUpperCase()}.`, "#report");
  }
  if (t === "saved_needs") delete row.id;
  D[t].push(row);
  return row;
}
const LIVE_FIELDS = ["title", "description", "output", "skills", "languages", "hours", "location", "country", "deadline", "places", "arrangement"];
function updateRow(t, r, v) {
  const u = me();
  if (t === "profiles") {
    if (r.user_id !== u) fail("permission", "42501");
    if ("review_status" in v) fail("permission denied", "42501");
    const was = r.published;
    if (v.published && !was && isSuspended(r.user_id) && !isAdmin()) fail("Your account is suspended while Handova looks into a concern, so your profile can’t be published. Write to safeguarding@handova.org if you have questions.");
    Object.assign(r, v, { updated_at: now() });
    if (r.published && !(r.age_confirmed && r.unpaid_confirmed)) fail("check", "23514");
    if (r.published && !was && ["draft", "changes_requested"].includes(r.review_status)) { r.review_status = "pending"; notifyAdmins("profile_review", "Profile to review", r.name, "#admin"); }
    // 20261019001100: the owner saves after Handova asked for changes, so it goes back into review.
    else if (r.published && was && r.review_status === "changes_requested" && own(r.user_id)) { r.review_status = "pending"; notifyAdmins("profile_review", "Profile updated after your request", r.name, "#admin"); }
  } else if (t === "needs") {
    // needs_update policy, then need_guard (20261019000500_audit_fixes.sql)
    const adm = isAdmin(), org = r.organisation_id;
    if (!isMember(org)) fail("permission", "42501");
    suspensionGuard();
    if (["open", "closed"].includes(r.status) && ["draft", "pending"].includes(v.status)) fail("Close a published need instead of returning it to draft.");
    if (!adm && v.status === "closed" && ["draft", "pending"].includes(r.status)) fail("Only a need Handova has approved can be closed. Send it for review first.");
    if (v.status === "open" && r.status !== "open") {
      if (!adm && !(r.status === "closed" && r.approved_at)) fail("Send your need for review. Handova checks every need and opens it once it is approved.");
      if (!adm && endorsementOverdue(org)) fail("A finished contribution has been waiting for your endorsement for more than 14 days. Finish and endorse it first.");
      if (!orgApproved(org)) fail("The organisation must be approved before its needs can open.");
      if (needsInUse(org, r.id, false) >= 3) fail("An organisation can have up to 3 needs open or in progress at a time. Finish or close one first.");
      const deadline = "deadline" in v ? v.deadline : r.deadline;
      if (deadline && deadline < today()) fail("Choose a deadline in the future.");
      v = { ...v, approved_at: r.approved_at || now(), review_note: null };
    }
    if (v.status === "pending" && r.status !== "pending") {
      if (!adm) safetyCheck(v.safeguarding ?? r.safeguarding);
      if (!adm && orgBlocked(org)) fail("Your organisation can’t send needs for review at the moment. Write to hello@handova.org if you have questions.");
      if (!adm && endorsementOverdue(org)) fail("A finished contribution has been waiting for your endorsement for more than 14 days. Finish and endorse it first, then you can send new needs for review.");
      if (needsInUse(org, r.id, true) >= 3) fail("You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.");
      v = { ...v, review_note: null };
    }
    if (!adm && ["open", "closed"].includes(r.status) && LIVE_FIELDS.some((k) => k in v && JSON.stringify(v[k]) !== JSON.stringify(r[k]))) fail("A live need can’t be edited. Stop applications and send a corrected copy for review.");
    if ((v.status || r.status) !== "draft" && !(v.no_vulnerable_contact ?? r.no_vulnerable_contact)) fail("check", "23514");
    if (!["draft", "pending"].includes(v.status ?? r.status) && !orgApproved(org)) RLS();
    if (v.status === "pending" && r.status !== "pending") notifyAdmins("need_submitted", "A need is waiting for review", v.title ?? r.title, "#admin");
    const closing = v.status === "closed" && r.status === "open";
    Object.assign(r, v, { updated_at: now() });
    if (closing) closeNeedApps(r);
  } else if (t === "organisations") {
    if (!isMember(r.id)) fail("permission", "42501");
    const old = { ...r };
    Object.assign(r, v);
    // org_change_guard (20261020004604): changes to an approved organisation's public details wait for Handova.
    const KEYS = ["name", "country", "city", "website", "summary", "org_type", "ethical_bridge_url", "logo_url"];
    if (old.status === "approved" && !isAdmin()) {
      const diff = Object.fromEntries(KEYS.filter((k) => JSON.stringify(r[k] ?? null) !== JSON.stringify(old[k] ?? null)).map((k) => [k, r[k] ?? null]));
      if (Object.keys(diff).length) {
        KEYS.forEach((k) => { r[k] = old[k]; });
        const row = D.organisation_changes.find((x) => x.organisation_id === r.id);
        if (row) Object.assign(row, { changes: { ...row.changes, ...diff }, updated_at: now() }); else D.organisation_changes.push({ organisation_id: r.id, changes: diff, since: now(), updated_at: now() });
        notifyAdmins("org_changed", "Organisation changes to review", old.name, "#admin");
      }
    }
    if (old.status === "changes_requested" && r.status === "changes_requested" && !isAdmin()) { r.status = "pending"; notifyAdmins("org_review", "Organisation updated and ready for review", r.name, "#admin"); }
  }
  else if (t === "notifications") { if (r.user_id !== u) fail("permission", "42501"); Object.assign(r, { read_at: v.read_at }); }
  else fail("permission denied", "42501");
}

// ---------- server functions ----------
const rpcs = {
  // 20261020122000_public_reports: a report from someone without an account (rate limit: 3 an hour in this browser).
  submit_public_report({ p_reason, p_details, p_email = "" }) {
    const d = trimmed(p_details), em = trimmed(p_email).toLowerCase();
    if (!REPORT_REASONS.includes(p_reason)) fail("Choose what the concern is about.", "22023");
    if (d.length < 10 || d.length > 4000) fail("Describe what happened in 10 to 4,000 characters.", "22023");
    if (em && (em.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))) fail("Check the email address, or leave it empty.", "22023");
    D.public_report_throttle = (D.public_report_throttle || []).filter((t) => !ago(t.created_at, 1));
    if (D.public_report_throttle.filter((t) => Date.parse(t.created_at) > Date.now() - 36e5).length >= 3) fail("Too many reports have been sent from here. Please try again later, or write to safeguarding@handova.org.", "P0001");
    D.public_report_throttle.push({ created_at: now() });
    const row = { id: uid(), reporter_id: me(), target_type: "other", target_id: null, reason: p_reason, details: d, source: "public", source_ref: null, reporter_name: "", reporter_email: em, outcome_message: "", outcome_sent_at: null, status: "open", admin_note: "", resolved_at: null, created_at: now() };
    D.reports.push(row);
    notifyAdmins("report", p_reason === "exploitation" ? "Urgent: sexual exploitation or abuse reported" : "New concern reported", `${p_reason} · other`, "#admin");
    return String(row.id).slice(0, 8).toUpperCase();
  },
  // Browser error counter (W8): the real function stores the message, page and version; here it is a no-op.
  log_client_error() { return null; },
  sign_org_agreement({ p_version, p_name, p_role, p_text }) {
    if (!me()) throw Error("Please sign in first.");
    if (String(p_name || "").trim().length < 2) throw Error("Type your full name to sign.");
    if (String(p_role || "").trim().length < 2) throw Error("Add your role in the organisation.");
    D.agreement_signatures = D.agreement_signatures || [];
    const row = { id: uid(), user_id: me(), kind: "organisation", version: p_version, full_name: p_name.trim(), signer_role: p_role.trim(), agreement_text: p_text, signed_at: now(), organisation_id: null };
    D.agreement_signatures.push(row); agreementTerms(row); return row.id;
  },
  sign_agreement({ p_kind, p_version, p_name, p_text, p_hours }) {
    if (!me()) throw Error("Please sign in first.");
    if (String(p_name || "").trim().length < 2) throw Error("Type your full name to sign.");
    if (String(p_text || "").length < 500) throw Error("The agreement text is missing.");
    D.agreement_signatures = D.agreement_signatures || [];
    const row = { id: uid(), user_id: me(), kind: p_kind, version: p_version, full_name: p_name.trim(), hours_committed: p_hours, agreement_text: p_text, signed_at: now() };
    D.agreement_signatures.push(row); agreementTerms(row); return row.id;
  },
  // agreements v3 (20261020…_agreements_v3): organisations sign a new organisation agreement version from the workspace.
  org_agreement_current: (a) => { if (!isMember(a.p_org) && !isAdmin()) return null; return (D.agreement_signatures || []).some((s) => s.organisation_id === a.p_org && s.kind === "organisation" && s.version === "organisation-2026-10-20-v3"); },
  resign_org_agreement({ p_org, p_version, p_name, p_role, p_text }) {
    if (!me()) throw Error("Please sign in first.");
    if (!isMember(p_org)) throw Error("Only a member of the organisation can sign for it.");
    if (String(p_name || "").trim().length < 2) throw Error("Type your full name to sign.");
    if (String(p_role || "").trim().length < 2) throw Error("Add your role in the organisation.");
    const row = { id: uid(), user_id: me(), kind: "organisation", version: p_version, full_name: p_name.trim(), signer_role: p_role.trim(), agreement_text: p_text, signed_at: now(), organisation_id: p_org };
    D.agreement_signatures.push(row); agreementTerms(row); return row.id;
  },
  is_admin: () => isAdmin(),
  // The organisation agreement just signed is linked to the new organisation (20261019000800).
  create_organisation: (a) => {
    const u = me();
    if (!u) fail("Please sign in first.");
    if (!a.p_locally_led) fail("Handova is for locally led organisations.");
    if (D.organisation_members.filter((m) => m.user_id === u).length >= 3) fail("You can manage up to three organisations.");
    const sig = D.agreement_signatures.filter((s) => s.user_id === u && s.kind === "organisation" && !s.organisation_id).sort((x, y) => (x.signed_at < y.signed_at ? 1 : -1))[0];
    if (!sig) fail("Please read and sign the Handova organisation agreement first.");
    const id = uid();
    D.organisations.push({ id, name: trimmed(a.p_name), country: trimmed(a.p_country), city: trimmed(a.p_city), website: trimmed(a.p_website), summary: trimmed(a.p_summary), org_type: trimmed(a.p_org_type) || "Community organisation", locally_led_confirmed: true, status: "pending", created_at: now() });
    sig.organisation_id = id;
    D.organisation_members.push({ organisation_id: id, user_id: u, role: "owner", full_name: trimmed(a.p_full_name), created_at: now() });
    notifyAdmins("org_review", "Organisation to review", trimmed(a.p_name), "#admin");
    return id;
  },
  // Suspending or rejecting also stops its open needs; applicants and invitees are told (20261019000200).
  admin_review_organisation: (a) => {
    requireAdmin();
    const d = a.p_decision;
    if (!["pending", "approved", "changes_requested", "rejected", "suspended"].includes(d)) fail(`invalid input value for enum org_status: "${d}"`, "22P02");
    const o = D.organisations.find((x) => x.id === a.p_org);
    if (!o) fail("Organisation not found.");
    const note = orNull(a.p_note);
    if (d === "suspended" && o.status !== "suspended") o.suspended_at = now(); else if (d !== "suspended") o.suspended_at = null;
    o.status = d;
    if (d === "approved") o.approved_at ||= now();
    if (["suspended", "rejected"].includes(d)) D.needs.filter((n) => n.organisation_id === o.id && n.status === "open").forEach(closeNeed);
    if (d === "approved") notifyOrg(o.id, "org_decision", "Your organisation is approved", "You can now post your first need: one piece of work, up to 16 hours, with a clear output. Handova checks each need before it goes live, usually within two working days." + (D.needs.some((x) => x.organisation_id === o.id && x.status === "pending") ? " The needs you already sent are being checked now." : "") + (note ? " Note from Handova: " + note : ""), "#org/need");
    else notifyOrg(o.id, "org_decision", { changes_requested: "Please update your organisation details", rejected: "Your organisation was not approved", suspended: "Your organisation is suspended on Handova" }[d] || "Your organisation status changed", note || "", "#org");
    adminAction("org_" + d, "organisation", o.id, { name: o.name, note: a.p_note || "" });
  },
  admin_review_profile: (a) => {
    requireAdmin();
    if (!["approved", "changes_requested", "rejected"].includes(a.p_decision)) fail("Choose approve, request changes or reject.");
    const p = D.profiles.find((x) => x.user_id === a.p_user);
    if (!p) fail("Profile not found.");
    p.review_status = a.p_decision; if (a.p_decision === "approved") p.approved_at ||= now();
    notify(p.user_id, "profile_decision", { approved: "Your profile is approved and public", changes_requested: "Please update your profile" }[a.p_decision] || "Your profile was not approved", a.p_note || "", "#workspace");
  },
  admin_confirm_identity: (a) => {
    requireAdmin();
    const p = D.profiles.find((x) => x.user_id === a.p_user);
    if (p) Object.assign(p, { id_status: a.p_approve ? "approved" : "declined", id_verified_at: a.p_approve ? now() : null, updated_at: now() });
    notify(a.p_user, "id_check", a.p_approve ? "Your identity is verified" : "We could not confirm your identity", a.p_approve ? "Thank you. Your profile now shows ID verified." : "Please try the identity check again, or write to hello@handova.org.", "#workspace/profile");
  },
  admin_review_need: (a) => {
    requireAdmin();
    const n = D.needs.find((x) => x.id === a.p_need);
    if (!n) fail("Need not found.");
    if (n.status !== "pending") fail("This need is not waiting for review.");
    if (a.p_decision === "approved") {
      if (!orgApproved(n.organisation_id)) fail("Approve the organisation first. The need stays pending until then.");
      if (needsInUse(n.organisation_id, n.id, false) >= 3) fail("An organisation can have up to 3 needs open or in progress at a time. Finish or close one first.");
      if (n.deadline && n.deadline < today()) fail("Choose a deadline in the future.");
      Object.assign(n, { status: "open", approved_at: n.approved_at || now(), review_note: null, updated_at: now() });
      notifyOrg(n.organisation_id, "need_decision", "Your need is live", orNull(a.p_note) || n.title, "#org/needs/" + n.id);
    } else if (a.p_decision === "changes_requested") {
      const note = trimmed(a.p_note);
      if (!note) fail("Write a note so the organisation knows what to change.");
      Object.assign(n, { status: "draft", review_note: note, updated_at: now() });
      notifyOrg(n.organisation_id, "need_decision", "Please update your need", note, "#org/needs/" + n.id);
    } else fail("Choose approve or ask for changes.");
  },
  record_first_call: (a) => {
    const u = me(), x = D.engagements.find((y) => y.id === a.p_id);
    if (!x || !(own(x.user_id) || isMember(x.organisation_id))) fail("You are not a party to this contribution.");
    if (x.status !== "active") fail("You can record the first call once both have signed.");
    const summary = trimmed(a.p_summary);
    if (summary.length < 10) fail("Add a short summary of what you agreed.");
    postMessage(conversationFor(x.need_id, x.user_id), u, summary.slice(0, 4000), "user");
    Object.assign(x, { first_call_at: a.p_date ? `${a.p_date}T00:00:00.000Z` : now(), first_call_by: u, first_call_written: !!a.p_written });
  },
  admin_update_report: (a) => {
    requireAdmin();
    if (!["open", "reviewing", "resolved"].includes(a.p_status)) CHECK("reports");
    const r = D.reports.find((x) => x.id === a.p_id);
    if (!r) fail("Report not found.");
    // 20261020120100: the note lives in the admin-only case record; the reporter's row keeps admin_note empty.
    const note = trimmed(a.p_note).slice(0, 2000);
    if (note) { let c = D.report_cases.find((x) => x.report_id === r.id); if (!c) D.report_cases.push(c = { report_id: r.id }); Object.assign(c, { admin_note: note, updated_at: now(), updated_by: me() }); }
    Object.assign(r, { status: a.p_status, admin_note: "", resolved_at: a.p_status === "resolved" ? now() : null });
  },
  decide_application: (a) => {
    suspensionGuard();
    const x = D.applications.find((y) => y.id === a.p_id);
    if (!x || !isMember(needOrg(x.need_id))) fail("You cannot decide on this application.");
    if (x.status !== "pending") fail("This application has already been decided.");
    Object.assign(x, { status: a.p_accept ? "accepted" : "declined", decided_at: now() });
    if (a.p_accept) return engage(x.need_id, x.user_id);
    closeConv(x.need_id, x.user_id, "Application not selected");
    notify(x.user_id, "application_decision", "Your application was not selected", D.needs.find((n) => n.id === x.need_id)?.title || "", "#workspace");
    return null;
  },
  withdraw_application: (a) => {
    const x = D.applications.find((y) => y.id === a.p_id && own(y.user_id));
    if (!x) fail("Application not found.");
    if (x.status !== "pending") fail("Only a pending application can be withdrawn.");
    Object.assign(x, { status: "withdrawn", decided_at: now() });
    closeConv(x.need_id, x.user_id, "Application withdrawn");
    notifyOrg(needOrg(x.need_id), "application_withdrawn", "An application was withdrawn", D.needs.find((n) => n.id === x.need_id)?.title || "", "#org");
  },
  admin_introduce: (a) => { if (!isAdmin()) fail("Administrator access required."); const n = D.needs.find((x) => x.id === a.p_need); if (!n || n.status !== "open" || !orgApproved(n.organisation_id)) fail("This need is not open."); if (!profilePublic(a.p_user)) fail("Only approved, published profiles can be introduced."); if (D.invitations.some((x) => x.need_id === a.p_need && x.user_id === a.p_user) || D.applications.some((x) => x.need_id === a.p_need && x.user_id === a.p_user && ["pending", "accepted"].includes(x.status))) fail("This person is already connected to this need."); if (String(a.p_message || "").trim().length < 30) fail("Write a short introduction of at least 30 characters."); const id = uid(); D.invitations.push({ id, need_id: a.p_need, user_id: a.p_user, invited_by: me(), message: "[Introduced by Handova] " + a.p_message.trim(), status: "pending", decided_at: null, created_at: now() }); conversationFor(a.p_need, a.p_user); notify(a.p_user, "invitation", "You have been invited to a need", n.title, "#workspace"); notifyOrg(n.organisation_id, "introduction", "Handova introduced a professional", n.title, "#org"); return id; },
  respond_invitation: (a) => {
    suspensionGuard();
    const x = D.invitations.find((y) => y.id === a.p_id && own(y.user_id));
    if (!x) fail("Invitation not found.");
    if (x.status !== "pending") fail("You have already responded.");
    Object.assign(x, { status: a.p_accept ? "accepted" : "declined", decided_at: now() });
    if (a.p_accept) return engage(x.need_id, x.user_id);
    closeConv(x.need_id, x.user_id, "Invitation declined");
    notifyOrg(needOrg(x.need_id), "invitation_declined", "An invitation was declined", D.needs.find((n) => n.id === x.need_id)?.title || "", "#org");
    return null;
  },
  // Contribution agreement v2 (20261018000600_kickoff_and_messages.sql): keeps the exact text, its hash and each confirmation;
  // the organisation names its signer's role and a safeguarding focal point. When both have signed, Handova posts the first-call agenda.
  sign_engagement: (a) => {
    suspensionGuard();
    const u = me();
    if (a.p_text === undefined && a.p_version === undefined) fail("Handova was updated. Please reload the page and sign again.");
    if (!u) fail("Please sign in first.");
    const name = trimmed(a.p_name);
    if (name.length < 2) fail("Type your full name to sign.");
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e) fail("Agreement not found.");
    if (e.status !== "awaiting_signatures") fail("This agreement is no longer awaiting signatures.");
    if (a.p_version !== e.terms_version) fail("This agreement has been updated. Reload the page and read it again.");
    const text = String(a.p_text || "");
    if (!text || !text.includes(e.scope?.need_title || "") || !text.includes(e.terms_version)) fail("The agreement text could not be confirmed. Reload the page and sign again.");
    const hash = sha256(text), conf = a.p_confirmations || {};
    let party, needed, idst = null, idat = null;
    if (own(e.user_id)) {
      party = "professional";
      if (e.talent_signed_at) fail("You have already signed.");
      idst = D.profiles.find((p) => p.user_id === u)?.id_status ?? null;
      if (idRequired() && idst !== "approved") fail("Please verify your identity before signing your first contribution agreement. You can do it from your profile in a few minutes.");
      idat = D.id_verifications.filter((v) => v.user_id === u && String(v.status).toLowerCase() === "approved").map((v) => v.updated_at).sort().pop() || null;
      needed = ["scope", "confidentiality", "read_all", "no_conflict"];
    } else if (isMember(e.organisation_id)) {
      party = "organisation";
      if (e.org_signed_at) fail("Your organisation has already signed.");
      if (trimmed(a.p_role).length < 2) fail("Add your role in the organisation.");
      if (trimmed(a.p_focal_name).length < 2 || trimmed(a.p_focal_contact).length < 5) fail("Name the safeguarding focal point for this contribution and how to reach them.");
      needed = ["scope", "confidentiality", "read_all", "no_conflict", "authority"];
    } else fail("You are not a party to this agreement.");
    if (needed.some((k) => !(conf[k] === true || conf[k] === "true"))) fail("Tick every confirmation to sign.");
    if (name.length > 120 || trimmed(a.p_role).length > 120 || trimmed(a.p_focal_name).length > 120 || trimmed(a.p_focal_contact).length > 200) CHECK("contribution_signatures");
    D.contribution_signatures.push({ id: uid(), engagement_id: e.id, organisation_id: e.organisation_id, party, user_id: u, email: D.users.find((x) => x.id === u)?.email || "", full_name: name, signer_role: orNull(a.p_role), focal_point_name: orNull(a.p_focal_name), focal_point_contact: orNull(a.p_focal_contact), confirmations: conf, version: e.terms_version, agreement_text: text, text_sha256: hash, language: String(a.p_lang || "en").slice(0, 8), ip: "", user_agent: (navigator.userAgent || "").slice(0, 400), id_status: party === "professional" ? idst : null, id_verified_at: idat, signed_at: now(), account_closed_at: null });
    const title = e.scope?.need_title || "";
    if (party === "professional") {
      Object.assign(e, { talent_signed_name: name, talent_signed_at: now() });
      notifyOrg(e.organisation_id, "signed", "The professional signed the agreement", title, "#agreement/" + e.id);
    } else {
      Object.assign(e, { org_signed_name: name, org_signed_by: u, org_signed_at: now() });
      notify(e.user_id, "signed", "The organisation signed the agreement", title, "#agreement/" + e.id);
    }
    if (e.talent_signed_at && e.org_signed_at) {
      e.status = "active";
      kickoffMessage(e);
      const body = `${title}. Arrange a 30–45 minute call to meet and plan the work. A suggested agenda is in your Messages. Signed ${utcStamp()} UTC · ${e.terms_version} · reference ${hash.slice(0, 12)}`, link = `#conversation-for/${e.need_id}/${e.user_id}`;
      notify(e.user_id, "agreement_active", "Signed by both. Next: plan your first call", body, link);
      notifyOrg(e.organisation_id, "agreement_active", "Signed by both. Next: plan your first call", body, link);
    }
    return e.status;
  },
  review_hours: (a) => { suspensionGuard(); const h = D.hours.find((x) => x.id === a.p_id); const e = D.engagements.find((x) => x.id === h?.engagement_id); if (!h || !isMember(e.organisation_id) || own(h.user_id)) fail("You cannot review this entry."); if (h.status !== "pending") fail("This entry has already been reviewed."); if (!a.p_approve && trimmed(a.p_note).length < 5) fail("Explain what needs to change."); Object.assign(h, { status: a.p_approve ? "approved" : "changes_requested", review_note: trimmed(a.p_note), reviewed_by: me(), reviewed_at: now() }); notify(h.user_id, "hours_review", a.p_approve ? "Hours approved" : "Changes requested on your hours", e.scope.need_title, "#workspace"); },
  // A professional corrects a time entry the organisation returned; it goes back for review (20261019000900).
  amend_hours: (a) => {
    suspensionGuard();
    const h = D.hours.find((x) => x.id === a.p_id);
    if (!h || !own(h.user_id)) fail("You cannot change this entry.");
    if (h.status !== "changes_requested") fail("Only entries the organisation returned can be corrected.");
    const e = D.engagements.find((x) => x.id === h.engagement_id);
    if (e?.status !== "active") fail("This contribution is no longer active.");
    if (!a.p_date || a.p_date > today()) fail("Choose a date that is not in the future.");
    const hrs = a.p_hours == null || a.p_hours === "" ? NaN : Number(a.p_hours);
    if (!(hrs > 0 && hrs <= 12)) fail("Log between 0.5 and 12 hours.");
    const desc = trimmed(a.p_description);
    if (desc.length < 10) fail("Describe the work in at least 10 characters.");
    if (a.p_evidence && !/^https:\/\//.test(a.p_evidence)) fail("Links must start with https://");
    if (D.hours.filter((x) => x.user_id === h.user_id && x.work_date === a.p_date && x.status !== "changes_requested" && x.id !== h.id).reduce((s, x) => s + Number(x.hours), 0) + hrs > 12) fail("You can log up to 12 hours in one day.");
    if (desc.length > 2000) CHECK("hours");
    Object.assign(h, { work_date: a.p_date, hours: hrs, description: desc, evidence: a.p_evidence || "", status: "pending", reviewed_by: null, reviewed_at: null });
    notifyOrg(e.organisation_id, "hours", "Corrected hours to review", e.scope.need_title, "#org");
  },
  // 20261019000500_audit_fixes.sql: "partly delivered" can be completed without an endorsement (stored as '').
  complete_engagement: (a) => {
    suspensionGuard();
    if (a.p_delivered === undefined && "p_rating" in a) fail("Handova was updated. Please reload the page and complete it again.");
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e || !isMember(e.organisation_id)) fail("You cannot complete this contribution.");
    if (e.status !== "active") fail("Only an active contribution can be completed.");
    if (!["all", "partly"].includes(a.p_delivered)) fail("Say whether the agreed work was delivered.");
    const deliverables = trimmed(a.p_deliverables);
    if (deliverables.length < 10) fail("Describe what was handed over.");
    const skills = [...new Set((a.p_skills || []).map(trimmed).filter(Boolean))];
    if (skills.length > 3) fail("Choose up to 3 skills.");
    if (!skills.length) fail("Choose at least one skill you saw in this work.");
    const endorse = trimmed(a.p_endorsement);
    if (a.p_delivered === "all" && endorse.length < 100) fail("Write an endorsement of at least 100 characters.");
    if (a.p_delivered === "partly" && endorse && endorse.length < 100) fail("Write at least 100 characters, or leave the endorsement empty.");
    if (endorse.length > 1200) fail("Keep the endorsement under 1,200 characters.");
    if (trimmed(a.p_role).length < 2) fail("Add your role.");
    if (!["yes", "right_need", "no"].includes(a.p_work_again)) fail("Answer the question for Handova.");
    if (a.p_confirm !== true) fail("Confirm the endorsement is accurate and private details are left out.");
    if (hoursOf(e, "pending").length) fail("Review all pending hours first.");
    const due = new Date(); due.setMonth(due.getMonth() + 6);
    Object.assign(e, { status: "completed", completed_at: now(), followup_due: due.toISOString().slice(0, 10), delivered_as_agreed: a.p_delivered, deliverables, confirmed_skills: skills, endorsement: endorse, endorsement_language: orNull(a.p_language), endorsed_by_role: trimmed(a.p_role), endorsed_by: me(), endorser_name: orNull(a.p_name), show_endorser_name: a.p_show_name ?? true, note_to_professional: orNull(trimmed(a.p_note).slice(0, 600)), rating: null });
    D.completion_private = D.completion_private.filter((x) => x.engagement_id !== e.id).concat({ engagement_id: e.id, work_again: a.p_work_again, note: orNull(trimmed(a.p_work_again_note).slice(0, 600)), created_at: now() });
    closeConv(e.need_id, e.user_id, "Contribution completed");
    notify(e.user_id, "completed", `Your endorsement from ${e.scope.organisation ?? "the organisation"} is ready`, e.scope.need_title + (a.p_delivered === "partly" ? ". The organisation marked the work as partly delivered. If that feels unfair, you can ask for a correction or report a concern." : ". Read it and choose whether it appears on your impact CV."), "#workspace");
    if (a.p_work_again === "no") notifyAdmins("work_again_no", "An organisation would not welcome a professional again", e.scope.need_title, "#admin");
  },
  request_endorsement_correction: (a) => {
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e || !own(e.user_id)) fail("Only the professional can ask for a correction.");
    if (e.status !== "completed") fail("You can ask for a correction once the contribution is complete.");
    if (e.correction_requested_at) fail("You have already asked for a correction.");
    if (!["fact", "spelling", "private", "other"].includes(a.p_reason)) fail("Choose a reason.");
    const note = trimmed(a.p_note);
    if (note.length < 5) fail("Say what should be corrected.");
    Object.assign(e, { correction_requested_at: now(), correction_reason: a.p_reason, correction_note: note.slice(0, 300), public: false, published_at: null });
    notifyOrg(e.organisation_id, "correction_requested", `${e.scope.talent ?? "The professional"} asked for a correction to your endorsement`, `${e.scope.need_title}: ${note.slice(0, 200)}`, "#org/needs/" + e.need_id);
  },
  // 20261019000900_flow_fixes.sql: 1 to 3 skills; an empty endorsement only for "partly"; the corrected endorsement waits for the professional again.
  edit_endorsement: (a) => {
    suspensionGuard();
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e || !isMember(e.organisation_id)) fail("You cannot edit this endorsement.");
    if (!e.correction_requested_at) fail("Endorsements can be edited only when the professional asks for a correction.");
    if (e.endorsement_edited_at) fail("This endorsement has already been corrected.");
    if (Date.now() > Date.parse(e.correction_requested_at) + 14 * DAY) fail("The 14 days to correct this endorsement have passed.");
    const deliverables = trimmed(a.p_deliverables);
    if (deliverables.length < 10) fail("Describe what was handed over.");
    const skills = [...new Set((a.p_skills || []).map(trimmed).filter(Boolean))];
    if (skills.length > 3) fail("Choose up to 3 skills.");
    if (!skills.length) fail("Choose at least one skill you saw in this work.");
    const endorse = trimmed(a.p_endorsement);
    if (!endorse && e.delivered_as_agreed != null && e.delivered_as_agreed !== "partly") fail("Write an endorsement of at least 100 characters.");
    if (endorse && (endorse.length < 100 || endorse.length > 1200)) fail("The endorsement must be 100 to 1,200 characters.");
    Object.assign(e, { deliverables, endorsement: endorse, confirmed_skills: skills, endorsement_edited_at: now(), public: false });
    notify(e.user_id, "endorsement_corrected", "Your endorsement was corrected", `${e.scope.need_title}. Read it and choose whether it appears on your impact CV.`, "#workspace");
  },
  mark_delivered: (a) => {
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e || !own(e.user_id)) fail("Only the professional can say the work is delivered.");
    if (e.status !== "active") fail("This contribution is not in progress.");
    if (e.talent_delivered_at) fail("You have already told the organisation.");
    e.talent_delivered_at = now();
    notifyOrg(e.organisation_id, "delivered", `${e.scope.talent ?? "The professional"} has delivered everything`, `${e.scope.need_title}: please check the work, then finish and write the endorsement.`, `#org/needs/${e.need_id}`);
  },
  set_career_stage: (a) => { const u = me(); let r = D.user_private.find((x) => x.user_id === u); if (!r) D.user_private.push(r = { user_id: u }); r.career_stage = a.p_stage; },
  set_research_contact: (a) => { const u = me(); let r = D.user_private.find((x) => x.user_id === u); if (!r) D.user_private.push(r = { user_id: u }); r.research_contact = a.p_yes; r.research_contact_at = now(); },
  submit_survey: (a) => {
    const e = D.engagements.find((x) => x.id === a.p_engagement);
    if (!e || e.status !== "completed") fail("This contribution is not finished.");
    if (a.p_kind === "professional") { if (!own(e.user_id)) fail("You cannot answer for this contribution."); }
    else if (["organisation", "six_months"].includes(a.p_kind)) { if (!isMember(e.organisation_id)) fail("You cannot answer for this contribution."); if (a.p_kind === "six_months" && !e.followup_answered_at) fail("Answer the six-month question first."); }
    else fail("Unknown questionnaire.");
    if (!["submitted", "skipped"].includes(a.p_status)) fail("Unknown status.");
    const answers = a.p_status === "submitted" ? a.p_answers || {} : {};
    if (answers.o_concern === "yes" || answers.p_concern === "yes") notifyAdmins("survey_concern", "A questionnaire answer flagged a concern", e.scope.need_title, "#admin-responses");
    const old = D.survey_responses.find((r) => r.engagement_id === e.id && r.kind === a.p_kind);
    if (old && old.status !== "skipped") return;
    if (old) D.survey_responses = D.survey_responses.filter((r) => r !== old);
    D.survey_responses.push({ id: uid(), engagement_id: e.id, kind: a.p_kind, respondent: me(), status: a.p_status, short_form: !!a.p_short, q_version: String(a.p_version || "").slice(0, 20), lang: a.p_lang == null ? null : String(a.p_lang).slice(0, 8), answers, created_at: now() });
  },
  // Contributions finished in the last 60 days; the short form if a full one was answered in the last 90 days.
  survey_pending: () => {
    const out = [], has = (e, k) => D.survey_responses.some((r) => r.engagement_id === e.id && r.kind === k), recent = D.engagements.filter((x) => x.status === "completed" && !ago(x.completed_at, 60));
    for (const e of recent) if (isMember(e.organisation_id) && !has(e, "organisation")) out.push({ engagement_id: e.id, kind: "organisation", short_form: D.survey_responses.some((r) => r.kind === "organisation" && r.status === "submitted" && !r.short_form && !ago(r.created_at, 90) && D.engagements.find((x) => x.id === r.engagement_id)?.organisation_id === e.organisation_id), need_title: e.scope.need_title, other_name: e.scope.talent });
    for (const e of recent) if (own(e.user_id) && !has(e, "professional")) out.push({ engagement_id: e.id, kind: "professional", short_form: false, need_title: e.scope.need_title, other_name: e.scope.organisation });
    return out;
  },
  admin_survey_data: () => { if (!isAdmin()) fail("Only Handova can see questionnaire answers."); return D.engagements.filter((e) => e.status === "completed").map((e) => { const o = D.organisations.find((x) => x.id === e.organisation_id) || {}; const p = D.profiles.find((x) => x.user_id === e.user_id) || {}; const up = D.user_private.find((x) => x.user_id === e.user_id) || {}; const orgPriv = D.user_private.filter((x) => D.organisation_members.some((m) => m.organisation_id === e.organisation_id && m.user_id === x.user_id) && x.research_contact != null); const r = (k) => { const x = D.survey_responses.find((y) => y.engagement_id === e.id && y.kind === k); return x ? { id: x.id, kind: x.kind, status: x.status, short_form: x.short_form, q_version: x.q_version, lang: x.lang, answers: x.answers, created_at: x.created_at } : null; }; return { engagement_id: e.id, completed_at: e.completed_at, organisation_id: e.organisation_id, professional_id: e.user_id, org_country: o.country, org_type: o.org_type, staff_size: o.staff_size, pro_country: p.country, career_stage: up.career_stage, hours_planned: e.scope.hours, hours_approved: approvedHours(e), delivered: e.delivered_as_agreed, still_in_use: e.followup_in_use, followup_answered_at: e.followup_answered_at, work_again: D.completion_private.find((x) => x.engagement_id === e.id)?.work_again ?? null, research_contact_org: orgPriv.length ? orgPriv.some((x) => x.research_contact) : null, research_contact_pro: up.research_contact ?? null, org_response: r("organisation"), pro_response: r("professional"), six_months: r("six_months"), need_title: e.scope.need_title, org_name: o.name, pro_name: p.name }; }).sort((x, y) => (x.completed_at < y.completed_at ? 1 : -1)); },
  admin_delete_survey_response: (a) => { requireAdmin(); const r = D.survey_responses.find((x) => x.id === a.p_id); if (!r) fail("Response not found."); adminAction("survey_response_deleted", "survey_response", r.id, { engagement_id: r.engagement_id, kind: r.kind, status: r.status, ask_again: !!a.p_ask_again }); if (a.p_ask_again) D.survey_responses = D.survey_responses.filter((x) => x !== r); else Object.assign(r, { status: "skipped", answers: {} }); },
  // Its hours and private answers go with it; signed agreement records stay (unlinked) unless it was a test (20261019000100).
  admin_delete_contribution: (a) => {
    requireAdmin();
    if (trimmed(a.p_confirm).toUpperCase() !== "DELETE") fail("Type DELETE to confirm.");
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e) fail("Contribution not found.");
    if (openReport((r) => (r.target_type === "contribution" && r.target_id === e.id) || (r.target_type === "conversation" && D.conversations.some((c) => c.id === r.target_id && c.need_id === e.need_id && c.user_id != null && c.user_id === e.user_id)))) fail("A report about this contribution or its conversation is still open. Resolve the report first, so the evidence is kept.");
    adminAction("contribution_deleted", "contribution", e.id, { need_title: e.scope.need_title, organisation: e.scope.organisation, professional: e.scope.talent, status: e.status, created_at: e.created_at, completed_at: e.completed_at, reason: a.p_reason || "", test: !!a.p_test });
    if (a.p_test) D.contribution_signatures = D.contribution_signatures.filter((s) => s.engagement_id !== e.id);
    else D.contribution_signatures.forEach((s) => { if (s.engagement_id === e.id) s.engagement_id = null; });
    D.notifications = D.notifications.filter((n) => n.ref !== e.id);
    D.engagements = D.engagements.filter((x) => x !== e);
    for (const t of ["hours", "completion_private", "survey_responses"]) D[t] = D[t].filter((r) => r.engagement_id !== e.id);
    if (!a.p_test) {
      const reason = trimmed(a.p_reason), body = e.scope.need_title + (reason ? ": " + reason : "");
      notify(e.user_id, "contribution_removed", "A contribution was removed by Handova", body, "#workspace");
      notifyOrg(e.organisation_id, "contribution_removed", "A contribution was removed by Handova", body, "#org");
    }
  },
  admin_delete_organisation: (a) => {
    requireAdmin();
    const o = D.organisations.find((x) => x.id === a.p_org);
    if (!o) fail("Organisation not found.");
    if (trimmed(a.p_confirm) !== o.name) fail("Type the organisation’s name exactly to confirm.");
    const orgNeed = (id) => D.needs.some((n) => n.id === id && n.organisation_id === o.id);
    if (openReport((r) => (r.target_type === "organisation" && r.target_id === o.id) || (r.target_type === "need" && orgNeed(r.target_id)) || (r.target_type === "conversation" && D.conversations.some((c) => c.id === r.target_id && orgNeed(c.need_id))) || (r.target_type === "contribution" && D.engagements.some((x) => x.id === r.target_id && x.organisation_id === o.id)))) fail("A report about this organisation, one of its needs or one of its conversations is still open. Resolve the report first, so the evidence is kept.");
    if (D.engagements.some((e) => e.organisation_id === o.id)) fail("This organisation has contribution records. Professionals rely on them for their impact CVs and the signed agreements must be kept, so suspend it instead.");
    D.needs.filter((n) => n.organisation_id === o.id && n.status === "open").forEach(closeNeed);
    notifyOrg(o.id, "org_decision", "Your organisation was removed from Handova", trimmed(a.p_reason) || "Contact hello@handova.org if you have questions.", "#onboarding");
    const ids = D.needs.filter((n) => n.organisation_id === o.id).map((n) => n.id);
    adminAction("org_deleted", "organisation", o.id, { name: o.name, country: o.country, reason: a.p_reason || "", needs: ids.length });
    const convs = D.conversations.filter((c) => ids.includes(c.need_id)).map((c) => c.id);
    D.messages = D.messages.filter((m) => !convs.includes(m.conversation_id));
    for (const t of ["applications", "invitations", "conversations", "saved_needs"]) D[t] = D[t].filter((x) => !ids.includes(x.need_id));
    D.needs = D.needs.filter((n) => n.organisation_id !== o.id);
    D.organisation_members = D.organisation_members.filter((m) => m.organisation_id !== o.id);
    D.organisations = D.organisations.filter((x) => x !== o);
  },
  admin_endorsements_waiting: () => { if (!isAdmin()) fail("Only Handova can see this list."); return D.engagements.filter((e) => e.status === "active" && endorsementDueSince(e)).map((e) => ({ id: e.id, organisation: e.scope.organisation, talent: e.scope.talent, need_title: e.scope.need_title, since: endorsementDueSince(e), talent_delivered: !!e.talent_delivered_at })).sort((x, y) => (x.since > y.since ? 1 : -1)); },
  // A reason is required and kept; the organisation can't end early once all agreed hours are approved; Handova is told (20261018000800).
  end_engagement: (a) => {
    const u = me(), e = D.engagements.find((x) => x.id === a.p_id);
    if (!e || !(own(e.user_id) || isMember(e.organisation_id))) fail("You are not a party to this contribution.");
    if (!["awaiting_signatures", "active"].includes(e.status)) fail("This contribution has already finished.");
    const reason = trimmed(a.p_reason);
    if (reason.length < 5) fail("Give a short reason for ending the contribution.");
    if (!own(e.user_id) && e.status === "active" && hoursReadyAt(e)) fail("All the agreed hours are approved, so the work is finished. Complete it and write the endorsement instead. If something is wrong, contact Handova.");
    Object.assign(e, { status: "ended", end_reason: reason.slice(0, 1000), ended_at: now(), ended_by: u });
    closeConv(e.need_id, e.user_id, "Contribution ended");
    const body = `${e.scope.need_title}: ${reason.slice(0, 300)}`;
    notify(e.user_id, "ended", "A contribution was ended", body, "#workspace");
    notifyOrg(e.organisation_id, "ended", "A contribution was ended", body, "#org");
    notifyAdmins("ended", "A contribution was ended early", body, "#admin");
  },
  set_contribution_visibility: (a) => { const e = D.engagements.find((x) => x.id === a.p_id && own(x.user_id) && x.status === "completed"); if (!e) fail("Only your own completed contributions can be published."); e.public = !!a.p_public; e.published_at = a.p_public ? e.published_at || now() : null; },
  answer_followup: (a) => { const e = D.engagements.find((x) => x.id === a.p_id && isMember(x.organisation_id) && x.status === "completed" && x.followup_due && x.followup_due <= today()); if (!e) fail("This follow-up is not available yet."); Object.assign(e, { followup_in_use: a.p_in_use, followup_note: trimmed(a.p_note), followup_answered_at: now() }); },
  close_conversation: (a) => {
    const c = D.conversations.find((x) => x.id === a.p_id);
    if (!isParty(c)) fail("You are not part of this conversation.");
    if (D.engagements.some((e) => e.need_id === c.need_id && e.user_id != null && e.user_id === c.user_id && ["awaiting_signatures", "active"].includes(e.status))) fail("While the contribution is live, Messages stay open. To stop the work, use End this contribution. If you feel unsafe, Report a concern.");
    Object.assign(c, { status: "closed", closed_reason: "Ended by a participant", closed_at: now() });
  },
  public_contributions: (a) => D.engagements.filter((e) => e.user_id === a.p_user && a.p_user != null && e.status === "completed" && ((e.public && profilePublic(a.p_user)) || own(e.user_id))).sort((x, y) => (x.completed_at < y.completed_at ? 1 : -1)).map((e) => ({ id: e.id, need_title: e.scope.need_title, organisation: e.scope.organisation, organisation_country: e.scope.organisation_country, need: e.scope.description, output: e.scope.output, skills: (e.confirmed_skills || []).length ? e.confirmed_skills : e.scope.skills, skills_confirmed: !!(e.confirmed_skills || []).length, deliverables: e.deliverables, endorsement: e.endorsement, endorsed_by_role: e.endorsed_by_role, endorser_name: e.show_endorser_name !== false ? e.endorser_name : null, endorsement_language: e.endorsement_language, hours: approvedHours(e), started: e.created_at, signed: [e.org_signed_at, e.talent_signed_at].filter(Boolean).sort().pop() || null, completed: e.completed_at, still_in_use: e.followup_in_use, followup_checked: e.followup_answered_at })),
  public_contributions_v2: (a) => D.engagements.filter((e) => e.user_id === a.p_user && a.p_user != null && e.status === "completed" && ((e.public && profilePublic(a.p_user)) || own(e.user_id))).sort((x, y) => (x.completed_at < y.completed_at ? 1 : -1)).map((e) => ({ id: e.id, need_title: e.scope.need_title, organisation: e.scope.organisation, organisation_country: e.scope.organisation_country, need: e.scope.description, output: e.scope.output, skills: (e.confirmed_skills || []).length ? e.confirmed_skills : e.scope.skills, skills_confirmed: !!(e.confirmed_skills || []).length, deliverables: e.deliverables, endorsement: e.endorsement, endorsed_by_role: e.endorsed_by_role, endorser_name: e.show_endorser_name !== false ? e.endorser_name : null, endorsement_language: e.endorsement_language, hours: approvedHours(e), started: e.created_at, signed: [e.org_signed_at, e.talent_signed_at].filter(Boolean).sort().pop() || null, completed: e.completed_at, still_in_use: e.followup_in_use, followup_checked: e.followup_answered_at, closed_by_handova: !!e.closed_by_handova })),
  // 20261020100000_policy_safety_tools.sql
  request_id_video_call: () => { const u = me(); if (!u) fail("Please sign in first."); D.id_video_requests = D.id_video_requests.filter((x) => x.user_id !== u); D.id_video_requests.push({ user_id: u, requested_at: now(), status: "requested" }); },
  admin_confirm_id_video: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); const p = D.profiles.find((x) => x.user_id === a.p_user); if (!p) fail("Profile not found."); Object.assign(p, { id_status: "approved", id_verified_at: now(), id_document_name: a.p_document_name }); const r = D.id_video_requests.find((x) => x.user_id === a.p_user); if (r) r.status = "confirmed"; adminAction("id_confirmed_video_call", "profile", a.p_user, { name: a.p_document_name }); },
  admin_suspend_user: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); if (String(a.p_reason || "").trim().length < 5) fail("Give a short reason. It is kept in the activity log."); D.user_suspensions = D.user_suspensions.filter((x) => x.user_id !== a.p_user); D.user_suspensions.push({ user_id: a.p_user, reason: a.p_reason, removed: !!a.p_remove, suspended_at: now(), lifted_at: null }); const p = D.profiles.find((x) => x.user_id === a.p_user); if (p) p.published = false; if (a.p_remove) D.engagements.filter((e) => e.user_id === a.p_user && e.status === "completed").forEach((e) => { e.public = false; e.hidden_by_handova = now(); }); adminAction(a.p_remove ? "person_removed" : "person_suspended", "profile", a.p_user, { reason: a.p_reason }); },
  admin_lift_suspension: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); const r = D.user_suspensions.find((x) => x.user_id === a.p_user && !x.lifted_at); if (!r) fail("This person is not suspended."); r.lifted_at = now(); const p = D.profiles.find((x) => x.user_id === a.p_user); if (p && (p.published || ["approved", "pending"].includes(p.review_status))) Object.assign(p, { published: false, review_status: "draft" }); adminAction("suspension_lifted", "profile", a.p_user, { note: a.p_note }); notify(a.p_user, "account", "Your Handova account is active again", "Thank you for your patience. If you have a professional profile, send it for review from your workspace; Handova checks it before it goes back online.", "#workspace"); },
  admin_set_conversation_frozen: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); const c = D.conversations.find((x) => x.id === a.p_id); if (!c) fail("Conversation not found."); if (a.p_frozen) Object.assign(c, { status: "closed", closed_reason: "Paused by Handova", closed_at: now() }); else if (c.closed_reason === "Paused by Handova") Object.assign(c, { status: "open", closed_reason: null, closed_at: null }); else fail("Conversation not found, or it was not paused by Handova."); adminAction(a.p_frozen ? "conversation_frozen" : "conversation_unfrozen", "conversation", a.p_id, { reason: a.p_reason }); },
  admin_take_down_need: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); const n = D.needs.find((x) => x.id === a.p_id); if (!n) fail("Need not found."); Object.assign(n, { status: "closed", review_note: "Taken down by Handova: " + a.p_reason }); adminAction("need_taken_down", "need", a.p_id, { reason: a.p_reason, title: n.title }); },
  admin_hide_contribution: (a) => { if (!isAdmin()) fail("Only Handova admins can do this."); const e = D.engagements.find((x) => x.id === a.p_id); if (!e) fail("Contribution not found."); if (a.p_hidden) Object.assign(e, { public: false, hidden_by_handova: now() }); else e.hidden_by_handova = null; adminAction(a.p_hidden ? "cv_entry_hidden" : "cv_entry_restored", "engagement", a.p_id, { reason: a.p_reason }); },
  admin_integrity_signals: () => { if (!isAdmin()) fail("Only Handova admins can do this."); const out = []; const by = {}; D.profiles.filter((p) => p.id_status === "approved" && p.id_document_name).forEach((p) => { const k = p.id_document_name.toLowerCase().trim(); (by[k] ||= []).push(p.name); }); Object.values(by).filter((v) => v.length > 1).forEach((v) => out.push({ kind: "duplicate_identity", title: `Same verified name on ${v.length} accounts`, detail: v.join(", "), link: "#admin-list/professionals" })); return out; },
  // 20261020004604_org_changes_need_approval.sql
  admin_review_org_changes: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const o = D.organisations.find((x) => x.id === a.p_id), row = D.organisation_changes.find((x) => x.organisation_id === a.p_id);
    if (!o || !row || !Object.keys(row.changes || {}).length) fail("There are no changes waiting for this organisation.");
    const pc = row.changes;
    if (a.p_approve) Object.assign(o, pc);
    row.changes = {};
    notifyOrg(o.id, "org_decision", a.p_approve ? "Your organisation changes are live" : "Your organisation changes were not approved", String(a.p_note || "").trim() || (a.p_approve ? "Thank you. Your updated details are now public." : "Your current details stay as they were. Reply to us if you have questions."), "#org");
    adminAction(a.p_approve ? "org_changes_approved" : "org_changes_declined", "organisation", o.id, { changes: pc, note: a.p_note, name: o.name });
  },
  // 20261020120600: "Download my data".
  export_my_data: () => {
    const u = me(); if (!u) fail("Please sign in first.");
    const omit = (r, ...k) => { const x = { ...r }; k.forEach((y) => delete x[y]); return x; };
    const user = D.users.find((x) => x.id === u) || {};
    const title = (id) => D.needs.find((n) => n.id === id)?.title ?? null;
    const sus = D.user_suspensions.find((x) => x.user_id === u);
    return {
      exported_at: now(),
      account: { id: u, email: user.email, created_at: user.created_at ?? null, email_confirmed_at: null, last_sign_in_at: null, details_given_at_sign_up: user.user_metadata || {} },
      terms_acceptances: D.terms_acceptances.filter((t) => t.user_id === u).map((t) => omit(t, "id", "user_id")),
      settings: (() => { const x = D.user_settings.find((r) => r.user_id === u); return x ? omit(x, "user_id") : null; })(),
      research_answers: (() => { const x = D.user_private.find((r) => r.user_id === u); return x ? omit(x, "user_id") : null; })(),
      profile: D.profiles.find((p) => p.user_id === u) || null,
      organisations: D.organisation_members.filter((m) => m.user_id === u).map((m) => ({ your_role: m.role, your_name: m.full_name, joined_at: m.created_at, organisation: D.organisations.find((o) => o.id === m.organisation_id) || null })),
      applications: D.applications.filter((x) => x.user_id === u).map((x) => ({ ...x, need_title: title(x.need_id) })),
      invitations_received: D.invitations.filter((x) => x.user_id === u).map((x) => ({ ...omit(x, "invited_by"), need_title: title(x.need_id) })),
      invitations_sent: D.invitations.filter((x) => x.invited_by === u).map((x) => ({ id: x.id, need_title: title(x.need_id), message: x.message, conflict_note: x.conflict_note ?? "", status: x.status, created_at: x.created_at })),
      contributions: D.engagements.filter((e) => e.user_id === u || e.org_signed_by === u || e.endorsed_by === u),
      hours: D.hours.filter((h) => h.user_id === u),
      agreement_signatures: D.agreement_signatures.filter((x) => x.user_id === u).map((x) => omit(x, "ip")),
      contribution_signatures: D.contribution_signatures.filter((x) => x.user_id === u).map((x) => omit(x, "ip")),
      saved_needs: D.saved_needs.filter((x) => x.user_id === u).map((x) => ({ need_id: x.need_id, need_title: title(x.need_id), saved_at: x.created_at })),
      messages_sent: D.messages.filter((m) => m.sender_id === u).map((m) => ({ id: m.id, conversation_id: m.conversation_id, body: m.body, sent_at: m.created_at })),
      notifications: D.notifications.filter((n) => n.user_id === u).map((n) => ({ kind: n.kind, title: n.title, body: n.body, link: n.link, created_at: n.created_at, read_at: n.read_at, emailed_at: n.emailed_at ?? null })),
      reports_made: D.reports.filter((r) => r.reporter_id === u).map((r) => ({ id: r.id, about: r.target_type, target_id: r.target_id, reason: r.reason, details: r.details, status: r.status, created_at: r.created_at, resolved_at: r.resolved_at })),
      identity_check: {
        consents: D.id_consents.filter((x) => x.user_id === u).map((x) => omit(x, "user_id")),
        checks: D.id_verifications.filter((x) => x.user_id === u).map((x) => ({ provider: x.provider, status: x.status, name_on_document: x.document_name, created_at: x.created_at, updated_at: x.updated_at })),
        video_call_request: (() => { const x = D.id_video_requests.find((r) => r.user_id === u); return x ? omit(x, "user_id", "decided_by") : null; })(),
      },
      questionnaire_answers: D.survey_responses.filter((x) => x.respondent === u).map((x) => omit(x, "respondent")),
      suspension: sus ? { removed: sus.removed, suspended_at: sus.suspended_at, lifted_at: sus.lifted_at } : null,
    };
  },
  // 20261020120500: browser errors (anyone may call; scrubbed, capped at 20 a minute across the site).
  log_client_error: (a) => {
    const scrub = (t) => String(t ?? "").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]").replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "[id]").replace(/[A-Za-z0-9_.-]{40,}/g, "[token]");
    const message = scrub(String(a.p_message ?? "").slice(0, 2000)).trim().slice(0, 500);
    if (!message) return null;
    const page = scrub(String(a.p_page ?? "").slice(0, 1000).split("?")[0].split("access_token")[0]).trim().slice(0, 200);
    const app_version = String(a.p_version ?? "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40);
    if (D.client_errors.filter((x) => !ago(x.created_at, 1 / 1440)).length >= 20) return null;
    D.client_errors.push({ id: uid(), created_at: now(), message, page, app_version });
    return null;
  },
  // 20261019001100_soft_launch_flow_fixes.sql
  account_deletion_blocker: () => {
    const u = me(); if (!u) return null;
    // 20261020000100: open reports about the person (or their contributions, conversations, organisation, needs).
    const member = (org) => D.organisation_members.some((m) => m.organisation_id === org && m.user_id === u);
    const about = (r) => (r.target_type === "profile" && r.target_id === u)
      || (r.target_type === "contribution" && D.engagements.some((e) => e.id === r.target_id && (e.user_id === u || member(e.organisation_id))))
      || (r.target_type === "conversation" && D.conversations.some((c) => c.id === r.target_id && (c.user_id === u || member(D.needs.find((n) => n.id === c.need_id)?.organisation_id))))
      || (r.target_type === "organisation" && member(r.target_id))
      || (r.target_type === "need" && member(D.needs.find((n) => n.id === r.target_id)?.organisation_id));
    if (D.reports.some((r) => r.status !== "resolved" && about(r))) return "Your account can't be closed online right now. Please write to hello@handova.org and we'll help you.";
    const mine = D.engagements.find((e) => e.user_id === u && ["awaiting_signatures", "active"].includes(e.status));
    if (mine) return `You have a contribution that is still open (${mine.scope?.need_title || "a contribution"}). Finish it or end it from its agreement page first, so the organisation is not left waiting.`;
    const org = D.organisations.find((o) => { const ms = D.organisation_members.filter((m) => m.organisation_id === o.id); return ms.some((m) => m.user_id === u) && ms.every((m) => m.user_id === u) && D.engagements.some((e) => e.organisation_id === o.id && ["awaiting_signatures", "active"].includes(e.status)); });
    if (org) return `You are the only person managing ${org.name}, and it has a contribution that is still open. Finish or end it first, or write to hello@handova.org so we can help hand the organisation over.`;
    return null;
  },
  admin_close_engagement: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const e = D.engagements.find((x) => x.id === a.p_id);
    if (!e) fail("Contribution not found.");
    if (e.status !== "active") fail("Only a contribution in progress can be closed this way.");
    const reason = String(a.p_reason || "").trim().slice(0, 1000);
    if (reason.length < 5) fail("Give a short reason. Both sides will see it.");
    const approved = approvedHours(e), t = now();
    if (approved > 0) Object.assign(e, { status: "completed", completed_at: t, closed_by_handova: t, end_reason: reason, followup_due: null });
    else Object.assign(e, { status: "ended", ended_at: t, ended_by: me(), closed_by_handova: t, end_reason: reason });
    D.conversations.filter((c) => c.need_id === e.need_id && c.user_id === e.user_id && c.status !== "closed").forEach((c) => Object.assign(c, { status: "closed", closed_reason: "Closed by Handova", closed_at: t }));
    notify(e.user_id, "ended", "Handova closed a contribution", e.scope.need_title + (approved > 0 ? `. The ${approved} hours the organisation approved stay on your record, and you can choose to show it on your impact CV.` : ". No hours had been approved, so it was ended."), "#workspace");
    notifyOrg(e.organisation_id, "ended", "Handova closed a contribution", `${e.scope.need_title}: ${reason.slice(0, 300)}`, "#org");
    (D.admin_actions ||= []).push({ id: uid(), admin_id: me(), action: approved > 0 ? "contribution_closed" : "contribution_ended", target_type: "engagement", target_id: e.id, detail: { reason, approved_hours: approved }, created_at: t });
    return approved > 0 ? "completed" : "ended";
  },
  // 20261019000600_conversation_retention.sql. Only reachable through the account-delete function below.
  // ---------- 20261020123000_org_team.sql (O2): team members and ownership ----------
  invite_org_member: (a) => {
    const u = me(); if (!u) fail("Please sign in first.");
    if (!orgOwner(a.p_org)) fail("Only the organisation’s owner can add team members.");
    if (orgBlocked(a.p_org)) fail("This organisation can’t add team members at the moment.");
    const email = trimmed(a.p_email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("Type a full email address.");
    const members = D.organisation_members.filter((m) => m.organisation_id === a.p_org);
    const existing = D.users.find((x) => x.email.toLowerCase() === email);
    if (existing && members.some((m) => m.user_id === existing.id)) fail("This person is already on the team.");
    if (D.org_member_invites.some((i) => i.organisation_id === a.p_org && i.email === email)) fail("This email address has already been invited.");
    if (members.length + D.org_member_invites.filter((i) => i.organisation_id === a.p_org).length >= 3) fail("An organisation can have up to 3 team members, including invitations.");
    const org = D.organisations.find((o) => o.id === a.p_org);
    if (existing) {
      if (D.organisation_members.filter((m) => m.user_id === existing.id).length >= 3) fail("This person already manages three organisations, the most Handova allows.");
      D.organisation_members.push({ organisation_id: a.p_org, user_id: existing.id, role: "member", full_name: existing.user_metadata?.full_name || "", created_at: now() });
      notify(existing.id, "team", "You were added to an organisation’s team", org.name, "#org");
      notifyAdmins("team", "Team member added", org.name, "#admin-list/organisations");
      return "added";
    }
    D.org_member_invites.push({ id: uid(), organisation_id: a.p_org, email, invited_by: u, created_at: now() });
    notifyAdmins("team", "Team member invited", org.name, "#admin-list/organisations");
    return "invited";
  },
  claim_org_invites: () => {
    const u = me(); if (!u) return 0;
    const email = (D.users.find((x) => x.id === u)?.email || "").toLowerCase();
    let n = 0;
    for (const i of D.org_member_invites.filter((x) => x.email === email)) {
      if (D.organisation_members.filter((m) => m.user_id === u).length >= 3) break;
      if (!D.organisation_members.some((m) => m.organisation_id === i.organisation_id && m.user_id === u) && D.organisation_members.filter((m) => m.organisation_id === i.organisation_id).length < 3) {
        D.organisation_members.push({ organisation_id: i.organisation_id, user_id: u, role: "member", full_name: D.users.find((x) => x.id === u)?.user_metadata?.full_name || "", created_at: now() });
        notifyOrg(i.organisation_id, "team", "A colleague joined your organisation’s team", D.users.find((x) => x.id === u)?.user_metadata?.full_name || email, "#org/details");
        n++;
      }
      D.org_member_invites = D.org_member_invites.filter((x) => x.id !== i.id);
    }
    return n;
  },
  cancel_org_invite: (a) => { const i = D.org_member_invites.find((x) => x.id === a.p_id); if (!i || !orgOwner(i.organisation_id)) fail("Invitation not found."); D.org_member_invites = D.org_member_invites.filter((x) => x.id !== a.p_id); },
  remove_org_member: (a) => {
    const u = me(); if (!u) fail("Please sign in first.");
    const target = D.organisation_members.find((m) => m.organisation_id === a.p_org && m.user_id === a.p_user);
    if (!target) fail("This person is not on the team.");
    if (a.p_user !== u && !orgOwner(a.p_org)) fail("Only the owner can remove team members.");
    if (target.role === "owner") fail("Make someone else the owner first.");
    if (D.organisation_members.filter((m) => m.organisation_id === a.p_org).length <= 1) fail("An organisation needs at least one person managing it.");
    D.organisation_members = D.organisation_members.filter((m) => m !== target);
    const org = D.organisations.find((o) => o.id === a.p_org);
    if (a.p_user !== u) notify(a.p_user, "team", "You were removed from an organisation’s team", org.name, "#workspace");
    notifyOrg(a.p_org, "team", a.p_user === u ? "A team member left" : "A team member was removed", org.name, "#org/details");
  },
  transfer_org_ownership: (a) => {
    const u = me(); if (!u) fail("Please sign in first.");
    if (!orgOwner(a.p_org)) fail("Only the owner can hand over ownership.");
    const target = D.organisation_members.find((m) => m.organisation_id === a.p_org && m.user_id === a.p_user);
    if (!target || a.p_user === u) fail("Choose another member of the team.");
    D.organisation_members.filter((m) => m.organisation_id === a.p_org && m.role === "owner").forEach((m) => { m.role = "member"; });
    target.role = "owner";
    const org = D.organisations.find((o) => o.id === a.p_org);
    notify(a.p_user, "team", "You are now the owner of an organisation on Handova", org.name, "#org/details");
    notifyAdmins("team", "Organisation ownership transferred", org.name, "#admin-list/organisations");
  },
  // L18 (db team builds the real one): everything about the signed-in person, as one JSON document.
  export_my_data: () => {
    const u = me(); if (!u) fail("Please sign in first.");
    const user = D.users.find((x) => x.id === u);
    const mine = (t) => (D[t] || []).filter((r) => r.user_id === u);
    return { exported_at: now(), format: "Handova data export (sample from the local test backend)", account: { id: u, email: user?.email, created_at: user?.created_at || null }, profile: D.profiles.find((p) => p.user_id === u) || null, organisations: D.organisation_members.filter((m) => m.user_id === u), applications: mine("applications"), invitations: mine("invitations"), engagements: mine("engagements"), hours: mine("hours"), messages: D.messages.filter((m) => m.sender_id === u), notifications: mine("notifications"), agreement_signatures: mine("agreement_signatures").map(({ agreement_text, ...r }) => r), id_consents: mine("id_consents") };
  },
  delete_my_account: () => {
    const u = me();
    if (!u) fail("Please sign in first.");
    const blocker = rpcs.account_deletion_blocker();
    if (blocker) fail(blocker);
    if (!D.account_deletion_authorizations.some((x) => x.user_id === u && !ago(x.verified_at, 5 / 1440))) fail("Please use Account and privacy to delete your account.");
    D.account_deletion_authorizations = D.account_deletion_authorizations.filter((x) => x.user_id !== u);
    const t = now();
    for (const s of [...D.agreement_signatures, ...D.contribution_signatures]) if (s.user_id === u && !s.account_closed_at) s.account_closed_at = t;
    D.engagements.filter((e) => e.user_id === u).forEach((e) => { e.scope = { ...e.scope, talent: "Former member" }; if (e.talent_signed_name) e.talent_signed_name = "Former member"; e.public = false; });
    // Messages in conversations with a contribution or a report are kept for six years, shown as "Former member".
    const kept = new Set(D.conversations.filter((c) => (c.user_id != null && D.engagements.some((e) => e.need_id === c.need_id && e.user_id === c.user_id)) || D.reports.some((r) => r.target_type === "conversation" && r.target_id === c.id)).map((c) => c.id));
    D.messages.forEach((m) => { if (m.sender_id === u && kept.has(m.conversation_id)) Object.assign(m, { kind: "former", sender_closed_at: t, sender_id: null }); });
    D.messages = D.messages.filter((m) => m.sender_id !== u);
    // Application-only chats go with the account; the others stay, without the person.
    const gone = new Set(D.conversations.filter((c) => c.user_id === u && !kept.has(c.id)).map((c) => c.id));
    D.conversations = D.conversations.filter((c) => !gone.has(c.id));
    D.messages = D.messages.filter((m) => !gone.has(m.conversation_id));
    D.organisations.forEach((o) => { const ms = D.organisation_members.filter((m) => m.organisation_id === o.id); if (ms.length && ms.every((m) => m.user_id === u)) { if (o.status !== "suspended") o.suspended_at = now(); o.status = "suspended"; notifyAdmins("org_without_member", "An organisation no longer has anyone managing it", `${o.name}: its only member deleted their account, so it was suspended.`, "#admin-list/organisations"); } });
    // delete from auth.users: cascades and "on delete set null".
    for (const tb of ["profiles", "applications", "invitations", "saved_needs", "notifications", "organisation_members", "user_settings", "user_private", "id_verifications", "admins", "account_deletion_authorizations"]) D[tb] = D[tb].filter((r) => r.user_id !== u);
    const unset = (rows, ...keys) => rows.forEach((r) => keys.forEach((k) => { if (r[k] === u) r[k] = null; }));
    unset(D.conversations, "user_id"); unset(D.engagements, "user_id", "org_signed_by", "endorsed_by", "ended_by", "first_call_by"); unset(D.hours, "user_id", "reviewed_by");
    unset(D.contribution_signatures, "user_id"); unset(D.reports, "reporter_id"); unset(D.survey_responses, "respondent"); unset(D.invitations, "invited_by"); unset(D.admin_actions, "admin_id");
    D.users = D.users.filter((x) => x.id !== u);
  },
};
// ---------- admin fixes, 20 Oct 2026 (20261020121000–121500) ----------
const reportRef = (id) => String(id || "").slice(0, 8).toUpperCase();
const signalKey = (g) => [g.kind, g.link || "", g.detail || ""].join("|");
const integritySignalsAll = rpcs.admin_integrity_signals;
// Run fn as another user (the database functions do this by setting the request's user for one statement).
const asUser = (user, fn) => { const keep = localStorage.getItem(SKEY); localStorage.setItem(SKEY, JSON.stringify({ user: user ? { id: user } : null })); try { return fn(); } finally { if (keep == null) localStorage.removeItem(SKEY); else localStorage.setItem(SKEY, keep); } };
Object.assign(rpcs, {
  admin_reports: () => { requireAdmin(); return [...D.reports].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((r) => { const u = D.users.find((x) => x.id === r.reporter_id), p = D.profiles.find((x) => x.user_id === r.reporter_id), m = D.organisation_members.find((x) => x.user_id === r.reporter_id && x.full_name), c = D.report_cases.find((x) => x.report_id === r.id) || {};
    return { id: r.id, reference: reportRef(r.id), target_type: r.target_type, target_id: r.target_id, reason: r.reason, details: r.details, status: r.status, admin_note: r.admin_note || "", created_at: r.created_at, resolved_at: r.resolved_at, source: r.source || "platform", source_ref: r.source_ref || null, reporter_id: r.reporter_id || null, reporter_name: r.reporter_name || p?.name || m?.full_name || u?.user_metadata?.full_name || "", reporter_email: r.reporter_email || u?.email || "", severity: c.severity || "", child_case: !!c.child_case, case_updated_at: c.updated_at || null, outcome_message: r.outcome_message || "", outcome_sent_at: r.outcome_sent_at || null }; }); },
  admin_record_report: (a) => {
    requireAdmin();
    const src = a.p_source || "email", d = trimmed(a.p_details), em = trimmed(a.p_reporter_email).toLowerCase(), tt = a.p_target_type || "other";
    if (!["email", "questionnaire"].includes(src)) fail("Choose where the report came from.");
    if (d.length < 10) fail("Describe the concern in at least 10 characters.");
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) fail("Check the reporter’s email address.");
    if (a.p_received && a.p_received > today()) fail("The date received can’t be in the future.");
    if (a.p_source_ref && D.reports.some((r) => r.source_ref === a.p_source_ref)) fail("A case is already open for this answer. Find it in Admin › Reports.");
    if (!REPORT_TYPES.includes(tt) || !REPORT_REASONS.includes(a.p_reason)) CHECK("reports");
    const id = uid();
    notifyAdmins("report", a.p_reason === "exploitation" ? "Urgent: sexual exploitation or abuse reported" : "New concern reported", `${a.p_reason} · ${tt}`, "#admin");
    D.reports.push({ id, reporter_id: null, target_type: tt, target_id: tt === "other" ? null : a.p_target_id || null, reason: a.p_reason, details: d.slice(0, 4000), status: "open", admin_note: "", resolved_at: null, source: src, source_ref: a.p_source_ref || null, reporter_name: trimmed(a.p_reporter_name).slice(0, 160), reporter_email: em.slice(0, 254), outcome_message: "", outcome_sent_at: null, created_at: !a.p_received || a.p_received >= today() ? now() : `${a.p_received}T12:00:00.000Z` });
    adminAction("report_recorded", "report", id, { reference: reportRef(id), source: src, reason: a.p_reason });
    return reportRef(id);
  },
  admin_resolve_report: (a) => {
    requireAdmin();
    const note = trimmed(a.p_note).slice(0, 2000), tell = trimmed(a.p_tell).slice(0, 1000);
    if (note.length < 10) fail("Write what was done, in at least 10 characters. Only Handova sees this note.");
    const r = D.reports.find((x) => x.id === a.p_id); if (!r) fail("Report not found.");
    const from = r.status;
    Object.assign(r, { status: "resolved", admin_note: note, resolved_at: now() });
    if (tell) { r.outcome_message = tell; if (r.reporter_id) r.outcome_sent_at = now(); }
    adminAction("report_resolved", "report", r.id, { from, to: "resolved", reason: r.reason, note });
    if (tell && r.reporter_id) { notify(r.reporter_id, "report_outcome", "An update on the concern you reported", `Reference ${reportRef(r.id)}. ${tell}`, "#report"); adminAction("reporter_told", "report", r.id, { reference: reportRef(r.id), note: tell }); }
  },
  admin_reopen_report: (a) => {
    requireAdmin();
    const reason = trimmed(a.p_reason).slice(0, 600);
    if (reason.length < 5) fail("Say briefly why it is reopened.");
    const r = D.reports.find((x) => x.id === a.p_id && x.status === "resolved"); if (!r) fail("Only a resolved report can be reopened.");
    Object.assign(r, { status: "reviewing", resolved_at: null, admin_note: (`Reopened ${utcStamp().slice(0, 11)}: ${reason}` + (r.admin_note ? `\n\nEarlier: ${r.admin_note}` : "")).slice(0, 2000) });
    adminAction("report_reviewing", "report", r.id, { from: "resolved", to: "reviewing", reason: r.reason, note: r.admin_note });
  },
  admin_save_case: (a) => {
    requireAdmin();
    const sev = a.p_severity || "";
    if (!["", "urgent", "high", "standard"].includes(sev)) fail("Choose a severity.");
    if (!D.reports.some((r) => r.id === a.p_report)) fail("Report not found.");
    const F = ["protective_actions", "informed", "referral", "wishes", "decision", "outcome"];
    const next = { report_id: a.p_report, severity: sev, child_case: !!a.p_child_case, ...Object.fromEntries(F.map((k) => [k, String(a["p_" + k] || "").slice(0, 2000)])) };
    const old = D.report_cases.find((c) => c.report_id === a.p_report);
    if (old) {
      if (["severity", "child_case", ...F].every((k) => old[k] === next[k])) return;
      D.report_case_versions.push({ id: uid(), report_id: old.report_id, severity: old.severity, child_case: old.child_case, ...Object.fromEntries(F.map((k) => [k, old[k] || ""])), saved_at: old.updated_at, saved_by: old.updated_by, replaced_at: now(), replaced_by: me() });
      Object.assign(old, next, { updated_at: now(), updated_by: me() });
    } else D.report_cases.push({ ...next, updated_at: now(), updated_by: me() });
    adminAction("case_record_updated", "report", a.p_report, { reference: reportRef(a.p_report), severity: sev, child_case: !!a.p_child_case, first_save: !old });
  },
  admin_user_emails: (a) => { requireAdmin(); return D.users.filter((u) => (a.p_users || []).includes(u.id)).map((u) => ({ user_id: u.id, email: u.email })); },
  admin_decline_id_video: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const reason = trimmed(a.p_reason).slice(0, 600);
    if (reason.length < 10) fail("Explain briefly why the identity couldn’t be verified. The person sees this.");
    const r = D.id_video_requests.find((x) => x.user_id === a.p_user && x.status === "requested"); if (!r) fail("There is no open video-call request for this person.");
    Object.assign(r, { status: "declined", decided_at: now(), decided_by: me(), decline_reason: reason });
    adminAction("id_video_not_verified", "profile", a.p_user, { reason, name: D.profiles.find((p) => p.user_id === a.p_user)?.name });
    notify(a.p_user, "id_check", "We couldn’t verify your identity on the video call", `${reason} You can try the online identity check from your profile, or ask for another video call.`, "#workspace");
  },
  admin_integrity_signals: () => integritySignalsAll().map((g) => ({ seen_at: null, ...g, signal_key: signalKey(g) })).filter((g) => !D.integrity_signal_checks.some((c) => c.signal_key === g.signal_key && (!g.seen_at || c.checked_at >= g.seen_at))),
  admin_check_signal: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const g = integritySignalsAll().find((x) => signalKey(x) === a.p_key); if (!g) fail("This signal has changed or gone. Reload the page.");
    const note = trimmed(a.p_note).slice(0, 600);
    D.integrity_signal_checks = D.integrity_signal_checks.filter((c) => c.signal_key !== a.p_key).concat({ signal_key: a.p_key, kind: g.kind, title: g.title, detail: g.detail || "", note, checked_at: now(), checked_by: me() });
    adminAction("signal_checked", "signal", null, { title: g.title, name: g.detail || "", note, link: g.link });
  },
  admin_account_deletion_blocker: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    if (!a.p_user || a.p_user === me()) return "Use Account and privacy to delete your own account.";
    if (D.admins.some((x) => x.user_id === a.p_user)) return "An admin account can’t be deleted here.";
    if (!D.users.some((x) => x.id === a.p_user)) return "This account no longer exists.";
    return asUser(a.p_user, () => rpcs.account_deletion_blocker());
  },
  admin_delete_account: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const blocker = rpcs.admin_account_deletion_blocker(a);
    if (blocker) fail(blocker);
    const admin = me(), nm = D.profiles.find((p) => p.user_id === a.p_user)?.name || D.users.find((u) => u.id === a.p_user)?.user_metadata?.full_name || "";
    asUser(a.p_user, () => rpcs.delete_my_account());
    D.admin_actions.push({ id: uid(), admin_id: admin, action: "account_deleted", target_type: "profile", target_id: a.p_user, detail: { name: nm, reason: trimmed(a.p_reason).slice(0, 600) }, created_at: now() });
  },
  admin_restore_user_cv: (a) => {
    if (!isAdmin()) fail("Only Handova admins can do this.");
    const hit = D.engagements.filter((e) => e.user_id === a.p_user && e.hidden_by_handova);
    hit.forEach((e) => { e.hidden_by_handova = null; });
    if (hit.length) { adminAction("cv_entries_restored", "profile", a.p_user, { count: hit.length, note: a.p_note || "", name: D.profiles.find((p) => p.user_id === a.p_user)?.name }); notify(a.p_user, "cv", "Your impact CV entries are available again", "You can choose which contributions to show on your impact CV again from your workspace.", "#workspace"); }
    return hit.length;
  },
});
function needsInUse(org, except, withPending) { return D.needs.filter((n) => n.organisation_id === org && n.id !== except && (n.status === "open" || (withPending && n.status === "pending") || (n.status === "closed" && D.engagements.some((e) => e.need_id === n.id && ["awaiting_signatures", "active"].includes(e.status))))).length; }
// need_guard, open -> closed: everyone still waiting gets an answer.
function closeNeedApps(n) {
  for (const a of D.applications.filter((x) => x.need_id === n.id && x.status === "pending")) { Object.assign(a, { status: "declined", decided_at: now() }); closeConv(n.id, a.user_id, "Need closed"); notify(a.user_id, "application_decision", "The need you applied to is closed", n.title + ": it is no longer taking applications. Thank you for applying.", "#workspace"); }
  for (const i of D.invitations.filter((x) => x.need_id === n.id && x.status === "pending")) { Object.assign(i, { status: "declined", decided_at: now() }); notify(i.user_id, "invitation", "An invitation is no longer open", n.title + ": this need is no longer taking anyone new. Thank you.", "#workspace"); }
}
// update needs set status = 'closed' run by a server function (passes need_guard as Handova or the organisation).
function closeNeed(n) { if (n.status !== "open") return; Object.assign(n, { status: "closed", updated_at: now() }); closeNeedApps(n); }
function closeConv(need, user, reason) { const c = D.conversations.find((x) => x.need_id === need && x.user_id != null && x.user_id === user); if (c) Object.assign(c, { status: "closed", closed_reason: reason, closed_at: now() }); }
// conversation_for: the conversation for a need and professional, opened if needed.
function conversationFor(need, user) {
  let c = D.conversations.find((x) => x.need_id === need && x.user_id != null && x.user_id === user);
  if (!c) D.conversations.push((c = { id: uid(), need_id: need, user_id: user, status: "open", closed_reason: "", closed_at: null, created_at: now() }));
  else if (c.status !== "open") Object.assign(c, { status: "open", closed_reason: "", closed_at: null });
  return c;
}
// message_notify: Handova's own messages (and kept ones) don't send "New message" alerts.
function messageNotify(m, c) {
  if (m.kind !== "user") return;
  const n = D.needs.find((x) => x.id === c.need_id);
  if (m.sender_id != null && m.sender_id === c.user_id) notifyOrg(n.organisation_id, "message", "New message", n.title, "#conversation/" + c.id);
  else notify(c.user_id, "message", "New message", n.title, "#conversation/" + c.id);
}
function postMessage(c, sender, body, kind = "user") { const m = { id: uid(), conversation_id: c.id, sender_id: sender, body, kind, sender_closed_at: null, created_at: now() }; D.messages.push(m); messageNotify(m, c); return m; }
// kickoff_message (20261018000600): Handova's suggested first-call agenda, posted when both have signed.
function kickoffMessage(e) {
  const c = conversationFor(e.need_id, e.user_id), org = e.scope?.organisation ?? "the organisation";
  const s = D.contribution_signatures.find((x) => x.engagement_id === e.id && x.party === "organisation");
  const focal = s ? ((s.focal_point_name || "") + (s.focal_point_contact ? ` (${s.focal_point_contact})` : "")).trim() || null : null;
  const body = [
    "You have both signed. The next step is a short first call (30–45 minutes) to meet and plan the work. Reply here with two or three times that suit you, and say your time zone. Audio only is fine if data is limited.",
    "",
    "On the call, agree:",
    `1. Goal: what the finished work looks like and how ${org} will keep using it after handover.`,
    "2. Timing: the delivery date and any check-in dates.",
    `3. Contact person: who at ${org} answers questions and checks the work.`,
    "4. Reviews: how drafts are shared and checked, and who approves the final work.",
    "5. Out of scope: what this contribution does not cover.",
    "6. Keeping in touch: talk anywhere, but write decisions and changes here in Messages. Sharing phone numbers or personal emails is optional, and either of you can say no.",
    "7. Information and access: what is needed, shared through a secure channel the organisation chooses, and when access ends. Never passwords or card details.",
    `8. Safeguarding: ${focal ? "the focal point is " + focal : "the organisation's safeguarding focal point is named on the agreement page"}. Agree how either of you raises a concern.`,
    "",
    `Don't record the call or use AI note-takers unless everyone agrees at the start, and don't show anything about the people ${org} supports. After the call, one of you taps "Record what we agreed" so you both have the same written record.`,
  ].join("\n");
  postMessage(c, null, body.slice(0, 4000), "system");
}
// create_engagement (20261018000500): agreement v2, with the deadline and the professional's country in the frozen scope.
function engage(needId, user) {
  const n = D.needs.find((x) => x.id === needId), o = D.organisations.find((x) => x.id === n.organisation_id), p = D.profiles.find((x) => x.user_id === user);
  if (n.status !== "open") fail("This need is no longer open.");
  const filled = D.engagements.filter((e) => e.need_id === needId && e.status !== "ended").length;
  if (filled >= n.places) fail("All places on this need are already filled.");
  const id = uid();
  D.engagements.push({ id, need_id: needId, organisation_id: n.organisation_id, user_id: user, terms_version: "contribution-2026-10-v3", scope: { need_title: n.title, description: n.description, output: n.output, skills: n.skills, languages: n.languages, hours: n.hours, arrangement: n.arrangement, location: n.location, country: n.country, deadline: n.deadline ?? null, organisation: o.name, organisation_country: o.country, talent: p?.name ?? null, talent_country: p?.country ?? null }, talent_signed_name: "", talent_signed_at: null, org_signed_name: "", org_signed_by: null, org_signed_at: null, status: "awaiting_signatures", deliverables: "", endorsement: "", endorsed_by_role: "", public: false, published_at: null, first_call_at: null, first_call_by: null, first_call_written: false, end_reason: null, ended_at: null, ended_by: null, talent_delivered_at: null, confirmed_skills: [], show_endorser_name: true, created_at: now() });
  if (filled + 1 >= n.places) closeNeed(n);
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
  async signUp({ email, password, options }) { D = load(); if (D.users.some((x) => x.email === email)) return { data: {}, error: { message: "User already registered" } }; const user = { id: uid(), email, password, user_metadata: options?.data || {}, created_at: now() }; D.users.push(user); const m = user.user_metadata; if (m.terms_version) acceptTerms(user.id, String(m.terms_version), String(m.privacy_version || ""), "signup", { adult_confirmed: "adult_confirmed" in m ? m.adult_confirmed === true : null }); save(); return { data: { user, session: null }, error: null }; },
  async signInWithPassword({ email, password }) { D = load(); const user = D.users.find((x) => x.email === email && (x.password ? x.password === password : String(password).length > 0)); if (!user) return { data: {}, error: { message: "Invalid login credentials" } }; localStorage.setItem(SKEY, JSON.stringify({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } })); emit("SIGNED_IN"); return { data: { user, session: session() }, error: null }; },
  async signOut() { localStorage.removeItem(SKEY); emit("SIGNED_OUT"); return { error: null }; },
  async updateUser({ data, password }) { D = load(); const user = D.users.find((x) => x.id === me()); if (data) user.user_metadata = { ...user.user_metadata, ...data }; if (password) user.password = password; save(); localStorage.setItem(SKEY, JSON.stringify({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } })); return { data: { user }, error: null }; },
  async resetPasswordForEmail() { return { data: {}, error: null }; },
  // Reset links (W1): token_hash "expired" fails; otherwise it is the email address of the account to sign in.
  async verifyOtp({ token_hash, type }) { D = load(); const user = D.users.find((x) => x.email === token_hash); if (!user || type !== "recovery") return { data: {}, error: { message: "Email link is invalid or has expired", code: "otp_expired" } }; localStorage.setItem(SKEY, JSON.stringify({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } })); emit("PASSWORD_RECOVERY"); return { data: { user, session: session() }, error: null }; },
};

// Edge functions. Identity checks: the mock approves straight away, as if Didit had approved the document.
// account-delete: removes the member's identity records and photos, authorises delete_my_account for 5 minutes and runs it.
async function invokeFunction(name, body) {
  D = load(); const u = me();
  if (!u) return { data: null, error: { message: "Please sign in first." } };
  if (name === "account-delete" && body?.user_id && body.user_id !== u) {
    // An admin deleting someone else's account: same steps for that person, then admin_delete_account (20261020121400).
    if (!isAdmin()) return { data: null, error: { message: "Only Handova admins can delete another account." } };
    const blocker = rpcs.admin_account_deletion_blocker({ p_user: body.user_id });
    if (blocker) return { data: null, error: { message: blocker, context: { json: async () => ({ error: blocker }) } } };
    try {
      D.account_deletion_authorizations = D.account_deletion_authorizations.filter((x) => x.user_id !== body.user_id).concat({ user_id: body.user_id, verified_at: now() });
      rpcs.admin_delete_account({ p_user: body.user_id, p_reason: body.reason });
      save();
    } catch (err) { return { data: null, error: { message: err.message, context: { json: async () => ({ error: err.message }) } } }; }
    return { data: { ok: true }, error: null };
  }
  if (name === "account-delete") {
    // account-delete (re-audit L12): the function checks account_deletion_blocker first and stops before deleting anything.
    const blocker = rpcs.account_deletion_blocker();
    if (blocker) return { data: null, error: { message: blocker } };
    try {
      D.account_deletion_authorizations = D.account_deletion_authorizations.filter((x) => x.user_id !== u).concat({ user_id: u, verified_at: now() });
      rpcs.delete_my_account();
      save();
    } catch { return { data: null, error: { message: "Could not finish deleting your account. Please contact support." } }; }
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith(`ia-mock-file:avatars/${u}/`)) localStorage.removeItem(k); }
    return { data: { ok: true }, error: null };
  }
  if (name !== "id-verify") return { data: null, error: { message: `Edge function ${name} is not available in the local test backend.` } };
  const p = D.profiles.find((x) => x.user_id === u);
  if (!p) return { data: null, error: { message: "Create your professional profile first." } };
  if (body?.action === "start") {
    if (!D.id_consents.some((x) => x.user_id === u)) return { data: null, error: { message: "Please agree to the identity check first, then try again." } };
    if (p.id_status === "approved") return { data: null, error: { message: "Your identity is already verified." } };
    if (!p.id_status) p.id_status = "started";
    D.id_verifications.push({ id: uid(), user_id: u, provider: "didit", session_id: uid(), status: "Not Started", document_name: "", created_at: now(), updated_at: now() });
    save(); return { data: { url: "#verify-done" }, error: null };
  }
  if (body?.action === "check") {
    if (p.id_status === "started") {
      Object.assign(p, { id_status: "approved", id_verified_at: now(), id_document_name: p.name.toUpperCase() });
      const v = D.id_verifications.filter((x) => x.user_id === u).sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
      if (v) Object.assign(v, { status: "Approved", document_name: p.name.toUpperCase(), updated_at: now() });
      save();
    }
    return { data: { status: p.id_status }, error: null };
  }
  return { data: null, error: { message: "Unknown action" } };
}

export function createClient() {
  return {
    auth,
    from: (t) => new Query(t),
    functions: { invoke: (name, { body } = {}) => invokeFunction(name, body) },
    // Storage: files kept as data URLs in localStorage, so photo uploads work offline.
    storage: { from: (bucket) => ({
      async upload(path, blob) { const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); localStorage.setItem(`ia-mock-file:${bucket}/${path}`, url); return { data: { path }, error: null }; },
      getPublicUrl(path) { return { data: { publicUrl: localStorage.getItem(`ia-mock-file:${bucket}/${path}`) || "" } }; },
      async remove(paths) { paths.forEach((p) => localStorage.removeItem(`ia-mock-file:${bucket}/${p}`)); return { data: [], error: null }; },
    }) },
    rpc: (fn, args = {}) => ({ then(res, rej) { return Promise.resolve().then(() => { try { D = load(); if (!Object.hasOwn(rpcs, fn)) fail(`Could not find the function public.${fn} in the schema cache`, "PGRST202"); const data = rpcs[fn](args); save(); return { data: data ?? null, error: null }; } catch (e) { return { data: null, error: { message: e.message, code: e.code } }; } }).then(res, rej); } }),
  };
}
window.__iaMockEmit = (event) => emit(event);
window.__iaMockReset = () => { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); };
