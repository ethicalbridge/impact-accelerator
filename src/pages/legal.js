import { getLang } from "../i18n.js";
import { state, e, db, result, withForm, val, fieldError } from "../core.js";
import { icon, eyebrow, btn, field, select, formEnd } from "../ui.js";
import { config } from "../config.js";
import { date } from "../utils.js";
// Agreement texts and their reading copies are loaded only on the agreements page (they are large).

const page = (eb, title, lead, body) => `<div class="wrap" style="padding-bottom:80px"><div class="page-head">${eyebrow(eb)}<h1>${title}</h1><p class="lead">${lead}</p>${getLang() === "en" ? "" : `<p class="small muted binding-note">We translated this page so you can read it in your language. If the translation and the English version differ, the English version applies.</p>`}</div>${legalBody(body)}</div>`;
// A readable text column with a list of its sections (D19): on a laptop the list sits beside the text and scrolls
// within the screen height; on a phone it folds into an "On this page" button. Choosing a section moves focus to it.
// enOnly (the policies): the text and its headings stay in English, but "On this page" is translated (D26).
const legalBody = (body, enOnly = false) => {
  const en = enOnly ? ' lang="en" data-no-i18n' : "";
  const heads = [];
  const html = body.replace(/<h2>(.*?)<\/h2>/g, (_, t) => { const id = "sec-" + (heads.length + 1); heads.push([id, t]); return `<h2 id="${id}">${t}</h2>`; });
  if (heads.length < 3) return `<article class="reading"${en}>${html}</article>`;
  const list = `<ol${en}>${heads.map(([id, t]) => `<li><button type="button" data-action="scroll-to" data-id="${id}">${t}</button></li>`).join("")}</ol>`;
  return `<div class="legal-grid"><nav class="legal-toc" aria-label="On this page"><span class="eyebrow">On this page</span>${list}</nav><details class="toc-m"><summary>${icon("doc", 18)}<span>On this page</span><span class="toc-n">${heads.length}</span></summary><nav aria-label="On this page">${list}</nav></details><article class="reading"${en}>${html}</article></div>`;
};
// "Last updated" in the visitor's language, like the policy pages (W12).
const updated = () => { const legalUpdated = date(config.legalUpdated, { day: "numeric", month: "long", year: "numeric" }); return `<p class="small muted">Last updated ${legalUpdated}</p>`; };
const mail = (addr) => `<a href="mailto:${e(addr)}">${e(addr)}</a>`;

