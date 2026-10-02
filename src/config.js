// Public configuration. The publishable key is designed to be public: every permission is enforced by the database.
export const config = {
  supabaseUrl: "https://jcfezemkbseaqbwuojhs.supabase.co",
  supabaseKey: "sb_publishable_PcrJRRzZANIVHYcMHc5YhA_lN5xNHi1",
  // The address people use to reach the site; used for email links. Update when the custom domain is live.
  siteUrl: "https://handova.org/",
  contactEmail: "hello@handova.org",
  safeguardingEmail: "hello@handova.org",
  // Google Analytics 4 measurement ID (G-XXXXXXX). Empty = no analytics and no consent banner.
  gaMeasurementId: "",
  legalUpdated: "2 October 2026",
  // The founder's real account. Once set, handova.org/#profile/julieta-castineira-de-dios shows her live profile
  // (falling back to the built-in sample until it is approved), and the Talent page lists the live one.
  founderUserId: "",
};
