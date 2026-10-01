import { state, e } from "../core.js";
import { icon, eyebrow, btn } from "../ui.js";
import { config } from "../config.js";

const page = (eb, title, lead, body) => `<div class="wrap" style="padding-bottom:80px"><div class="page-head">${eyebrow(eb)}<h1>${title}</h1><p class="lead">${lead}</p></div><article class="reading">${body}</article></div>`;
const mail = (addr) => `<a href="mailto:${e(addr)}">${e(addr)}</a>`;

export function privacy() {
  const body = `<p class="small muted">Last updated ${config.legalUpdated}</p>
  <h2>Who is responsible for your information</h2><p>Impact Accelerator is an initiative of Ethical Bridge. Ethical Bridge is responsible for deciding how personal information collected through Impact Accelerator is used. Write to ${mail(config.contactEmail)} with any privacy question or request.</p>
  <h2>What we collect</h2><ul>
    <li><strong>Account details:</strong> your email address and a securely hashed password.</li>
    <li><strong>Professional profiles:</strong> name, headline, introduction, experience, skills, languages, location, availability, an optional professional link, and your confirmations that you are 18 or over and that contributions are unpaid.</li>
    <li><strong>Organisations:</strong> name, country, city, type, website, a summary, and the name of the person who represents it.</li>
    <li><strong>Activity:</strong> needs, applications, invitations, messages, contribution agreements and signatures, logged hours, reviews, endorsements, private ratings, saved needs, notifications and reports of concern.</li>
    <li><strong>Technical information:</strong> our hosting and database providers keep short-term logs (such as IP address and browser) to run and secure the service.</li>
    <li><strong>Analytics:</strong> only if you accept analytics cookies, pages viewed and general device information, as described in the <a href="#cookies">cookie notice</a>.</li></ul>
  <h2>Why we use it</h2><ul>
    <li>To provide the service you signed up for: your account, matching, agreements, hours and your impact CV.</li>
    <li>To keep people safe: reviewing organisations and profiles before they are public, and handling reports of concern. This is in our legitimate interest and yours.</li>
    <li>To send you notifications about your applications, agreements and messages.</li>
    <li>To understand how the platform is used, only with your consent.</li></ul>
  <p>We do not sell your information or use it for advertising.</p>
  <h2>Who can see what</h2><ul>
    <li><strong>Public:</strong> your professional profile once you publish it and we approve it, including to search engines; approved organisations and their open needs; contributions you choose to publish on your impact CV.</li>
    <li><strong>Only the people involved:</strong> applications, invitations, messages, agreements and logged hours are visible to you and the members of the organisation concerned.</li>
    <li><strong>Only you:</strong> the private rating an organisation gives your work. The organisation that gave it also keeps a record of it.</li>
    <li><strong>Our administrators:</strong> can see profiles and organisations waiting for review, who is matched with whom, and reports. They read a conversation only when someone reports a concern about it.</li></ul>
  <h2>Service providers</h2><p>We use Supabase to store data and manage sign-in, hosted in the European Union (Frankfurt); GitHub Pages to publish the website; an email provider to send account emails and notifications; and, only with your consent, Google Analytics. Some providers may process information outside your country under appropriate safeguards.</p>
  <h2>How long we keep it</h2><p>We keep your account and profile until you delete them. When you delete your account, we remove your profile, applications and messages. Organisations keep an anonymised record of completed work, shown as “Former member”. Reports of concern are kept for as long as needed to handle them and for up to two years afterwards, for safety.</p>
  <h2>Your rights</h2><p>You can view and correct your profile at any time, unpublish it, and delete your account from <a href="#account">Account and privacy</a>. You can also ask us for a copy of your information, ask us to correct or erase it, object to how we use it, or ask us to restrict it, by writing to ${mail(config.contactEmail)}. You have the right to complain to your data protection authority.</p>
  <h2>Age</h2><p>Impact Accelerator is for people aged 18 and over.</p>
  <h2>Changes</h2><p>We will update this notice when the service changes and highlight important changes on the site.</p>`;
  return { title: "Privacy notice", description: "How Impact Accelerator uses your personal information.", html: page("Privacy", "Privacy notice", "What we collect, why, who can see it, and how to control it.", body) };
}