export function privacy() {
  const body = `${updated()}
  <h2>Who is responsible for your information</h2><p>Handova is an initiative of Ethical Bridge LLC, a limited liability company registered in Wyoming, United States. Ethical Bridge LLC decides how personal information collected through Handova is used. Write to ${mail(config.contactEmail)} with any privacy question or request. Our <a href="#policies/data-protection">Data Protection Policy</a> explains how we work in more detail. Where the EU or UK GDPR applies to us, we follow it, and Ethical Bridge LLC appoints an EU representative where Article 27 of the GDPR requires it.</p>
  <h2>What we collect</h2><ul>
    <li><strong>Account details:</strong> your email address and a securely hashed password.</li>
    <li><strong>Acceptance of our terms:</strong> which versions of the Terms of use and this notice you accepted, when, and your confirmation that you are 18 or over. We record this when you create your account and when you sign a new version of a Handova agreement.</li>
    <li><strong>Professional profiles:</strong> name, title, introduction, photo, country, time zone, languages, skills, roles and qualifications, the hours you commit each month, your LinkedIn profile link (required) and any other professional link, and your confirmations that you are 18 or over and that contributions are unpaid.</li>
    <li><strong>Conduct declaration:</strong> that you ticked the declaration that you have no relevant dismissals or convictions. We store only that you ticked it, never any details.</li>
    <li><strong>Identity check:</strong> the result (verified or not), the date and the name on your document. Our provider Didit compares a selfie with the photo on your passport or ID card; that comparison uses biometric data. Your document and selfie are processed by Didit and never stored by Handova. Only our administrators can see the name on your document. When you start the check we record your consent: the date and time and the wording you agreed to. If you prefer not to use Didit, you can ask for a short video call instead, where you show your ID to Handova on camera; we then record only that your identity was confirmed this way and the date.</li>
    <li><strong>Signed agreements:</strong> when you sign the professional or organisation agreement, your name (and role, for organisations), email address, the date and time, your IP address and browser, the hours you commit and the exact text you agreed to.</li>
    <li><strong>Organisations:</strong> name, country, city, type, website, a summary, its Ethical Bridge directory page, and the name of the person who represents it.</li>
    <li><strong>Team invitations:</strong> when an organisation invites a colleague to help manage it, the colleague’s email address, who sent the invitation, the date, and whether it is pending, accepted, declined or cancelled. An invitation lasts 30 days, and the person joins the team only if they accept it. Until then, the organisation sees only the email address it typed.</li>
    <li><strong>Activity:</strong> needs, applications, invitations, messages, contribution agreements and signatures, logged hours, reviews, endorsements, confirmed skills, private notes and the private “would you work together again” answer, saved needs, notifications, activity dates used for the inactivity rule, and reports of concern.</li>
    <li><strong>Handova decisions:</strong> when Handova approves, declines, suspends or removes a profile, organisation, need or contribution, we record who decided, when, what was decided and the note.</li>
    <li><strong>Questionnaires:</strong> after a contribution, and six months later for organisations, we ask a few optional questions about how it went. Answers can include free text. We also ask, once, whether an independent evaluator working for Handova may contact you about your experience.</li>
    <li><strong>Profile basics:</strong> an organisation’s number of paid staff (shown on its public page) and a professional’s career stage (private to Handova).</li>
    <li><strong>Reports made without an account:</strong> what you tell us and, only if you choose to give it, your email address so we can reply.</li>
    <li><strong>Technical information:</strong> our hosting and database providers keep short-term logs (such as IP address and browser) to run and secure the service.</li>
    <li><strong>Error reports:</strong> when a page fails in your browser, the site sends Handova the error message, the page name and the site version. Anything that looks like an email address or an ID is removed first, and we don’t record who you are, your IP address or your browser.</li></ul>
  <h2>Why we use it, and on what legal basis</h2><ul>
    <li><strong>To provide the service you asked for</strong> (contract): your account, profile, matching, agreements, hours, notifications and your impact CV.</li>
    <li><strong>To keep people safe and prevent misuse</strong> (legitimate interests): reviewing organisations and profiles before they are public, marking inactive profiles, keeping records of signed agreements, and handling reports of concern.</li>
    <li><strong>To verify your identity</strong> (your explicit consent): you give it when you start the identity check, and you can withdraw it by writing to us. Without a verified identity you cannot sign a contribution agreement.</li>
    <li><strong>To understand use of the website</strong> (your consent): if you choose Accept analytics, Google Analytics records page views so we can improve Handova. You can decline or withdraw this choice without losing access to the service.</li>
    <li><strong>To learn whether Handova helps</strong> (legitimate interests): questionnaire answers, career stage and team size, reported only as totals, never with names. An independent evaluator contacts you only if you said yes; we would share only your name and email with them, for that purpose only.</li>
    <li><strong>To meet legal obligations</strong> (legal obligation): for example, responding to authorities where the law requires it.</li></ul>
  <p>We do not sell your information or use it for advertising. Google Analytics is optional and starts only after you accept analytics cookies. It receives page views with generic page names, and may receive approximate location and browser or device information. We do not send profile names or private link details in Analytics page views. See our <a href="#cookies">cookie notice</a> for details and to change your choice.</p>
  <h2>Who can see what</h2><ul>
    <li><strong>Public:</strong> your professional profile once you publish it and we approve it (search engines may show it too); approved organisations, their number of paid staff and their open needs; contributions you choose to publish on your impact CV, with the endorser’s role and, if they chose to show it, their name.</li>
    <li><strong>Only the people involved:</strong> applications, invitations, messages, agreements and logged hours are visible to you and the members of the organisation concerned. On a signed agreement, each side sees the other’s name, role, signing time and the safeguarding focal point; your email, IP address and browser are seen only by you and Handova.</li>
    <li><strong>Across borders:</strong> organisations and professionals on Handova live in many countries. When you work with someone, they can see your profile, messages, agreement and logged hours wherever they are, and some countries protect personal data less than yours. Share only what the work needs.</li>
    <li><strong>Only you:</strong> the private note an organisation may write to you when it completes your contribution.</li>
    <li><strong>Only Handova:</strong> whether the organisation would welcome you on another need, and any note it adds (we use it to make better matches, and we talk to both sides before acting on a “No”); questionnaire answers; a professional’s career stage. Handova staff can see who gave each answer so they can follow up a concern; anything we publish or download for analysis uses totals or ID numbers, never names.</li>
    <li><strong>Our administrators:</strong> profiles and organisations waiting for review, identity-check results, signed agreements, who is matched with whom, and reports. They read a conversation only when it, or the contribution it belongs to, is reported.</li>
    <li><strong>Safeguarding:</strong> information about a concern is shared only with those who need to know. This can include the organisation’s safeguarding focal point for the contribution, our independent contact when a concern is about Handova’s founder, and the authorities where the law requires it or someone is in danger. While a concern is reviewed, we may hold back an endorsement, a private answer or an impact CV entry linked to it.</li>
    <li><strong>Photos and logos:</strong> profile photos and organisation logos are stored at web addresses that are hard to guess. Anyone who has the exact address can open the image, even before a profile is published.</li></ul>
  <h2>Service providers</h2><ul>
    <li><strong>Supabase</strong> stores data and manages sign-in, hosted in the European Union (Frankfurt).</li>
    <li><strong>GitHub Pages</strong> (United States) publishes the website.</li>
    <li><strong>Didit</strong> carries out identity checks under a data processing agreement. We send Didit your email address so it can link the check to your Handova account.</li>
    <li><strong>Google Analytics</strong> processes website usage information when you accept analytics. Google may process this information outside your country.</li>
    <li><strong>Hostinger</strong> (email hosting) sends account emails and notifications from hello@handova.org.</li></ul>
  <p>Where a provider processes information outside your country, including in the United States, we rely on safeguards such as the EU–US Data Privacy Framework or standard contractual clauses.</p>
  <h2>How long we keep it</h2><ul>
    <li><strong>Your account and profile:</strong> until you delete them, or until they have not been used for a long time. A profile closed for inactivity is kept, unpublished, so you can publish it again; if you don’t sign in for 24 months, we remind you and then delete it. An account with no profile and no organisation, such as a sign-up that was never finished, is treated the same way: after 24 months without signing in, we remind you and then delete it. An organisation suspended because its last member left is deleted after 24 months, after a reminder.</li>
    <li><strong>When you delete your account:</strong> we remove your profile, photos, applications, saved needs, notifications and identity checks, and your messages except those described under Messages below. Signed agreements are kept as described below. Organisations keep a private record of completed work (need, hours, what was handed over, endorsement and questionnaire answers) with your displayed name replaced by “Former member”. If you are the only member of an organisation, the organisation is suspended.</li>
    <li><strong>Record of accepting the Terms and this notice:</strong> kept for six years after you close your account, then deleted, like signed agreements.</li>
    <li><strong>Team invitations:</strong> an invitation can be accepted for 30 days. We keep the email address with the invitation’s status (pending, accepted, declined or cancelled) until the organisation is deleted, so the organisation and Handova can see who was invited and what happened.</li>
    <li><strong>Signed Handova professional or organisation agreements:</strong> the signature record, including your name, email, signing time, IP address, browser and agreement text, is kept for six years after you close your account, then deleted. This helps us respond to questions or legal claims about what was agreed.</li>
    <li><strong>Messages:</strong> Handova may post messages into a conversation, such as the suggested agenda for your first call. If you delete your account, your messages in conversations linked to a contribution or a reported concern are kept for six years, shown as “Former member”, then deleted; your other messages are deleted straight away.</li>
    <li><strong>Signed contribution agreements:</strong> for each contribution agreement you sign, we keep the signed text and its reference, your name, email, role (for organisations), the safeguarding focal point named, your confirmations, the language shown, signing time, IP address and browser. They are kept for six years after you close your account, then deleted, so both parties can rely on what was agreed.</li>
    <li><strong>Identity checks:</strong> Didit keeps verification sessions, including document and selfie images, for up to one year after verification under our current application setting. This gives us a limited period to review verification questions, suspected misuse or safety concerns. Didit deletes a face biometric template with its session; we have not enabled separate template retention. A shorter deadline may apply under the law. If you delete your Handova account sooner, we first request deletion of your Didit sessions. If that request fails, account deletion stops so the session is not lost from our records; contact ${mail(config.contactEmail)} for help. The verification result and document name stored by Handova are deleted with your account. You can also request an earlier review or deletion by writing to us.</li>
    <li><strong>Contribution records</strong> (the need, dates, hours, deliverables, endorsement and completion notes): kept by the organisation for six years after your account closes, then deleted. Once you delete your account they show “Former member” instead of your name, but that does not necessarily remove identifying details from the text the parties wrote. Write to ${mail(config.contactEmail)} to request a review of remaining personal information.</li>
    <li><strong>Questionnaire answers:</strong> with the contribution record. You can ask us to delete your answers at any time.</li>
    <li><strong>Reports of concern:</strong> six years after the case closes, or longer if legal proceedings are ongoing or expected. Cases involving a child are kept until the child turns 25 or for six years after closure, whichever is later. We review them once a year.</li>
    <li><strong>Records of Handova decisions:</strong> six years. <strong>Email notification log:</strong> 12 months. <strong>Privacy requests and data breach records:</strong> three years after they are closed.</li>
    <li><strong>Analytics:</strong> Google Analytics cookies may remain for up to two years unless you withdraw consent or clear them sooner. Analytics user and event data retention is set to two months. You can withdraw consent at any time in the cookie settings.</li>
    <li><strong>Error reports:</strong> 90 days.</li>
    <li><strong>Technical logs:</strong> for the short period our providers set, usually days to weeks.</li></ul>
  <h2>If something goes wrong</h2><p>If a data breach is likely to affect you, we will tell you and the relevant authority without undue delay.</p>
  <h2>Your rights</h2><p>You can view and correct your profile at any time, unpublish it, download a copy of your information with “Download my data”, and delete your account, all from <a href="#account">Account and privacy</a>. You can also ask us to correct or erase your information, object to how we use it, ask us to restrict it, or withdraw consent, by writing to ${mail(config.contactEmail)}. We reply within one month, and tell you if we need longer for a complex request. If you are unhappy with how we handle your information, you can complain to the data protection authority where you live or work where that right applies.</p>
  <h2>Age</h2><p>Handova is for people aged 18 and over.</p>
  <h2>Changes</h2><p>We will update this notice when the service changes and highlight important changes on the site.</p>`;
  return { title: "Privacy notice", description: "How Handova uses your personal information.", html: page("Privacy", "Privacy notice", "What we collect, why, who can see it, and how to control it.", body) };
}

