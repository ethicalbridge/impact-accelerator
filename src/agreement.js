// The agreement every professional signs before their profile can be published.
// The exact text shown is sent with the signature and stored with its SHA-256 hash, so we can always show
// what someone agreed to. Change the version whenever the text changes: everyone is then asked to sign again.
export const PRO_AGREEMENT_VERSION = "professional-2026-10-02";

export const PRO_AGREEMENT = [
  ["About this agreement", [
    "Handova is a free platform, an initiative of Ethical Bridge, that connects skilled professionals with locally led organisations. This agreement sets out what we ask of you and what you can expect from us. Please read it carefully: you sign it once, and we keep a record of it.",
  ]],
  ["1. Who can join", [
    "You are 18 or older.",
    "You join as yourself. Your name, photo, experience and education are true and match your LinkedIn profile.",
    "You tell us promptly if anything important changes, for example if you can no longer give the hours you committed to.",
  ]],
  ["2. Your monthly commitment", [
    "You commit to a number of hours a month, at least 4. You choose the number on your profile and can change it at any time.",
    "Organisations plan around the hours you show, so please only offer time you can really give.",
  ]],
  ["3. Keeping the community active", [
    "Handova works because organisations can count on the people they find here. Their time is precious, and we don’t want them to spend it contacting profiles that are no longer active.",
    "Activity means applying to a need, accepting an invitation, working on an engagement or having work endorsed by an organisation.",
    "If three months pass without any activity, your profile is marked inactive. It stays online, but organisations see that you have not been active recently.",
    "If six months pass without any activity, we close your profile. It is unpublished and no longer visible to organisations.",
    "We will remind you by email two weeks before each step. Any activity makes your profile active again straight away, and an engagement in progress always counts.",
    "Closing is not a penalty. You can publish your profile again whenever you are ready, and we will review it before it goes back online.",
  ]],
  ["4. Voluntary and unpaid", [
    "Contributions are voluntary and unpaid. They do not create a job, an employment contract or a partnership with Handova, Ethical Bridge or the organisation.",
    "Do not ask for or accept payment, gifts or favours for work arranged through Handova. Any expenses need separate written terms agreed with the organisation before you spend anything.",
    "Do not use Handova to sell services or recruit clients.",
  ]],
  ["5. How engagements work", [
    "Before any work starts, you and the organisation sign a contribution agreement that sets out the output, the hours, access and confidentiality.",
    "You keep to the agreed scope, log your hours honestly and hand over the work so the team can keep using it.",
    "If you can no longer continue, tell the organisation as early as possible and end the engagement through Handova.",
  ]],
  ["6. Respect, safeguarding and do no harm", [
    "You treat everyone with respect and follow the organisation’s own policies, including its safeguarding policy.",
    "You never abuse, exploit, harass or discriminate against anyone. We have zero tolerance for sexual exploitation and abuse.",
    "You do not have unsupervised contact with children or adults at risk unless the organisation has arranged it under its safeguarding policy.",
    "You do not take or share photos, stories or information about the people an organisation works with without that organisation’s written consent.",
    "If you see or suspect harm, you report it to the organisation and to Handova straight away.",
  ]],
  ["7. Confidentiality and data", [
    "You keep the organisation’s information confidential and use it only for the agreed work.",
    "You protect any personal data you see, take only what the work needs, and return or delete it at handover.",
  ]],
  ["8. The work you hand over", [
    "Unless you agree otherwise in writing with the organisation, the organisation may freely use, adapt and share the work you hand over.",
    "You may describe the work on your Handova impact CV and elsewhere, without sharing confidential information.",
    "You only hand over work you have the right to share, and you are responsible for the quality of your own work.",
  ]],
  ["9. Our role", [
    "Handova reviews organisations and profiles and provides the tools to agree, track and review work. We are not a party to the work between you and the organisation, and we cannot guarantee any outcome.",
    "To the extent the law allows, Handova and Ethical Bridge are not responsible for losses arising from the work arranged between you and an organisation.",
    "We may pause or close a profile that breaks this agreement or puts anyone at risk, and we may share information with an organisation or the authorities where someone’s safety requires it.",
  ]],
  ["10. Your data and this record", [
    "We handle your data as described in our privacy notice. Your profile is public only when you publish it and we approve it.",
    "When you sign, we store your name, email address, the date and time, your IP address and browser, and the exact text you agreed to. We keep this record for six years after your account closes, so both sides can rely on it, even if you delete your account.",
  ]],
  ["11. Changes", [
    "If we change this agreement, we will tell you and ask you to sign the new version before your profile can be published again.",
    "Questions? Write to hello@handova.org.",
  ]],
];

export const proAgreementText = () =>
  `Handova professional agreement (${PRO_AGREEMENT_VERSION})\n\n` + PRO_AGREEMENT.map(([h, items]) => `${h}\n${items.map((t) => `- ${t}`).join("\n")}`).join("\n\n");
