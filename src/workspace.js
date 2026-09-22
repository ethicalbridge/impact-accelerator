import { conversationButton } from "./messages.js";
import { agreementButton } from "./agreements.js";
import {
  db,
  state,
  e,
  date,
  link,
  btn,
  empty,
  head,
  result,
  members,
  profile,
  needCard,
  workspaceTabs,
  gate,
  profileGate,
} from "./core.js";
export async function workspace() {
  if (!state.user)
    return gate(
      "Keep your profile, applications, invitations and saved needs together.",
    );
  const p = await profile();
  if (!p) return profileGate();
  const [apps, invites, saved, items] = await Promise.all([
    result(
      db
        .from("ia_applications")
        .select("*,need:ia_needs(title)")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false }),
    ),
    result(
      db
        .from("ia_invitations")
        .select("*,need:ia_needs(title)")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false }),
    ),
    result(
      db
        .from("ia_saved")
        .select("need:ia_needs(*,organisation:organisations(public_name))")
        .eq("user_id", state.user.id),
    ),
    result(
      db.from("ia_hours").select("hours,status").eq("user_id", state.user.id),
    ),
  ]);
  return (
    workspaceTabs("workspace") +
    `<div class="section-head"><div><span class="eyebrow">Your next contribution</span><h1>Hello, ${e(p.name.split(" ")[0])}.</h1><p>Build your profile, explore opportunities and keep track of the conversations that matter.</p></div>${btn("Edit profile", "edit-profile")}</div><div class="metric-grid"><div class="metric"><strong>${p.hours_available} h</strong><small>available / month</small></div><div class="metric"><strong>${items.filter((i) => i.status === "approved").reduce((total, i) => total + Number(i.hours), 0)}</strong><small>approved hours</small></div><div class="metric"><strong>${apps.filter((a) => a.status === "pending").length}</strong><small>pending applications</small></div></div><div class="banner">${p.published ? "Your profile is published and discoverable." : "Your profile is private. Publish it when you are ready to be discovered and apply to needs."} <a href="#profile/${state.user.id}">Preview profile →</a></div><div class="split"><section><h2>Applications</h2>${apps.length ? apps.map((a) => `<article class="row"><div><h3><a href="#need/${a.need_id}">${e(a.need?.title || "Support need")}</a></h3><span class="status">${e(a.status)}</span><p>${e(a.message)}</p>${conversationButton(a.need_id, a.user_id)}${a.status === "accepted" ? agreementButton(a.need_id, a.user_id) : ""}</div>${a.status === "pending" ? btn("Withdraw", "withdraw", a.id, "secondary") : ""}</article>`).join("") : empty("Find your next contribution", "Explore organisational needs and send a considered application.", '<a class="button secondary" href="#needs">Explore needs</a>')}<div class="section-head"><h2>Invitations</h2></div>${invites.length ? invites.map((i) => `<article class="card"><h3><a href="#need/${i.need_id}">${e(i.need?.title || "Support need")}</a></h3><span class="status">${e(i.status)}</span><p>${e(i.message)}</p>${conversationButton(i.need_id, i.user_id)}${i.status === "accepted" ? agreementButton(i.need_id, i.user_id) : ""}${i.status === "pending" ? `<div class="actions">${btn("Accept invitation", "accept-invite", i.id)}${btn("Decline", "decline-invite", i.id, "secondary")}</div>` : ""}</article>`).join("") : empty("No invitations yet", "A published profile and thoughtful portfolio help organisations find you.")}</section><aside class="side-card"><h3>Make your profile useful</h3><p>Keep your availability current. Your impact record grows through contributions and organisation review.</p><a href="#profile/${state.user.id}" class="button secondary">View profile & impact record →</a><div class="actions"><a href="#hours">Record impact hours →</a></div></aside></div><div class="section-head"><h2>Saved needs</h2></div><div class="grid">${
      saved.filter((s) => s.need).length
        ? saved
            .filter((s) => s.need)
            .map((s) => needCard(s.need))
            .join("")
        : empty(
            "Keep interesting needs close",
            "Save a need from its detail page and return to it here.",
          )
    }</div>`
  );
}
export async function organisation() {
  if (!state.user)
    return gate(
      "Sign in with your Ethical Bridge organisation account to publish needs and find professional support.",
    );
  const ms = await members();
  if (!ms.length)
    return (
      workspaceTabs("organisation") +
      head(
        "Organisation workspace",
        "Start with your organisation.",
        "Impact Accelerator uses Ethical Bridge organisation membership so your identity and verification stay in one place.",
      ) +
      empty(
        "Connect your organisation through Ethical Bridge",
        "Register or sign in to Ethical Bridge to set up your organisation. Then return here using the same account. If your organisation already exists, ask its account owner to arrange your access.",
        '<a class="button" href="https://ethicalbridge.org/" target="_blank" rel="noopener">Open Ethical Bridge ↗</a>',
      )
    );
  const ids = ms.map((m) => m.organisation_id);
  const needs = await result(
    db
      .from("ia_needs")
      .select("*")
      .in("organisation_id", ids)
      .order("created_at", { ascending: false }),
  );
  const needIds = needs.map((n) => n.id);
  const [apps, hours, invites] = needIds.length
    ? await Promise.all([
        result(
          db
            .from("ia_applications")
            .select("*,person:ia_profiles(name)")
            .in("need_id", needIds)
            .order("created_at", { ascending: false }),
        ),
        result(
          db
            .from("ia_hours")
            .select("*,person:ia_profiles(name)")
            .in("need_id", needIds)
            .order("created_at", { ascending: false }),
        ),
        result(
          db
            .from("ia_invitations")
            .select("*,person:ia_profiles(name)")
            .in("need_id", needIds),
        ),
      ])
    : [[], [], []];
  const name = (id) =>
    e(needs.find((n) => n.id === id)?.title || "Support need");
  return (
    workspaceTabs("organisation") +
    `<div class="section-head"><div><span class="eyebrow">${ms.map((m) => e(m.organisation?.public_name || m.organisation?.registered_name)).join(" · ")}</span><h1>Organisation workspace</h1><p>Define the support you need. Discover talent through evidence of their work.</p></div>${btn("＋ Create a need", "add-need")}</div>${ms.some((m) => m.organisation?.status !== "published") ? '<div class="banner">An organisation awaiting Ethical Bridge publication can save drafts. Public needs become available once its directory profile is published.</div>' : ""}<div class="metric-grid"><div class="metric"><strong>${needs.filter((n) => n.status === "open").length}</strong><small>open needs</small></div><div class="metric"><strong>${apps.filter((a) => a.status === "pending").length}</strong><small>applications to review</small></div><div class="metric"><strong>${hours.filter((h) => h.status === "pending").length}</strong><small>time entries to review</small></div></div><div class="section-head"><h2>Your needs</h2><a href="#talent">Discover talent →</a></div>${needs.length ? needs.map((n) => `<article class="row"><div><span class="status">${e(n.status)}</span><h3><a href="#need/${n.id}">${e(n.title)}</a></h3><small>${n.hours} hours · ${e(n.arrangement)}</small></div><div class="actions">${btn("Edit need", "edit-need", n.id, "secondary")}</div></article>`).join("") : empty("Make your first request specific", "Describe an achievable output, the skills involved and the expected time commitment.", btn("Create a need", "add-need"))}<div class="section-head"><h2>Applications</h2></div>${apps.length ? apps.map((a) => `<article class="card"><div class="row"><div><span class="status">${e(a.status)}</span><h3>${a.person ? `<a href="#profile/${a.user_id}">${e(a.person.name)}</a>` : "Profile is currently private"}</h3><small>${name(a.need_id)}</small><p class="prose">${e(a.message)}</p>${conversationButton(a.need_id, a.user_id)}${a.status === "accepted" ? agreementButton(a.need_id, a.user_id) : ""}</div>${a.status === "pending" ? `<div class="actions">${btn("Accept", "accept-application", a.id)}${btn("Decline", "decline-application", a.id, "secondary")}</div>` : ""}</div></article>`).join("") : empty("Applications will appear here", "Applicants must publish their professional profile before applying.")}<div class="section-head"><h2>Invitations sent</h2></div>${invites.length ? invites.map((i) => `<article class="row"><div><h3>${e(i.person?.name || "Professional")}</h3><p>${name(i.need_id)}</p>${conversationButton(i.need_id, i.user_id)}${i.status === "accepted" ? agreementButton(i.need_id, i.user_id) : ""}</div><span class="status">${e(i.status)}</span></article>`).join("") : empty("Find someone whose work fits", "Visit a talent profile to invite them to one of your open needs.")}<div class="section-head"><h2>Hour reviews</h2></div>${hourRows(hours, true, needs)}<div class="banner">Applications, invitations and agreements are kept in these workspaces. Both parties must sign before contribution hours can be recorded. Email notifications are not enabled; check here for responses.</div>`
  );
}
function hourRows(rows, review = false, needs = []) {
  return rows.length
    ? rows
        .map(
          (h) =>
            `<article class="row"><div><span class="status">${e(h.status.replaceAll("_", " "))}</span><h3>${h.hours} hours · ${date(h.work_date)}</h3><small>${e(h.person?.name || "Your contribution")} · ${e(needs.find((n) => n.id === h.need_id)?.title || h.need?.title || "Support need")}</small><p class="prose">${e(h.description)}</p>${link(h.evidence, "Supporting evidence")}${h.deliverables ? `<p><b>Deliverables / outcomes:</b> ${e(h.deliverables)}</p>` : ""}${h.feedback ? `<p><b>Organisation feedback:</b> ${e(h.feedback)} ${h.rating ? `· ${"★".repeat(h.rating)}${"☆".repeat(5 - h.rating)}` : ""}</p>` : ""}${h.review_note ? `<p><b>Review note:</b> ${e(h.review_note)}</p>` : ""}${h.status === "changes_requested" ? "<p><small>The original entry is retained. Submit a corrected entry with the requested changes.</small></p>" : ""}</div>${review && h.status === "pending" && h.user_id !== state.user.id ? `<div class="actions">${btn("Approve", "approve-hours", h.id)}${btn("Request changes", "changes-hours", h.id, "secondary")}</div>` : !review && h.status === "approved" ? `<div class="actions">${btn(h.public ? "Remove from public profile" : "Publish on my profile", h.public ? "hide-contribution" : "publish-contribution", h.id, h.public ? "secondary" : "")}</div>` : ""}</article>`,
        )
        .join("")
    : empty(
        "No time entries yet",
        review
          ? "Time submitted by accepted talent will appear here for review."
          : "After an application or invitation is accepted, record the time you contribute.",
      );
}
export async function hours() {
  if (!state.user)
    return gate(
      "Track your contributions and keep organisation-approved hours separate from pending entries.",
    );
  const rows = await result(
    db
      .from("ia_hours")
      .select("*,need:ia_needs(title)")
      .eq("user_id", state.user.id)
      .order("work_date", { ascending: false }),
  );
  const sum = (status) =>
    rows
      .filter((r) => r.status === status)
      .reduce((a, r) => a + Number(r.hours), 0);
  return (
    workspaceTabs("hours") +
    `<div class="section-head"><div><span class="eyebrow">A record of your contribution</span><h1>Impact hours</h1><p>Only organisation-approved entries count towards approved hours.</p></div>${btn("＋ Log time", "log-time")}</div><div class="metric-grid"><div class="metric"><strong>${sum("approved")} h</strong><small>organisation approved</small></div><div class="metric"><strong>${sum("pending")} h</strong><small>awaiting review</small></div><div class="metric"><strong>${sum("changes_requested")} h</strong><small>changes requested</small></div></div>${hourRows(rows)}<div class="banner">An approval records the reviewer and date. Submitted entries are retained to preserve the review history.</div>`
  );
}