export function terms() {
  const body = `${updated()}
  <h2>1. About Handova</h2><p>Handova is an initiative of Ethical Bridge LLC, registered in Wyoming, United States. It connects locally led organisations with professionals who contribute their skills, unpaid, to needs the organisation defines. Contact: ${mail(config.contactEmail)}.</p>
  <h2>2. Who can use it</h2><p>You must be 18 or over. Organisations must be non-profit, listed in the Ethical Bridge directory and locally led, and registered or fiscally hosted by a registered non-profit; businesses and other for-profit organisations can’t use Handova. The person creating an organisation account must be authorised to represent it. We review organisations and profiles before they become public and may decline or remove them.</p>
  <h2>3. Your account</h2><p>Keep your password safe and your information accurate. You are responsible for what happens under your account. You can delete your account at any time.</p>
  <h2>4. Contributions are voluntary</h2><p>Contributions are unpaid and voluntary. Nothing on Handova creates employment, payment, partnership or agency between anyone. Any expenses or payment must be agreed in separate written terms between the organisation and the professional.</p>
  <h2>5. Agreements you sign</h2><p>Before a professional profile is published, the professional signs the <strong>Handova professional agreement</strong>. Before an organisation is created, an authorised person signs the <strong>Handova organisation agreement</strong> on its behalf. Both include our safeguarding, protection from sexual exploitation and abuse, data and conduct standards, and they form part of these terms, as do <a href="#policies">our policies</a>, including the Code of Conduct. Before any work begins, the organisation and the professional also sign a contribution agreement for that piece of work. The contribution agreement is between them; Handova provides matching and record-keeping tools and is not a party to the work.</p>
  <h2>6. How everyone must behave</h2><ul>
    <li>Be honest about who you are, what you can do and what you need.</li>
    <li>Treat everyone with respect. No harassment, discrimination or abuse.</li>
    <li>Never share passwords, payment-card details, PINs or access codes on the platform.</li>
    <li>Share confidential information only after signing, and only what the work needs.</li>
    <li>Do not post or accept needs involving contact with the people an organisation serves. Professionals work with anonymised information, and contributions on Handova are remote.</li>
    <li>Never exploit or abuse anyone. Sexual exploitation and abuse lead to immediate removal, and anyone connected to Handova must report concerns within 24 hours.</li>
    <li>Log hours and write endorsements honestly. Never ask for or offer money, gifts or favours, and professionals never handle an organisation’s money.</li>
    <li>Never put personal, confidential, report, identity or safeguarding information into AI tools or personal accounts.</li>
    <li>Do not use the platform for anything unlawful, misleading, or unrelated to its purpose, including advertising and recruitment for paid jobs.</li></ul>
  <h2>7. Your content</h2><p>You keep ownership of what you post. You allow us to display it on Handova as the service requires, such as showing your published profile. How the organisation can use work delivered in an engagement is set out in the agreements the organisation and the professional sign.</p>
  <h2>8. Safety and reports</h2><p>Anyone can report a concern. We may pause or remove accounts, needs or conversations, contact the people involved, and share information with the authorities where the law or someone’s safety requires it. If we suspend or remove your account or organisation, you can ask for a review within 30 days by writing to ${mail(config.contactEmail)}; reviews are handled by our independent contact, as set out in <a href="#policies">our policies</a>. Report concerns to ${mail(config.safeguardingEmail)} or with Report a concern.</p>
  <h2>9. Staying active</h2><p>Professionals offer at least 4 hours a month of availability. A professional profile is marked inactive after three months without activity and closed after six, with a reminder two weeks before each step. A closed profile can be published again and is reviewed before it goes back online. If you are away or busy, reply to the reminder or write to us and we will keep your profile open.</p>
  <h2>10. What we can and cannot promise</h2><p>We review organisations and profiles, and professionals verify their identity with our provider before their first engagement. Didit handles the document and selfie used for that check; our <a href="#privacy">privacy notice</a> explains how long the verification data is kept. We do not verify qualifications, carry out background checks or guarantee the outcome of any work. A profile is not a licence or a background check. Make your own checks before sharing information or granting access. We aim to keep the service available but cannot guarantee it will always be uninterrupted.</p>
  <h2>11. Responsibility</h2><p>To the extent the law allows, we are not responsible for losses caused by users’ conduct, by information users choose to share, or by work agreed between users. Nothing in these terms limits responsibility for our own negligence, fraud, or anything else that cannot legally be limited, and your statutory rights are not affected.</p>
  <h2>12. Changes and law</h2><p>We may update these terms and will highlight important changes. These terms are governed by the law of Wyoming, USA. Nothing in these terms reduces the rights you have under the mandatory law of the country where you live.</p>`;
  return { title: "Terms of use", description: "The rules for using Handova.", html: page("Terms", "Terms of use", "Simple rules that keep contributions safe, fair and useful for everyone.", body) };
}

