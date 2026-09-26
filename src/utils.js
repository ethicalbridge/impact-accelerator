export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function safeURL(value) {
  if (!value) return "";
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}
export const list = (value) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);

export const professionalAreas = [
  ["Accessibility & inclusion", "accessibility inclusive inclusion disability universal design"],
  ["Accounting & bookkeeping", "accounting bookkeeping accounts payroll"],
  ["Administration & operations", "administration operations office process coordination"],
  ["Artificial intelligence", "artificial intelligence ai machine learning automation"],
  ["Branding & graphic design", "branding brand graphic design illustration visual identity"],
  ["Business development", "business development partnerships sales growth"],
  ["Campaigns & advocacy", "campaign advocacy campaigning mobilisation mobilization"],
  ["Communications & public relations", "communications communication public relations pr media"],
  ["Community engagement", "community engagement participation outreach facilitation"],
  ["Content & copywriting", "content copywriting writing editing storytelling"],
  ["Data analysis & visualisation", "data analysis analytics visualisation visualization dashboard"],
  ["Digital marketing", "digital marketing seo social media email marketing"],
  ["Environmental & climate", "environment environmental climate sustainability conservation"],
  ["Event planning", "event events planning production logistics"],
  ["Finance & financial planning", "finance financial budgeting forecasting investment"],
  ["Fundraising & grant writing", "fundraising grant writing donor philanthropy"],
  ["Governance & board support", "governance board policy compliance trustee"],
  ["Human resources & people", "human resources hr people recruitment talent wellbeing"],
  ["Information technology support", "information technology it support systems helpdesk"],
  ["Legal & compliance", "legal law compliance contracts regulatory policy"],
  ["Monitoring, evaluation & learning", "monitoring evaluation learning mel impact measurement"],
  ["Photography & video", "photography video film animation editing"],
  ["Product management", "product management product strategy roadmap agile"],
  ["Programme & project management", "programme program project management delivery planning"],
  ["Research & insights", "research insights user research qualitative quantitative survey"],
  ["Service design", "service design journey mapping systems design co-design"],
  ["Software development", "software development engineering programming developer mobile app"],
  ["Strategy & organisational development", "strategy organisational organizational development change management"],
  ["Training & facilitation", "training facilitation workshop coaching mentoring learning"],
  ["Translation & interpretation", "translation interpretation localisation localization language"],
  ["UX & UI design", "ux ui user experience interface figma prototyping design"],
  ["Web design & development", "web website frontend backend wordpress webflow development"],
].map(([label, keywords]) => ({ label, keywords }));

export const countries = `Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Costa Rica|Croatia|Cuba|Cyprus|Czechia|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Republic of the Congo|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe`.split("|");

export const filterLanguages = `Arabic|Bengali|British Sign Language|Bulgarian|Burmese|Cantonese|Catalan|Croatian|Czech|Danish|Dutch|English|Estonian|Finnish|French|German|Greek|Gujarati|Hausa|Hebrew|Hindi|Hungarian|Indonesian|Irish|Italian|Japanese|Korean|Latvian|Lithuanian|Malay|Mandarin Chinese|Marathi|Nepali|Norwegian|Persian|Polish|Portuguese|Punjabi|Romanian|Russian|Serbian|Slovak|Slovenian|Somali|Spanish|Swahili|Swedish|Tamil|Telugu|Thai|Turkish|Ukrainian|Urdu|Vietnamese|Welsh|Yoruba|American Sign Language|International Sign`.split("|");
export function filterRecords(
  rows,
  {
    search = "",
    skill = "",
    area = "",
    country = "",
    type = "",
    availability = "",
    arrangement = "",
    language = "",
  } = {},
) {
  const areaQuery = professionalAreas.find(
    (item) => item.label.toLocaleLowerCase() === area.trim().toLocaleLowerCase(),
  );
  const areaTerms = areaQuery
    ? `${areaQuery.label} ${areaQuery.keywords}`.toLocaleLowerCase().split(/\s+/)
    : [area.trim().toLocaleLowerCase()];
  return rows.filter(
    (r) =>
      (!search ||
        JSON.stringify([
          r.name,
          r.title,
          r.headline,
          r.location,
          r.description,
          r.skills,
          r.languages,
          r.organisation?.public_name,
        ])
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!skill ||
        (r.skills || []).some((x) =>
          x.toLowerCase().includes(skill.toLowerCase()),
        )) &&
      (!area ||
        areaTerms.some((term) =>
          JSON.stringify([r.skills, r.headline, r.title, r.description])
            .toLocaleLowerCase()
            .includes(term),
        )) &&
      (!country ||
        `${r.country || ""} ${r.location || ""}`
          .toLocaleLowerCase()
          .includes(country.trim().toLocaleLowerCase())) &&
      (!language ||
        (r.languages || []).some((x) =>
          x.toLocaleLowerCase().includes(language.trim().toLocaleLowerCase()),
        )) &&
      (!type || r.work_type === type) &&
      (!availability || r.hours_available > 0) &&
      (!arrangement || r.arrangement === arrangement),
  );
}
export const types = [
  "Research",
  "Report",
  "Publication",
  "Campaign",
  "Design",
  "Website",
  "Video",
  "Training",
  "Strategy",
  "Data & technology",
  "Other",
];

export function supportLanguages(value) {
  const values = String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const unique = values.filter(
    (x, i) =>
      values.findIndex(
        (y) => y.toLocaleLowerCase() === x.toLocaleLowerCase(),
      ) === i,
  );
  if (!unique.length) throw Error("Add at least one language you can work in.");
  if (unique.length > 20 || unique.some((x) => x.length > 80))
    throw Error(
      "Use up to 20 languages, with names no longer than 80 characters.",
    );
  return unique;
}
