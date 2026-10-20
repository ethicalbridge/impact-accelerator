// Agreements signed on Handova. The exact text shown is sent with the signature and stored with its SHA-256 hash,
// so we can always show what someone agreed to. Change the version whenever the text changes: everyone is then
// asked to sign again. Versions must match public.current_agreement() in the database.
export const PRO_AGREEMENT_VERSION = "professional-2026-10-20-v3";
export const ORG_AGREEMENT_VERSION = "organisation-2026-10-20-v3";

// Shared standard on sexual exploitation and abuse: the IASC Six Core Principles (2019).
const PSEA = [
  "Sexual exploitation and abuse are acts of gross misconduct and grounds for immediate removal from Handova.",
  "No sexual activity with anyone under 18, whatever the local age of consent. Mistaken belief about someone’s age is not a defence.",
  "Never exchange money, work, help, services or favours for sex or sexual favours, or any other humiliating, degrading or exploitative behaviour.",
  "Any sexual relationship with the people an organisation serves that involves improper use of position is prohibited. On Handova, professionals have no personal contact with them at all.",
  "If you have a concern or suspicion about sexual exploitation or abuse by anyone connected to Handova, you must report it.",
  "Everyone is responsible for creating and maintaining an environment that prevents sexual exploitation and abuse.",
];

// Where the policies live on the site; they form part of both platform agreements.
const POLICIES = "the Handova Code of Conduct and the Handova policies on safeguarding, anti-harassment, data protection, fraud and whistleblowing, published at handova.org/#policies";