export function cookies() {
  const body = `${updated()}
  <h2>Necessary storage</h2><p>Your browser stores a secure session so you stay signed in, and remembers your language and cookie choices. For the current visit only, it also keeps small settings such as which organisation you are working on and, while you sign up, the email address you typed. These are needed for the service to work and are not used to track you.</p>
  <h2>Analytics (optional)</h2><p>${config.gaMeasurementId ? "Only if you select Accept analytics, we load Google Analytics to understand page views. It uses <code>_ga</code> to distinguish visitors and <code>_ga_*</code> to maintain session state; Google's default lifetime for both is up to two years. Information about your visit is sent to Google. Analytics user and event data retention is set to two months. We do not use Analytics for advertising. If you decline, the Analytics tag is not loaded." : "We do not use analytics at the moment. If we add analytics, we will ask for your consent first."}</p>
  <h2>No advertising</h2><p>We don’t use advertising or social-media tracking cookies.</p>
  <h2>Your choice</h2><p>${config.gaMeasurementId ? "You can accept or decline, and change your choice at any time. If you withdraw consent, we remove the Analytics cookies we can access on this site and reload the page without the Analytics tag. This does not erase information already received by Google." : "We only use essential storage, so there is nothing to accept or decline; the cookie box simply tells you this."} <button class="link-btn" type="button" data-action="cookie-settings">Change cookie choice</button>. You can also clear your browser storage.</p>`;
  return { title: "Cookies", html: page("Cookies", "Cookie notice", "What we store on your device, and your choices.", body) };
}

