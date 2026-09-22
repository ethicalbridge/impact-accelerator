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
export function filterRecords(
  rows,
  {
    search = "",
    skill = "",
    type = "",
    availability = "",
    arrangement = "",
  } = {},
) {
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
          r.organisation?.public_name,
        ])
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!skill ||
        (r.skills || []).some((x) =>
          x.toLowerCase().includes(skill.toLowerCase()),
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