export function terms() {
  const body = `<p class="small muted">Last updated ${config.legalUpdated}</p>
  <h2>1. About Impact Accelerator</h2><p>Impact Accelerator is an initiative of Ethical Bridge. It connects locally led organisations with professionals who contribute their skills, unpaid, to needs the organisation defines. Contact: ${mail(config.contactEmail)}.</p>
  <h2>2. Who can use it</h2><p>You must be 18 or over. Organisations must be locally led and registered, or fiscally hosted by a registered organisation, and the person creating the account must be authorised to represent it. We review organisations and profiles before they become public and may decline or remove them.</p>
  <h2>3. Your account</h2><p>Keep your password safe and your information accurate. You are responsible for what happens under your account. You can delete your account at any time.</p>
  <h2>4. Contributions are voluntary</h2><p>Contributions are unpaid and voluntary. Nothing on Impact Accelerator creates employment, payment, partnership or agency between anyone. Any expenses or payment must be agreed in separate written terms between the organisation and the professional.</p>
  <h2>5. Contribution agreements</h2><p>Before any work begins, the organisation and the professional sign a contribution agreement on the platform. The agreement is between them. Impact Accelerator provides matching and record-keeping tools and is not a party to the work.</p>
  <h2>6. How everyone must behave</h2><ul>
    <li>Be honest about who you are, what you can do and what you need.</li>
    <li>Treat everyone with respect. No harassment, discrimination or abuse.</li>
    <li>Never share passwords, payment-card details, PINs or access codes on the platform.</li>
    <li>Share confidential information only after signing, and only what the work needs.</li>
    <li>Do not post needs involving direct contact with children or vulnerable adults, or access to their personal information.</li>
    <li>Do not use the platform for anything unlawful, misleading, or unrelated to its purpose, including advertising and recruitment for paid jobs.</li></ul>
  <h2>7. Your content</h2><p>You keep ownership of what you post. You allow us to display it on Impact Accelerator as the service requires, such as showing your published profile. Ownership of work delivered in an engagement is agreed between the organisation and the professional; by default the organisation owns the deliverables.</p>
  <h2>8. Safety and reports</h2><p>Anyone can report a concern. We may pause or remove accounts, needs or conversations, and we may contact the people involved, to keep the platform safe.</p>
  <h2>9. What we can and cannot promise</h2><p>We review organisations and profiles, but we do not verify identities, qualifications, background checks or the outcome of any work. A profile is not a licence or a background check. Make your own checks before sharing information or granting access. We aim to keep the service available but cannot guarantee it will always be uninterrupted.</p>
  <h2>10. Responsibility</h2><p>To the extent the law allows, we are not responsible for losses caused by users’ conduct, by information users choose to share, or by work agreed between users. Nothing in these terms limits responsibility for our own negligence, fraud, or anything else that cannot legally be limited, and your statutory rights are not affected.</p>
  <h2>11. Changes and law</h2><p>We may update these terms and will highlight important changes. The governing law will be confirmed with the final legal entity; until then, nothing in these terms reduces the rights you have under the law where you live.</p>`;
  return { title: "Terms of use", description: "The rules for using Impact Accelerator.", html: page("Terms", "Terms of use", "Simple rules that keep contributions safe, fair and useful for everyone.", body) };
}

export function cookies() {
  const body = `<p class="small muted">Last updated ${config.legalUpdated}</p>
  <h2>Necessary storage</h2><p>When you sign in, your browser stores a secure session so you stay signed in. We also remember your cookie choice. These are needed for the service to work and are not used to track you.</p>
  <h2>Analytics (optional)</h2><p>${config.gaMeasurementId ? "If you accept, we use Google Analytics to understand which pages are useful. It sets cookies such as <code>_ga</code> and sends information about your visit to Google. We don’t use it for advertising." : "We do not use analytics at the moment. If we add analytics, we will ask for your consent first."}</p>
  <h2>No advertising</h2><p>We don’t use advertising or social-media tracking cookies.</p>
  <h2>Your choice</h2><p>${config.gaMeasurementId ? "You can change your choice at any time." : "We only use essential storage, so there is nothing to accept or decline; the cookie box simply tells you this."} <button class="link-btn" type="button" data-action="cookie-settings">Show the cookie box again</button>. You can also clear your browser storage.</p>`;
  return { title: "Cookies", html: page("Cookies", "Cookie notice", "What we store on your device, and your choices.", body) };
}

export function safety() {
  const rules = [["pen", "Agree before you start", "Output, hours, deadlines, contact person, review process, what is out of scope and who owns the work."], ["lock", "Share the minimum", "Only after signing, only what the work needs, only through a secure channel. Never passwords, card details, PINs or access codes."], ["eye", "Keep people anonymous", "No beneficiary names, case files, identity documents or confidential research in profiles, needs or messages."], ["people", "No work with children or vulnerable adults", "Not accepted during the pilot. A profile is not a background check or a licence."], ["gift", "Unpaid, clearly", "Contributions are voluntary. Expenses or payment need separate written terms."], ["flag", "Pause if it feels wrong", "Either side can end a conversation or an engagement, and report a concern."]];
  const html = `<div class="wrap stack" style="--gap:40px;padding-bottom:80px"><div class="page-head">${eyebrow("Working responsibly")}<h1>Good intentions need good boundaries.</h1><p class="lead">Six rules apply to every engagement, whoever you are.</p></div>
    <div class="grid">${rules.map(([ic, t, d]) => `<div class="card stack" style="--gap:12px"><span class="icon-tile lg">${icon(ic, 26, "#0f6f63")}</span><h2 class="h3">${t}</h2><p class="muted">${d}</p></div>`).join("")}</div>
    <article class="reading"><h2>Regulated and higher-risk work</h2><p>Legal, medical, financial or other regulated advice needs appropriate qualifications and separate written terms. If a need turns out to involve direct contact with children or vulnerable adults, stop and report it.</p>
    <h2>Raise a concern</h2><p>Use <strong>Report a concern</strong> on any profile, need or conversation, or write to ${mail(config.safeguardingEmail)}. Our safeguarding lead reviews every report. If someone is in immediate danger, contact local emergency services first.</p></article>
    <div class="row">${btn("Report a concern", "#report", "dark")}${btn("How it works", "#how", "secondary")}</div></div>`;
  return { title: "Working responsibly", description: "The rules that keep every engagement safe.", html };
}

export function report() {
  const inner = state.user
    ? `<button class="btn dark lg" type="button" data-action="report" data-type="other" data-id="">Report a concern</button><p class="muted">You can also report directly from a profile, need or conversation.</p>`
    : `<p>Write to ${mail(config.safeguardingEmail)} describing what happened, or <a href="#signin?next=%23report">sign in</a> to report from the platform.</p>`;
  const html = `<div class="wrap" style="max-width:820px;padding-bottom:80px"><div class="page-head">${eyebrow("Safety")}<h1>Report a concern</h1><p class="lead">Our safeguarding lead reviews every report. If someone is in immediate danger, contact local emergency services first.</p></div><div class="card stack">${inner}</div></div>`;
  return { title: "Report a concern", html };
}