// The rules for working responsibly. Shown on its own page and on About › FAQ & safety.
export function workingResponsibly({ withConcern = true, nested = false, policyLinks = true } = {}) {
  const hx = nested ? "h3" : "h2";
  const rules = [["pen", "Agree before you start", "Output, hours, deadlines, contact person, review process, what is out of scope and how the organisation can use the work."], ["lock", "Share the minimum", "Only after signing, only what the work needs, only through a secure channel. Never passwords, card details, PINs or access codes."], ["eye", "Keep people anonymous", "No beneficiary names, case files, identity documents or confidential research in profiles, needs or messages."], ["people", "Remote, and no contact with people at risk", "Contributions are remote. Professionals never contact the people an organisation serves, and work with anonymised information. A profile is not a background check or a licence."], ["gift", "Unpaid, clearly", "Contributions are voluntary. No payment, gifts or favours, and professionals never handle an organisation’s money."], ["flag", "Pause if it feels wrong", "Either side can end a contribution, giving a short reason, and report a concern."]];
  return `    <div class="grid">${rules.map(([ic, t, d]) => `<div class="card stack" style="--gap:12px"><span class="icon-tile lg">${icon(ic, 26, "#0f6f63")}</span><${hx} class="h3">${t}</${hx}><p class="muted">${d}</p></div>`).join("")}</div>
    <div class="wr-cols"><div class="wr-col card"><span class="icon-tile lg">${icon("alert", 26, "#0f6f63")}</span><${hx} class="h3">Regulated and higher-risk work</${hx}><p>Legal, medical, financial or other regulated advice needs appropriate qualifications and separate written terms. If a need turns out to involve direct contact with children or adults at risk, stop and report it.</p></div>
    <div class="wr-col card"><span class="icon-tile lg">${icon("shield", 26, "#0f6f63")}</span><${hx} class="h3">Protection from sexual exploitation and abuse</${hx}><p>We follow the IASC six core principles. Sexual exploitation and abuse are gross misconduct and lead to immediate removal. No sexual activity with anyone under 18, and never exchange money, work, help or favours for sex. Everyone connected to Handova must report concerns. <a href="#report">How to report</a></p></div>
    <div class="wr-col card"><span class="icon-tile lg">${icon("lock", 26, "#0f6f63")}</span><${hx} class="h3">Data and AI tools</${hx}><p>Share only what the work needs, anonymised where possible. Never put personal, confidential, report, identity or safeguarding information into AI tools or personal accounts. Report a data breach to the other party and to Handova within 24 hours.</p></div>
${withConcern ? `<div class="wr-col card"><span class="icon-tile lg">${icon("flag", 26, "#0f6f63")}</span><${hx} class="h3">Raise a concern</${hx}><p>Use <strong>Report a concern</strong> on any profile, need or conversation, or write to ${mail(config.safeguardingEmail)}. Report within 24 hours. Our safeguarding lead reviews every report, keeps it confidential and never penalises anyone for raising a concern they honestly believe in. Concerns about Handova’s founder go to our independent contact. If someone is in immediate danger, contact local emergency services first.</p></div>` : ""}</div>
    ${policyLinks ? `<p class="small muted wr-policies">The full rules: <a href="#policies/code-of-conduct">Code of Conduct</a> · <a href="#policies/safeguarding">Safeguarding Policy</a> · <a href="#policies">all our policies</a></p>` : ""}`;
}

