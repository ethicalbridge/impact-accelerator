import {
  db,
  state,
  e,
  tags,
  btn,
  field,
  check,
  formEnd,
  result,
  showDialog,
} from "./core.js";
import { responsibility } from "./alliance.js";

export const agreementButton = (needId, userId) =>
  btn("Review agreement", "agreement", `${needId}/${userId}`, "secondary");
const signed = (value) =>
  value
    ? `Signed ${new Date(value).toLocaleDateString()}`
    : "Signature required";

export async function agreement(key) {
  const [needId, userId] = key.split("/");
  await result(
    db.rpc("ia_prepare_agreement", { p_need_id: needId, p_user_id: userId }),
  );
  const a = await result(
    db
      .from("ia_agreements")
      .select("*")
      .eq("need_id", needId)
      .eq("user_id", userId)
      .single(),
  );
  const s = a.scope_snapshot,
    talent = state.user.id === a.user_id;
  const complete = a.talent_signed_at && a.organisation_signed_at;
  const already = talent ? a.talent_signed_at : a.organisation_signed_at;
  const party = talent ? "talent" : "organisation";
  showDialog(
    "Contribution agreement",
    `<div class="agreement-status ${complete ? "complete" : ""}"><span class="eyebrow">Agreement ${e(a.terms_version)}</span><h3>${complete ? "Ready to begin" : "Signatures required before work begins"}</h3><div><span>Talent · ${e(s.talent)}<b>${signed(a.talent_signed_at)}</b></span><span>Organisation · ${e(s.organisation)}<b>${signed(a.organisation_signed_at)}</b></span></div></div><section class="agreement-document"><p><b>Parties:</b> ${e(s.talent)} and ${e(s.organisation)}</p><h3>1. Agreed contribution</h3><p><b>Need:</b> ${e(s.need_title)}</p><p>${e(s.description)}</p><p><b>Expected output:</b> ${e(s.output)}</p><div class="agreement-facts"><span><b>${e(s.estimated_hours)}</b> estimated hours</span><span><b>${e(s.arrangement)}</b> arrangement</span><span><b>${e((s.languages || []).join(" · ") || "Not specified")}</b> working language(s)</span></div><h3>2. Scope and communication</h3><p>The parties will confirm timing, points of contact, what is out of scope, review steps, expenses and any dependencies before work begins. Changes require both parties’ agreement.</p><h3>3. Confidentiality, data and access</h3><p>Each party will use confidential information only for this contribution, share the minimum necessary, follow applicable data-protection and safeguarding duties, and report loss or unauthorised access promptly.</p><p><strong>Passwords, payment-card details, PINs and one-time access codes must never be shared through Impact Accelerator.</strong> System access must use individual, limited-permission accounts and be removed when no longer needed.</p><h3>4. Deliverables and public evidence</h3><p>The organisation keeps ownership of its confidential information. Ownership and permitted reuse of deliverables must be agreed before work begins. Nothing confidential may appear in a public impact CV. Contribution details, hours, outcomes, ratings or feedback become public only through the platform’s applicable review and consent process.</p><h3>5. Relationship and platform role</h3><p>This agreement records a voluntary professional contribution unless the parties separately agree otherwise in writing. It does not create employment, partnership or agency, promise payment, replace professional licensing, or make Impact Accelerator a party to the contribution.</p><h3>6. Responsibility</h3>${responsibility}<p>The parties remain responsible for their conduct, decisions, legal compliance, permissions, information and access. Impact Accelerator provides matching and record-keeping tools; it does not supervise or guarantee either party’s work, identity, statements, suitability or outcomes.</p><h3>7. Safety and ending the contribution</h3><p>Either party should pause or end the contribution if scope, conduct, safeguarding or access becomes unsafe. Legal, medical, financial, child-related or other regulated work requires appropriate qualifications, supervision and separate terms.</p><p class="agreement-note">This standard template records the platform agreement. It is not legal advice and does not replace additional terms required for a particular jurisdiction, regulated activity or high-risk engagement.</p></section>${already ? `<div class="banner">Your signature has been recorded and cannot be edited. ${complete ? "Both parties have signed; contribution hours can now be recorded." : "The other party still needs to sign."}</div>` : `<form data-form="agreement" data-id="${e(a.id)}" data-party="${party}" class="form-grid agreement-sign">${check("scope", "I have read and agree to the scope, expected output, estimated hours and working languages.")}${check("security", "I agree to the confidentiality, minimum-access and sensitive-data rules, including never sharing passwords, card details, PINs or access codes through the platform.")}${check("terms", "I have read and agree to all sections above, including the responsibilities, platform role and limits.")}${field("signature_name", "Type your full name to sign", "", "text", true, 'minlength="2" maxlength="160" autocomplete="name"')}${formEnd("Sign agreement")}</form>`}`,
  );
}