export const PRO_AGREEMENT = [
  ["About this agreement", [
    "Handova is a free platform, run by Ethical Bridge LLC, registered in Wyoming, USA, that connects skilled professionals with locally led non-profit organisations. This agreement is between you and Ethical Bridge LLC. It sets out what we ask of you, what you can expect from us, and how we keep everyone safe: you, the organisations and the people they serve. Please read it carefully. You sign it once, and we keep a record of it.",
  ]],
  ["1. Who can join", [
    "You are 18 or older.",
    "You join as yourself. Your name, photo, experience and education are true and match your LinkedIn profile. We may ask for a short video call or a reference before approving you.",
    "Before you sign your first contribution agreement, you verify your identity with our identity-check provider, Didit, using a valid passport or ID card and a live selfie. Handova receives only the result and the name on your document, never the images. If you prefer not to use Didit, you can ask for a short video call instead, where you show your ID to Handova on camera.",
    "You confirm that you have never been dismissed, or left during an investigation, for sexual exploitation, abuse or harassment, that you have never been convicted of an offence against a child or an adult at risk, and that you are not barred from working with children or adults at risk. We record only that you confirmed this. We never ask for details or records.",
    "You tell us promptly if anything important changes, including anything in the point above.",
  ]],
  ["2. Your monthly commitment", [
    "You commit to a number of hours a month, at least 4. You choose the number on your profile and can change it at any time.",
    "Organisations plan around the hours you show, so only offer time you can really give.",
  ]],
  ["3. Keeping the community active", [
    "Handova works because organisations can count on the people they find here. Their time is precious, and we don’t want them to spend it contacting profiles that are no longer active.",
    "Activity means applying to a need, accepting an invitation, working on an engagement or having work endorsed by an organisation.",
    "If three months pass without any activity, your profile is marked inactive. It stays online, but organisations see that you have not been active recently.",
    "If six months pass without any activity, we close your profile. It is unpublished and no longer visible to organisations.",
    "We will remind you by email two weeks before each step. Any activity makes your profile active again straight away, and an engagement in progress always counts. A contribution that ended because you raised a concern never counts against you.",
    "Closing is not a penalty. You can publish your profile again whenever you are ready, and we will review it before it goes back online.",
  ]],
  ["4. Voluntary, unpaid and remote", [
    "Contributions are voluntary and unpaid. They do not create a job, an employment contract, a partnership or an agency relationship with Handova, Ethical Bridge LLC or the organisation.",
    "You never ask for or accept payment, gifts, hospitality or favours connected to a Handova contribution. Any expenses need separate written terms agreed with the organisation before you spend anything.",
    "You never receive, hold or move an organisation’s money.",
    "You do not use Handova to sell services, recruit clients or offer paid work. If a paid role at the organisation comes up independently, you apply through its normal open process, not through Handova.",
    "Contributions on Handova are remote. In-person meetings are not part of Handova, and hours spent in person are not logged on Handova.",
  ]],
  ["5. How engagements work", [
    "Before any work starts, you and the organisation sign a contribution agreement that sets out the output, the hours, access and confidentiality. You do no work, and receive no confidential information, before it is signed.",
    "You keep to the agreed scope and hours. If the work grows, you agree the change with the organisation first.",
    "You log your hours honestly and only for work you actually did. Inventing or inflating hours, endorsements or evidence is fraud and leads to removal.",
    "You hand over the work so the team can keep using it, with any explanation or training it needs.",
    "If you can no longer continue, you tell the organisation as early as possible and end the engagement through Handova.",
  ]],
  ["6. Safeguarding and do no harm", [
    `You follow ${POLICIES}, and the organisation’s own code of conduct and safeguarding policy where it has one. Where they differ, the stricter rule applies.`,
    "You never contact, meet, message or follow on social media the people an organisation serves, and you never move contact with them off Handova. You may design surveys, interviews or tests, but the organisation’s own staff run them.",
    "You work with anonymised or aggregated information. You see identifiable personal data about the people an organisation serves only if the work cannot be done without it and this is agreed in writing in Handova Messages before it is shared. You never receive data or images about children, case files, identity documents, shelter locations or anything that reveals a named person’s immigration, detention, health, survivor or sexual orientation status.",
    "If a need turns out to involve contact or data beyond what was agreed, you stop and report it.",
    "If you already know someone the organisation serves, you tell the organisation and Handova before the work starts.",
    "You never abuse, exploit, harass, bully or discriminate against anyone, online or offline.",
    "You do not take, ask for or share photos, videos, stories or information about the people an organisation serves, and you never use images of children.",
    "You respect local leadership: the organisation decides what it needs and how its work is done.",
    "You do not use an engagement to promote religious, political or commercial views.",
  ]],
  ["7. Protection from sexual exploitation and abuse", PSEA],
  ["8. Reporting concerns", [
    "If you see, suspect or are told about harm, abuse, exploitation or fraud, you report it within 24 hours to the organisation’s safeguarding focal point and to Handova at safeguarding@handova.org, or with Report a concern. If someone is in immediate danger, contact local emergency services first.",
    "If you are harassed yourself, we encourage you to report it as soon as you can, but the choice is yours.",
    "If the concern involves the organisation itself or its focal point, report it only to Handova. If it is about Handova’s founder, it goes to Handova’s independent contact, as set out in our Whistleblowing Policy.",
    "Report any concern you honestly believe in. You do not need proof. You will not be penalised for raising a concern, even if it turns out to be unfounded, and you never retaliate against anyone who raises one.",
    "You do not investigate a concern yourself. You cooperate with any review by the organisation, Handova or the authorities, and keep it confidential.",
  ]],
  ["9. Confidentiality, data and security", [
    "You keep the organisation’s information confidential, during the engagement and afterwards, and use it only for the agreed work.",
    "For any personal data, you act only on the organisation’s instructions. You see and keep only what the work needs, and you return or delete it at handover.",
    "You never put personal, confidential, report, identity or safeguarding information into AI tools, personal cloud accounts or other services.",
    "You use only the accounts and access the organisation gives you, with strong passwords and two-step sign-in where available. You never share passwords, payment-card details, PINs or access codes through Handova, and you hand back all access when the work ends.",
    "If data is lost, shared by mistake or accessed by someone who should not have it, you tell the organisation and Handova within 24 hours and help put it right.",
  ]],
  ["10. Conflicts of interest and your other commitments", [
    "You declare in writing to the organisation and Handova any conflict of interest, for example a personal, family, financial or professional link to the organisation, its staff, funders or suppliers. You go ahead only if Handova and the organisation agree how it is managed.",
    "You are never endorsed by an organisation you lead, work for or have a close family link to.",
    "You make sure your contribution is allowed by your employer or any other contract you have, and you do not use your employer’s confidential information, time or resources without permission.",
    "You comply with the law that applies to you, including tax, data protection and any rules on volunteering where you live.",
  ]],
  ["11. Professional advice, quality and insurance", [
    "Your contribution supports the organisation’s own decisions. Legal, medical, financial, tax or other regulated advice is only given if you are qualified, it is agreed in the contribution agreement, and any separate terms your profession requires are in place.",
    "You do your work with reasonable care and skill, and you are honest about what you can and cannot do.",
    "You tell the organisation if you used AI tools to produce a substantial part of the work, and you check anything they produce.",
    "Handova does not provide insurance for professionals. If your work calls for professional indemnity or other insurance, arranging it is your responsibility.",
  ]],
  ["12. Representing the organisation and talking about the work", [
    "You do not speak, publish, sign, raise funds or make commitments on behalf of the organisation unless it asks you to in writing.",
    "You only use its name, logo or materials for the agreed work and to describe your contribution in general terms. Anything more detailed, you agree with the organisation first, and you never share anything confidential.",
  ]],
  ["13. The work you hand over", [
    "Unless you agree otherwise in writing with the organisation, you give the organisation a free, permanent, irrevocable and worldwide right to use, copy, adapt and share the work you hand over for its mission, including with its partners and funders. As far as the law allows, you will not object to the organisation changing it.",
    "You keep anything you created before or outside the engagement, and your general know-how. Where any of it is included in the work, the same right applies to it.",
    "You only hand over work you have the right to share, without third-party material the organisation cannot use.",
    "You may describe the work on your Handova impact CV and show non-confidential parts of it elsewhere, for example in a portfolio.",
  ]],
  ["14. Your wellbeing", [
    "Set boundaries that work for you. You are never expected to do more than the agreed hours, to work at unreasonable times, or to continue if you feel unsafe or uncomfortable. Tell us if an organisation puts pressure on you.",
  ]],
  ["15. Our role", [
    "Handova reviews organisations and profiles and provides the tools to agree, track and review work. We are not a party to the work between you and the organisation, we do not supervise it, and we cannot guarantee any outcome.",
    "Our reviews and identity checks are not background checks, and a profile or organisation page is not a licence or a guarantee.",
    "To the extent the law allows, Ethical Bridge LLC is not responsible for losses arising from the work arranged between you and an organisation. Nothing in this agreement limits responsibility for our own negligence, fraud, or anything else that cannot legally be limited.",
  ]],
  ["16. Breaches, suspension and reviews", [
    "If you break this agreement or put anyone at risk, we may pause your engagements, hide or close your profile, hold back or remove endorsements and impact CV entries, and tell the organisations you work with. For serious concerns we may act straight away, and we may share information with the authorities where the law or someone’s safety requires it.",
    "If we suspend or close your profile, you can ask for a review within 30 days by writing to hello@handova.org. Reviews are handled by Handova’s independent contact, as set out in our policies.",
  ]],
  ["17. Your data and this record", [
    "We handle your data as described in our privacy notice and Data Protection Policy. Your profile is public only when you publish it and we approve it.",
    "When you sign, we store your name, email address, the date and time, your IP address and browser, the hours you committed, the confirmations you ticked and the exact text you agreed to. We keep this record for six years after your account closes, so both sides can rely on it, even if you delete your account.",
    "For the identity check, Didit processes your document and selfie as our service provider, under a data processing agreement with us. Comparing your selfie with your document photo uses biometric data, which is processed only with your explicit consent, given and recorded when you start the check. We keep only the result, the date and the name on the document, which only our administrators can see.",
  ]],
  ["18. Law, changes and contact", [
    "This agreement is governed by the law of Wyoming, USA. This does not take away any protection you have under the mandatory law of the country where you live. If a disagreement arises, we will first try to resolve it with you informally.",
    "If we change this agreement, we will tell you and ask you to sign the new version before your profile can be published again or you sign a new contribution agreement.",
    "Questions? Write to hello@handova.org. Concerns: safeguarding@handova.org.",
  ]],
];