export function safety() {
  const html = `<div class="wrap stack" style="--gap:40px;padding-bottom:80px"><div class="page-head">${eyebrow("Working responsibly")}<h1>Good intentions need good boundaries.</h1><p class="lead">Every professional and every organisation signs an agreement with these standards before they start. Six rules apply to every contribution, whoever you are.</p></div>
${workingResponsibly()}
    <div class="row">${btn("Report a concern", "#report")}${btn("How it works", "#how", "secondary")}</div></div>`;
  return { title: "Working responsibly", description: "The rules that keep every contribution safe.", html };
}

export async function agreements(which) {
  const { PRO_AGREEMENT_VERSION, ORG_AGREEMENT_VERSION, platformAgreementView, loadAgreementCopy } = await import("../agreement.js");
  await loadAgreementCopy();
  const org = which === "organisation";
  const title = org ? "Handova organisation agreement" : "Handova professional agreement";
  const lead = org ? `Read it before you join. An authorised person signs it for the organisation when creating the organisation account. Version ${ORG_AGREEMENT_VERSION}.` : `Read it before you join. You sign it when creating your profile. Version ${PRO_AGREEMENT_VERSION}.`;
  const other = org ? btn("Read the professional agreement", "#agreements/professional", "secondary") : btn("Read the organisation agreement", "#agreements/organisation", "secondary");
  // Summary, full text, reading copy and Download PDF come from agreement.js; the English text is the one people sign.
  const html = `<div class="wrap" style="padding-bottom:80px"><div class="page-head">${eyebrow("Agreements")}<h1>${title}</h1><p class="lead">${lead}</p></div>
    <article class="reading agr-page">${platformAgreementView(org ? "organisation" : "professional", e, { title })}</article>
    <div class="row no-print" style="margin-top:32px">${other}${btn("How it works", "#how", "secondary")}</div></div>`;
  return { title, description: "The agreement every " + (org ? "organisation" : "professional") + " signs before joining Handova.", html };
}

// The Handova policies (version 1.0, approved 20 October 2026). The text lives in assets/policies as HTML
// fragments with a PDF of each; it is in English only.
export const POLICIES = [
  ["safeguarding", "Safeguarding Policy and Procedure", "How we keep children, adults at risk and everyone on Handova safe, and what happens when someone reports a concern."],
  ["code-of-conduct", "Code of Conduct", "The standards everyone on Handova agrees to: respect for local leadership, honesty, care and safety."],
  ["anti-harassment", "Anti-Harassment, Intimidation and Bullying Policy and Procedure", "How we prevent and respond to harassment, bullying, intimidation and discrimination."],
  ["data-protection", "Data Protection Policy", "How Handova collects, uses, protects and deletes personal information."],
  ["fraud", "Fraud, Bribery and Corruption Policy and Procedure", "How we prevent, spot and respond to fraud, bribery, corruption and misuse of Handova."],
  ["whistleblowing", "Whistleblowing Policy and Procedure", "How anyone can raise a concern about wrongdoing safely, including about Handova itself."],
];
const policyPdf = (slug) => `assets/policies/handova-${slug}-v1.0.pdf`;
const enNote = () => (getLang() === "en" ? "" : `<p class="small muted binding-note">Our policies are available in English only for now.</p>`);

