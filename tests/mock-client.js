// Local QA only. Never included in the production build.
const key = "accelerator-qa-records-v1";
const talent = "10000000-0000-4000-8000-000000000001",
  orgUser = "10000000-0000-4000-8000-000000000002",
  org = "20000000-0000-4000-8000-000000000001",
  need = "40000000-0000-4000-8000-000000000001";
const seed = {
  ia_profiles: [
    {
      user_id: talent,
      name: "Amina Okoro — QA example",
      headline: "Research & impact measurement specialist",
      bio: "I turn complex evidence into clear decisions for community-led organisations. My work spans research design, accessible reporting and practical data tools.",
      location: "Nairobi · UTC+3",
      skills: ["Research", "Data analysis", "Training"],
      languages: ["English", "Swahili"],
      experience:
        "Independent researcher, 2022–present\nDesigned evaluation tools and facilitated learning workshops.\n\nResearch associate, 2019–2022\nLed mixed-methods studies and translated findings into practical reports.",
      hours_available: 12,
      arrangement: "Remote",
      website: "https://example.org",
      published: true,
    },
  ],
  ia_portfolio: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      user_id: talent,
      title: "Making community evidence easier to use",
      description:
        "An example case study for local quality assurance. A community team needed a clearer way to interpret findings from its water-access surveys.",
      role: "Designed the research framework, cleaned the data and developed an accessible reporting template.",
      outcome:
        "Delivered a reusable reporting toolkit and trained the team to maintain it independently.",
      client: "Community Research Lab — QA example",
      work_date: "2026-08-01",
      work_type: "Research",
      skills: ["Research", "Data analysis"],
      link: "https://example.org/report",
      image: "",
      featured: true,
      published: true,
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      user_id: talent,
      title: "A practical guide to outcome measurement",
      description:
        "A guide that makes outcomes and evidence accessible to programme teams.",
      role: "Research, writing and information design.",
      outcome: "A field-ready guide with templates and facilitation notes.",
      client: "QA example",
      work_date: "2026-05-12",
      work_type: "Report",
      skills: ["Training", "Writing"],
      link: "",
      image: "",
      featured: false,
      published: true,
    },
  ],
  organisations: [
    {
      id: org,
      public_name: "Community Research Lab — QA example",
      registered_name: "QA organisation",
      status: "published",
      summary: "A fictional organisation used only in local UI testing.",
      website: "https://example.org",
    },
  ],
  organisation_members: [
    { organisation_id: org, user_id: orgUser, role: "owner" },
  ],
  ia_needs: [
    {
      id: need,
      organisation_id: org,
      title: "Create an accessible outcome report",
      description:
        "Help our team turn survey findings into an accessible report with a reusable template. This record is local test data only.",
      output:
        "A report and a reusable template, with a short handover session.",
      hours: 8,
      arrangement: "Remote",
      location: "East Africa",
      skills: ["Research", "Design"],
      deadline: null,
      status: "open",
    },
  ],
  ia_applications: [],
  ia_invitations: [],
  ia_hours: [],
  ia_saved: [],
  ia_messages: [],
};
let records = JSON.parse(localStorage.getItem(key) || "null") || seed;
let session = JSON.parse(localStorage.getItem(key + "-session") || "null");
const listeners = [];
function save() {
  localStorage.setItem(key, JSON.stringify(records));
}
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.mode = "read";
    this.sorts = [];
    this.returnOne = false;
  }
  select() {
    return this;
  }
  eq(k, v) {
    this.filters.push((r) => r[k] === v);
    return this;
  }
  in(k, vs) {
    this.filters.push((r) => vs.includes(r[k]));
    return this;
  }
  order(k, opt = {}) {
    this.sorts.push([k, opt]);
    return this;
  }
  single() {
    this.returnOne = true;
    return this;
  }
  maybeSingle() {
    this.returnOne = true;
    return this;
  }
  insert(v) {
    this.mode = "insert";
    this.value = v;
    return this;
  }
  upsert(v) {
    this.mode = "upsert";
    this.value = v;
    return this;
  }
  update(v) {
    this.mode = "update";
    this.value = v;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  then(resolve, reject) {
    try {
      let rows = records[this.table] || [];
      let found = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.mode === "insert" || this.mode === "upsert") {
        let old =
          this.mode === "upsert"
            ? rows.find((r) => r.user_id === this.value.user_id)
            : null;
        if (old) {
          Object.assign(old, this.value);
          found = [old];
        } else {
          const row = {
            id: crypto.randomUUID(),
            status: "pending",
            created_at: new Date().toISOString(),
            ...this.value,
          };
          rows.push(row);
          found = [row];
        }
      }
      if (this.mode === "update")
        found.forEach((r) => Object.assign(r, this.value));
      if (this.mode === "delete")
        records[this.table] = rows.filter((r) => !found.includes(r));
      if (this.mode !== "read") save();
      for (const [k, o] of this.sorts.slice().reverse())
        found.sort(
          (a, b) =>
            (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) *
            (o.ascending === false ? -1 : 1),
        );
      const out = found.map((r) => ({
        ...r,
        organisation: records.organisations.find(
          (o) => o.id === r.organisation_id,
        ),
        person: records.ia_profiles.find((p) => p.user_id === r.user_id),
        need: records.ia_needs.find((n) => n.id === r.need_id),
      }));
      return Promise.resolve({
        data: this.returnOne ? out[0] || null : out,
        error: null,
      }).then(resolve, reject);
    } catch (e) {
      return Promise.reject(e).then(resolve, reject);
    }
  }
}
export function createClient() {
  return {
    from: (t) => new Query(t),
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (fn) => {
        listeners.push(fn);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async ({ email }) => {
        session = {
          user: { id: email.startsWith("org") ? orgUser : talent, email },
        };
        localStorage.setItem(key + "-session", JSON.stringify(session));
        listeners.forEach((fn) => fn("SIGNED_IN", session));
        return { data: session, error: null };
      },
      signOut: async () => {
        session = null;
        localStorage.removeItem(key + "-session");
        listeners.forEach((fn) => fn("SIGNED_OUT", null));
        return { error: null };
      },
      signUp: async () => ({ data: { session: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: {}, error: null }),
        remove: async () => ({ data: [], error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
      }),
    },
  };
}