export const ORG_AGREEMENT = [
  ["About this agreement", [
    "Handova is a free platform, run by Ethical Bridge LLC, registered in Wyoming, USA, that connects locally led non-profit organisations with skilled professionals who give their time voluntarily. This agreement is between your organisation and Ethical Bridge LLC. It sets out what we ask of your organisation, what you can expect from us, and how we keep everyone safe: your team, the professionals and the people you serve. The person signing does so on behalf of the organisation.",
  ]],
  ["1. Who can join", [
    "Your organisation is a non-profit and locally led: its leadership is based where it works, and it does not distribute profits to owners. Businesses and for-profit companies cannot join. It is legally registered, or fiscally hosted by a registered non-profit, and it is listed in the Ethical Bridge directory.",
    "The person signing is authorised to act for the organisation and to accept this agreement on its behalf. We may confirm this with the contact in your Ethical Bridge directory entry, or by an email at your organisation’s own web address.",
    "Everything you tell us about the organisation is true and up to date. We may ask for registration documents, a reference or a short call before approving you.",
    "Your organisation, its leaders and its partners are not involved in terrorism, violence, hate, discrimination, trafficking, corruption or any other unlawful activity. Help is never conditional on anyone’s religion, politics or identity.",
    "You tell us promptly about any change to the above, or any serious incident or investigation involving your organisation.",
  ]],
  ["2. Needs you publish", [
    "Each need is real, describes one clear output and takes at most 16 hours. You only ask for work you will actually use.",
    "Needs are remote. They never involve direct contact between professionals and children or adults at risk, including surveys, interviews, testing, groups or helplines. Your own staff run any of these.",
    "Professionals work with anonymised or aggregated information. Identifiable personal data about the people you serve is shared only if the work cannot be done without it, you may lawfully share it, and this is agreed in writing in Handova Messages before it is shared. You never share data or images about children, case files, identity documents, shelter locations or anything that reveals a named person’s immigration, detention, health, survivor or sexual orientation status.",
    "Needs never involve professionals receiving, holding or moving your organisation’s money, or regulated advice without the right qualifications and separate terms.",
    "Needs do not replace a paid role or ongoing staff duties, and are not unpaid trials for a job.",
    "You do not use Handova to advertise, fundraise from professionals, or recruit for paid work.",
  ]],
  ["3. How you work with professionals", [
    "Before any work starts, you sign a contribution agreement with the professional. You share no confidential information, and give no access, before it is signed.",
    "You give the professional a named contact, a clear brief, the information they need and timely feedback. You reply to applications and messages within a reasonable time, usually within a week.",
    "You keep to the agreed scope and hours. You never pressure a professional to do more, work at unreasonable times, or continue if they wish to stop.",
    "You never ask professionals for money, fees, gifts or favours, and you never offer them payment, gifts or hospitality. Any expenses need separate written terms agreed before they are spent.",
    "You declare any conflict of interest with a professional, for example a family or work link, and go ahead only if Handova agrees how it is managed. You never endorse a professional who leads or works for your organisation or is a close family member of someone who does.",
    "You review logged hours honestly within 14 days. When the work is complete, the person who saw the work writes a fair, truthful endorsement in their own words, and you answer a short check-in six months later about whether the work is still in use.",
  ]],
  ["4. Safeguarding", [
    `You follow ${POLICIES} for every Handova contribution, and your own safeguarding policy where you have one. Where they differ, the stricter rule applies.`,
    "You name a safeguarding focal point for each contribution when you sign its contribution agreement, and you brief the professional on how to raise a concern before the work begins.",
    "You give the people you serve a way to raise concerns, and you pass any concern about a Handova professional to Handova.",
    "You never share images of children for a Handova contribution, and you share no photos, videos or stories of adults without your own consent process.",
    "You treat professionals with dignity and respect, and never harass, exploit or discriminate against them.",
  ]],
  ["5. Protection from sexual exploitation and abuse", PSEA],
  ["6. Reporting and responding to concerns", [
    "If you become aware of a concern involving a professional, a Handova engagement or anyone connected to it, you tell Handova within 24 hours at safeguarding@handova.org or with Report a concern. If someone is in immediate danger, contact local emergency services first. Concerns about Handova’s founder go to Handova’s independent contact, as set out in our Whistleblowing Policy.",
    "You respond to concerns in line with the law and your own policies, put the safety and wishes of the person affected first, keep information confidential, and cooperate with any review by Handova or the authorities.",
    "You never retaliate against anyone who raises a concern they honestly believe in.",
  ]],
  ["7. Data protection and security", [
    "Your organisation remains responsible for the personal data it holds. You share only the minimum the work needs, anonymised wherever possible, through a secure channel you choose.",
    "You never ask a professional to put personal or confidential information into AI tools or personal accounts.",
    "You never share passwords, payment-card details, PINs or access codes through Handova. Where a professional needs access to a system, you give them their own account with the least access needed, and you remove it when the work ends.",
    "You tell the professional and Handova within 24 hours if you suspect information connected to a Handova contribution has been lost, shared by mistake or accessed without permission.",
  ]],
  ["8. Using the work", [
    "Unless you agree otherwise in writing, the professional gives your organisation a free, permanent, irrevocable and worldwide right to use, copy, adapt and share the work they hand over for your mission, including with your partners and funders.",
    "The work supports your decisions; your organisation remains responsible for them and for its own legal, financial and regulatory obligations. Take your own qualified advice where needed.",
    "The professional may describe the work on their Handova impact CV and show non-confidential parts of it elsewhere. You do not name or show a professional publicly without their agreement.",
  ]],
  ["9. Visibility", [
    "Once approved, your organisation’s name, logo, location, summary and published needs are public on Handova. Completed work, your endorsement and the hours handed over may appear on the professional’s impact CV and in Handova’s anonymised impact reporting.",
  ]],
  ["10. Our role", [
    "Handova reviews organisations and profiles and provides the tools to agree, track and review work. We are not a party to the work between you and a professional, we do not supervise it, and we cannot guarantee any outcome.",
    "Our reviews and identity checks are not background checks, and a profile is not a licence or a guarantee. You remain responsible for your own checks, policies and decisions.",
    "To the extent the law allows, Ethical Bridge LLC is not responsible for losses arising from the work arranged between you and a professional. Nothing in this agreement limits responsibility for our own negligence, fraud, or anything else that cannot legally be limited.",
  ]],
  ["11. Breaches, suspension and reviews", [
    "If your organisation breaks this agreement or puts anyone at risk, we may pause its needs and engagements, hold back or remove endorsements, suspend or remove it, and tell the professionals involved. For serious concerns we may act straight away, and we may share information with the authorities, the Ethical Bridge directory or relevant regulators where the law or someone’s safety requires it.",
    "You can ask for a review of a suspension or removal within 30 days by writing to hello@handova.org. Reviews are handled by Handova’s independent contact, as set out in our policies.",
  ]],
  ["12. Data and this record", [
    "We handle personal data as described in our privacy notice and Data Protection Policy.",
    "When you sign, we store the signatory’s name, role, email address, the date and time, IP address and browser, the confirmations ticked and the exact text agreed to. We keep this record for six years after the organisation’s account closes, so both sides can rely on it.",
  ]],
  ["13. Law, changes and contact", [
    "This agreement is governed by the law of Wyoming, USA. This does not take away any protection your organisation has under the mandatory law of the country where it is registered. If a disagreement arises, we will first try to resolve it with you informally.",
    "If we change this agreement, we will tell you and ask you to sign the new version before you publish new needs.",
    "Questions? Write to hello@handova.org. Concerns: safeguarding@handova.org.",
  ]],
];