export function policies() {
  const cards = POLICIES.map(([slug, title, sum]) => `<div class="card stack policy-card" style="--gap:10px"><h2 class="h3"><a href="#policies/${slug}">${title}</a></h2><p class="muted">${sum}</p><div class="row" style="--gap:8px"><a class="btn sm" href="#policies/${slug}" aria-label="${e(`Read the ${title}`)}">Read</a><a class="btn secondary sm" href="${policyPdf(slug)}" download aria-label="${e(`Download PDF of the ${title}`)}">Download PDF</a></div></div>`).join("");
  const html = `<div class="wrap" style="padding-bottom:80px"><div class="page-head">${eyebrow("Trust and safety")}<h1>Our policies</h1><p class="lead">The rules behind every contribution on Handova. They form part of the agreements professionals and organisations sign.</p>${enNote()}<p class="small muted">Version 1.0, approved on 20 October 2026 by Julieta Castiñeira de Dios, founder. Handova is run by Ethical Bridge LLC, registered in Wyoming, USA.</p></div>
    <div class="grid policy-grid">${cards}</div>
    <div class="card stack" style="--gap:10px;margin-top:32px"><h2 class="h3">Something worrying you?</h2><p class="muted">Report it on the platform, or write to ${mail(config.safeguardingEmail)}. If someone is in immediate danger, contact local emergency services first.</p><div class="row">${btn("Report a concern", "#report")}${btn("Working responsibly", "#safety", "secondary")}</div></div></div>`;
  return { title: "Our policies", description: "Handova’s safeguarding, conduct, anti-harassment, data protection, fraud and whistleblowing policies.", html };
}

export async function policy(slug) {
  const found = POLICIES.find(([s]) => s === slug);
  if (!found) return { redirect: "#policies" };
  const [, title, sum] = found;
  let text = "";
  try {
    const r = await fetch(`assets/policies/${slug}.html?v=1.0`);
    if (!r.ok) throw Error("missing");
    text = await r.text();
  } catch { text = `<p>This policy could not be loaded. <a href="${policyPdf(slug)}" download>Download the PDF</a> instead.</p>`; }
  const head = `<div class="page-head">${eyebrow("Our policies")}<h1>${title}</h1><p class="lead">${sum}</p>${enNote()}<p class="small muted">Version 1.0 · Approved on 20 October 2026 · Owner: Julieta Castiñeira de Dios · Next review: October 2027</p><div class="row" style="--gap:8px"><a class="btn secondary sm" href="${policyPdf(slug)}" download>${icon("doc", 16)} Download PDF</a>${btn("All policies", "#policies", "secondary sm")}</div></div>`;
  const html = `<div class="wrap policy-page" style="padding-bottom:80px">${head}${legalBody(text, true)}</div>`;
  return { title, description: sum, html };
}

export function contact() {
  const card = (ic, title, addr, text, extra = "") => `<div class="card stack contact-card" style="--gap:12px"><span class="icon-tile lg">${icon(ic, 26, "#0f6f63")}</span><h2 class="h3">${title}</h2><p class="contact-addr"><a href="mailto:${e(addr)}">${e(addr)}</a></p><p class="muted">${text}</p>${extra}</div>`;
  const html = `<div class="wrap stack" style="--gap:32px;padding-bottom:80px"><div class="page-head">${eyebrow("Contact")}<h1>Get in touch</h1><p class="lead">We read every message. We usually reply within two working days.</p></div>
    <div class="grid contact-grid">
      ${card("mail", "Questions about Handova", config.contactEmail, "Your account, needs and contributions, how Handova works, partnerships, and privacy requests.")}
      ${card("shield", "Concerns and safeguarding", config.safeguardingEmail, "Safety, harassment, abuse, fraud or anything that worries you. You don’t need proof, and you can stay anonymous. If someone is in immediate danger, contact local emergency services first.", `<div class="row" style="--gap:8px">${btn("Report a concern", "#report", "sm")}</div>`)}
      ${card("globe", "The Ethical Bridge directory", "hello@ethicalbridge.org", "Joining or updating your organisation’s listing in the Ethical Bridge directory, which organisations need to use Handova.", `<a class="small" href="https://ethicalbridge.org/" target="_blank" rel="noopener">ethicalbridge.org <span class="visually-hidden">(opens in a new tab)</span></a>`)}
    </div>
    <p class="small muted">Handova is run by Ethical Bridge LLC, registered in Wyoming, USA. Read <a href="#policies">our policies</a> and our <a href="#privacy">privacy notice</a>.</p></div>`;
  return { title: "Contact", description: "Contact Handova: questions, concerns and safeguarding, and the Ethical Bridge directory.", html };
}

// The same reasons as the report form on profiles, needs and conversations. Nothing is preselected (D16).
export const REPORT_REASONS = [["", "Choose one…"], ["exploitation", "Sexual exploitation or abuse"], ["safety", "A child or adult at risk, or another safety concern"], ["harassment", "Harassment or inappropriate behaviour"], ["fraud", "Fraud, payment requests or false hours"], ["misleading", "Misleading or false information"], ["privacy", "Privacy or data"], ["spam", "Spam"], ["other", "Something else"]];

// People without an account can report here too (L17): no sign-in, email optional, a reference shown on screen.
const publicReportForm = () => `<form class="form public-report" data-form="public-report">
    <div class="stack" style="--gap:6px"><h2 class="h3" id="pr-title">Report without an account</h2><p class="muted">No account needed. Our safeguarding lead reads every report and keeps it confidential.</p></div>
    ${select("reason", "What is the concern?", REPORT_REASONS, "", { full: true, required: true })}
    ${field("details", "What happened?", { type: "textarea", required: true, full: true, attrs: 'minlength="10" maxlength="4000" rows="6"', hint: "What happened, who or which page it is about, and when. You don’t need proof." })}
    ${field("email", "Your email (optional)", { type: "email", full: true, attrs: 'maxlength="254" autocomplete="email"', hint: "Only if you want a reply. Leave it empty to stay anonymous; we then can’t update you." })}
    <div class="hp-field" aria-hidden="true"><label>Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
    ${formEnd("Send report")}
  </form>`;

export async function submitPublicReport(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Please complete the form."); }
    const email = val(fd, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw fieldError(form.elements.email, "Check the email address, or leave it empty.");
    // A filled hidden field means a bot: thank it and send nothing.
    const ref = val(fd, "website") ? "" : await result(db.rpc("submit_public_report", { p_reason: val(fd, "reason"), p_details: val(fd, "details"), p_email: email }));
    const box = document.createElement("div");
    box.className = "stack public-report-done";
    box.setAttribute("role", "status");
    box.innerHTML = `<span class="icon-tile lg">${icon("check", 28, "#0f6f63")}</span><h2 class="h3" tabindex="-1">We received your report</h2>${ref ? `<p>Your reference is <strong data-no-i18n>${e(String(ref))}</strong>. Please note it down: quote it if you write to us about this report.</p>` : ""}<p>${email ? "We’ll reply to the email address you gave if we need more information." : "You didn’t leave an email address, so we can’t update you. You can write to us at any time and quote your reference."}</p><p class="muted">If someone is in immediate danger, contact local emergency services first.</p>`;
    form.parentElement?.querySelector(".report-alt")?.setAttribute("hidden", "");
    form.replaceWith(box);
    box.querySelector("h2").focus();
  });
}

export function report() {
  const inner = state.user
    ? `<div class="row"><button class="btn dark lg" type="button" data-action="report" data-type="other" data-id="">Report a concern</button></div><p class="muted">You can also report directly from a profile, need or conversation.</p>`
    : `${publicReportForm()}<div class="stack report-alt" style="--gap:10px"><strong>Or, if you prefer</strong><div class="row">${btn(`Email ${e(config.safeguardingEmail)}`, `mailto:${e(config.safeguardingEmail)}`, "secondary")}${btn("Sign in to report on the platform", "#signin?next=%23report", "secondary")}</div></div>`;
  const more = `<div class="card stack" style="--gap:10px"><h2 class="h3">Good to know</h2><ul class="bullets"><li>You don’t need proof. Report any concern you honestly believe in.</li><li>You can stay anonymous: leave the email empty, or write from an email address that doesn’t identify you. We may then be unable to update you.</li><li>You get a reference straight away, on screen or in your notifications. We reply to emails within 2 working days, the same day if someone may be at risk.</li><li>If your concern is about Handova’s founder, it goes to our independent contact (to be confirmed soon) instead. Until then, write to ${mail(config.safeguardingEmail)} and say so; you can also raise it with the authorities.</li><li>We never penalise anyone for raising a concern.</li></ul><p class="small muted">How we handle reports: <a href="#policies/safeguarding">Safeguarding Policy</a> · <a href="#policies/whistleblowing">Whistleblowing Policy</a> · <a href="#policies/anti-harassment">Anti-Harassment Policy</a></p></div>`;
  const html = `<div class="wrap stack" style="--gap:24px;padding-bottom:80px"><div class="page-head">${eyebrow("Safety")}<h1>Report a concern</h1><p class="lead">Our safeguarding lead reviews every report. If someone is in immediate danger, contact local emergency services first.</p></div><div class="card stack">${inner}</div>${more}</div>`;
  return { title: "Report a concern", html };
}