const asText = (title, version, sections) =>
  `${title} (${version})\n\n` + sections.map(([h, items]) => `${h}\n${items.map((t) => `- ${t}`).join("\n")}`).join("\n\n");
export const proAgreementText = () => asText("Handova professional agreement", PRO_AGREEMENT_VERSION, PRO_AGREEMENT);
export const orgAgreementText = () => asText("Handova organisation agreement", ORG_AGREEMENT_VERSION, ORG_AGREEMENT);

// The agreement shown as readable HTML (escaping is done by the caller's e()).
export const agreementHtml = (sections, esc) => sections.map(([h, items], i) => `<h3>${esc(h)}</h3>${i === 0 ? `<p>${esc(items[0])}</p>` : `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`}`).join("");

// ---------- Contribution agreement (signed by the organisation and the professional for one need) ----------
// The exact text each party signs is built from the frozen scope and this template, and saved with its hash.
// v2 added parties, changes, ownership, liability, data roles, ending and disputes.
// v3 (20 Oct 2026) aligns with the Handova policies: a licence instead of a transfer, liability only for deliberate
// wrongdoing or gross negligence, no personal data in AI tools, the written exception for personal data.
// Older versions are kept below so signed agreements always show exactly as they were signed.
export const CONTRIBUTION_VERSION = "contribution-2026-10-v3";
const CONTRIBUTION_V2 = "contribution-2026-10-v2";
const deadlineText = () => "Delivery date: agreed by both parties in their first call and recorded in Handova Messages.";
export function contributionSections(s = {}, version = CONTRIBUTION_VERSION) {
  const org = s.organisation || "the organisation", pro = s.talent || "the professional";
  const common3 = "Each party uses confidential information only for this contribution and shares the minimum necessary, through an agreed secure channel. **Passwords, payment-card details, PINs and access codes are never shared through Handova.** Any system access uses individual, limited accounts that are removed when the work ends. Confidential or personal information is never put into AI tools or personal accounts without the organisation’s written permission, and is returned or deleted at handover. A suspected data breach is reported to the other party and to Handova within 24 hours.";
  if (version === CONTRIBUTION_VERSION) {
    const common3v3 = "Each party uses confidential information only for this contribution and shares the minimum necessary, through an agreed secure channel. **Passwords, payment-card details, PINs and access codes are never shared through Handova.** Any system access uses individual, limited accounts that are removed when the work ends. Personal, confidential, report, identity or safeguarding information is never put into AI tools or personal accounts, and is returned or deleted at handover. A suspected data breach is reported to the other party and to Handova within 24 hours.";
    return [
      ["1. Parties", [`This agreement is between ${org}${s.organisation_country ? ` (${s.organisation_country})` : ""}, signed for it by the person named below, and ${pro}${s.talent_country ? ` (${s.talent_country})` : ""}. Handova, run by Ethical Bridge LLC (Wyoming, USA), provides the platform and keeps the record of this agreement, but is not a party to it.`]],
      ["2. Agreed contribution", [s.output || "", `Context: ${s.description || ""}`, `Estimated hours: ${s.hours || ""}. Working languages: ${(s.languages || []).join(", ")}. Remote. ${deadlineText(s)}`]],
      ["3. Scope, changes and communication", ["Before work starts, both parties agree in Handova Messages the timing, the organisation’s contact person, how the work will be reviewed and what is out of scope. Any change to the output, hours or deadline is agreed in writing in Messages before the extra work starts. Going above 16 hours needs a new need and a new agreement. Messages stay on Handova; personal contact details are shared only once both have signed, and only if both want to."]],
      ["4. Confidentiality, data and access", [common3v3, `${org} is responsible (the “controller”) for any personal data it shares. The professional uses it only on the organisation’s instructions, as a volunteer acting under its authority, and for no other purpose. The professional works with anonymised or aggregated information. Identifiable personal data about the people the organisation serves is shared only if the work cannot be done without it, the organisation may lawfully share it with the professional in their country, and both parties first record in Messages what data, why, how it is kept secure and when it is deleted. Data or images about children, case files, identity documents and shelter locations are never shared. At handover or when the contribution ends, the professional deletes or returns any personal data and confirms this in Messages.`]],
      ["5. Use of the work and public evidence", [`The professional gives ${org} a free, permanent, irrevocable and worldwide right to use, copy, adapt and share the deliverables for its mission, including with its partners and funders. As far as the law allows, the professional will not object to the organisation changing the work. The professional keeps materials, tools and know-how they created before or outside this contribution; where any are included in the deliverables, the same right applies to them. The professional tells the organisation about any third-party, open-source or AI-generated material in the deliverables and its licence terms.`, "Nothing confidential appears on a public impact CV. The professional decides whether the reviewed record is published, and may show non-confidential parts of the work elsewhere."]],
      ["6. Safeguarding", ["This contribution is remote and involves no direct contact with children or adults at risk. Both parties follow the Handova Safeguarding Policy and Code of Conduct, and the organisation’s own safeguarding policy where it has one; where they differ, the stricter rule applies. The organisation’s safeguarding focal point for this contribution is named with its signature below. Either party pauses the work and reports any concern within 24 hours to the other party and to Handova at safeguarding@handova.org."]],
      ["7. Relationship, responsibility and liability", ["This is a voluntary professional contribution. It creates no employment, payment, partnership or agency. No gifts, payments or favours are given or accepted, and the professional never receives, holds or moves the organisation’s money. Any expenses need separate written terms. Work that is legal, medical, financial or otherwise regulated needs appropriate qualifications and separate terms.", "The professional volunteers their time and works with reasonable care and skill, but does not guarantee any result. The organisation decides whether and how to use the work and checks it before relying on it. To the extent the law allows, neither party is liable to the other for indirect losses, and the professional is liable only for deliberate wrongdoing or gross negligence. For an ordinary mistake, including with data, the professional tells the organisation and Handova straight away and helps put it right. Neither Handova nor the organisation provides insurance for the professional. Each party also agrees, for the benefit of the other, to follow the Handova agreement it signed.", "Handova verifies professionals’ identity but does not check qualifications or outcomes."]],
      ["8. Ending the contribution", ["Either party can end the contribution at any time from this page, giving a short reason. When it ends, the professional hands over any work in progress the organisation asks for, and returns or deletes the organisation’s information and access within 7 days. Confidentiality, data, use of the work and safeguarding duties continue after it ends. Completed work is reviewed by the organisation before it counts."]],
      ["9. Disagreements and applicable law", ["This agreement is governed by the law of the country where the organisation is registered. If a disagreement arises, both parties first try to resolve it in good faith. Either may ask Handova to help. Handova does not decide disputes about the work, but may act under its own policies, for example on a safeguarding or conduct concern. Nothing here removes any right either party has under the law where they live."]],
      ["10. Language and record", ["This agreement is written in English. If a translation shown on Handova differs, the English version prevails. Handova keeps the signed text, each signature and its time for six years after the contribution or account ends, so both parties can rely on it."]],
    ];
  }
  if (version !== CONTRIBUTION_V2) {
    // Version signed before 18 October 2026, shown exactly as it was.
    return [
      ["1. Agreed contribution", [s.output || "", `Context: ${s.description || ""}`]],
      ["2. Scope and communication", ["Both parties confirm timing, points of contact, review steps and what is out of scope before work begins. Changes need both parties’ agreement. Messages stay on Handova; personal contact details are shared only once both have signed, and only if both want to."]],
      ["3. Confidentiality, data and access", [common3]],
      ["4. Ownership and public evidence", [`${org} owns the deliverables and its own information unless you agree otherwise in writing. Nothing confidential appears on a public impact CV. The professional decides whether the reviewed record is published.`]],
      ["5. Safeguarding", ["This contribution is remote and involves no direct contact with children or adults at risk and no access to their personal information. Both parties follow the safeguarding and protection from sexual exploitation and abuse standards in the agreements they signed with Handova, and the organisation’s own safeguarding policy; where they differ, the stricter rule applies. The organisation names its safeguarding focal point. Either party pauses the work and reports any concern within 24 hours to the other party and to Handova."]],
      ["6. Relationship and responsibility", ["This is a voluntary professional contribution. It creates no employment, payment, partnership or agency. Any expenses need separate written terms. Handova provides matching and record-keeping tools and is not a party to the work. It verifies professionals’ identity but does not check qualifications or outcomes. Work that is legal, medical, financial or otherwise regulated needs appropriate qualifications and separate terms."]],
      ["7. Ending the contribution", ["Either party can end the contribution at any time from this page. Completed work is reviewed by the organisation before it counts."]],
    ];
  }
  return [
    ["1. Parties", [`This agreement is between ${org}${s.organisation_country ? ` (${s.organisation_country})` : ""}, signed for it by the person named below, and ${pro}${s.talent_country ? ` (${s.talent_country})` : ""}. Handova, run by Ethical Bridge LLC (Wyoming, USA), provides the platform and keeps the record of this agreement, but is not a party to it.`]],
    ["2. Agreed contribution", [s.output || "", `Context: ${s.description || ""}`, `Estimated hours: ${s.hours || ""}. Working languages: ${(s.languages || []).join(", ")}. Remote. ${deadlineText(s)}`]],
    ["3. Scope, changes and communication", ["Before work starts, both parties agree in Handova Messages the timing, the organisation’s contact person, how the work will be reviewed and what is out of scope. Any change to the output, hours or deadline is agreed in writing in Messages before the extra work starts. Going above 16 hours needs a new need and a new agreement. Messages stay on Handova; personal contact details are shared only once both have signed, and only if both want to."]],
    ["4. Confidentiality, data and access", [common3, `${org} is responsible (the “controller”) for any personal data it shares. The professional uses it only on the organisation’s instructions, as a volunteer acting under its authority, and for no other purpose. The organisation shares personal data only if the work cannot be done with anonymised data, and makes sure it may lawfully share it with the professional in their country. At handover or when the contribution ends, the professional deletes or returns it and confirms this in Messages.`]],
    ["5. Ownership and public evidence", [`The professional transfers to ${org} all copyright and other intellectual property in the deliverables, worldwide, for the full term of those rights. Where the law does not allow a transfer, the professional gives the organisation a free, worldwide, permanent and irrevocable licence to use, copy, adapt and share them for any purpose. The professional keeps ownership of materials, tools and know-how they created before or outside this contribution, and gives the organisation a free, permanent, worldwide licence to use any of them included in the deliverables. Where the law allows, the professional will not use moral rights to stop the organisation adapting the work. The professional tells the organisation about any third-party, open-source or AI-generated material in the deliverables and its licence terms.`, "Nothing confidential appears on a public impact CV. The professional decides whether the reviewed record is published."]],
    ["6. Safeguarding", ["This contribution is remote and involves no direct contact with children or adults at risk and no access to their personal information. Both parties follow the safeguarding and protection from sexual exploitation and abuse standards in the agreements they signed with Handova, and the organisation’s own safeguarding policy; where they differ, the stricter rule applies. The organisation’s safeguarding focal point for this contribution is named with its signature below. Either party pauses the work and reports any concern within 24 hours to the other party and to Handova."]],
    ["7. Relationship, responsibility and liability", ["This is a voluntary professional contribution. It creates no employment, payment, partnership or agency. Any expenses need separate written terms. Work that is legal, medical, financial or otherwise regulated needs appropriate qualifications and separate terms.", "The professional volunteers their time and works with reasonable care and skill, but does not guarantee any result. The organisation decides whether and how to use the work and checks it before relying on it. To the extent the law allows, neither party is liable to the other for indirect losses, and the professional is liable only for deliberate wrongdoing, gross negligence or a breach of section 4. Neither Handova nor the organisation provides insurance for the professional. Each party also agrees, for the benefit of the other, to follow the Handova agreement it signed.", "Handova verifies professionals’ identity but does not check qualifications or outcomes."]],
    ["8. Ending the contribution", ["Either party can end the contribution at any time from this page, giving a short reason. When it ends, the professional hands over any work in progress the organisation asks for, and returns or deletes the organisation’s information and access within 7 days. Confidentiality, data, ownership and safeguarding duties continue after it ends. Completed work is reviewed by the organisation before it counts."]],
    ["9. Disagreements and applicable law", ["This agreement is governed by the law of the country where the organisation is registered. If a disagreement arises, both parties first try to resolve it in good faith. Either may ask Handova to help, but Handova does not decide disputes. Nothing here removes any right either party has under the law where they live."]],
    ["10. Language and record", ["This agreement is written in English. If a translation shown on Handova differs, the English version prevails. Handova keeps the signed text, each signature and its time for six years after the contribution or account ends, so both parties can rely on it."]],
  ];
}
// The exact plain text that is signed and hashed.
export function contributionText(s = {}, version = CONTRIBUTION_VERSION) {
  const head = [`Handova contribution agreement (${version})`, `Need: ${s.need_title || ""}`, `Organisation: ${s.organisation || ""}`, `Professional: ${s.talent || ""}`];
  const body = contributionSections(s, version).map(([h, ps]) => `${h}\n${ps.map((p) => p.replace(/\*\*/g, "")).join("\n")}`);
  return [...head, "", ...body].join("\n\n");
}
// HTML for the page: escape everything, then allow **bold**.
export const contributionHtml = (sections, esc) => sections.map(([h, ps]) => {
  const agreed = /Agreed contribution/.test(h);
  const cls = (j) => (agreed && j === 0 ? ' class="prose" style="font-size:1rem" data-no-i18n' : agreed && j === 1 ? ' class="small muted" data-no-i18n' : "");
  return `<section><h3>${esc(h)}</h3>${ps.map((p, j) => `<p${cls(j)}>${esc(p).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`).join("")}</section>`;
}).join("");
