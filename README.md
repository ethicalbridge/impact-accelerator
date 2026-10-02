# Handova

**Skills handed over. Capability that stays.**

Skilled professionals contributing, unpaid, to the needs locally led organisations define. An initiative of Ethical Bridge, run as an independent platform with its own database. Previously called Impact Accelerator; the repository name and web address keep the old slug so existing links keep working.

**Live site:** https://handova.org/ (GitHub Pages, branch root, custom domain via the CNAME file)
**Database:** Supabase project `jcfezemkbseaqbwuojhs` (EU, Frankfurt), used only by Handova.

## How the product works

1. An organisation signs up, describes itself and is **reviewed by an admin** before anything is public.
2. Approved organisations publish up to **3 open needs** at a time. Each need confirms there is no direct contact with children or vulnerable adults.
3. Professionals (18+) create a profile. It becomes public only after they choose to publish it **and** an admin approves it.
4. Professionals apply, or organisations invite. Accepting creates a **contribution agreement** from a frozen snapshot of the need. Both sides sign by name.
5. Hours can be logged only after both signatures (max 12 hours a day, https evidence links only). The organisation approves or returns each entry.
6. The organisation marks the work complete with deliverables, an endorsement and a **private** rating. The professional decides whether the contribution appears on their public **impact CV**.
7. Six months later, the organisation is asked whether the work is still in use.

Anyone signed in can report a profile, need or conversation; admins see reports, pending organisations and pending profiles in `#admin`. Every user can delete their account; organisations keep an anonymised record ("Former member").

## Code

Vanilla ES modules, no framework. `src/` is bundled by esbuild into `app.js`, which is **committed** because GitHub Pages serves the branch root.

| Path | What it holds |
| --- | --- |
| `src/app.js` | Hash router, legacy redirects, action and form dispatch |
| `src/core.js` | Supabase client, session state, dialogs, toasts, form helper |
| `src/ui.js` | Icons, the Handova mark, illustrations, cards, header and footer |
| `src/motion.js` | Scroll reveal, count-ups, the home-page step explorer, hero motion; all off under reduced motion |
| `src/pages/public.js` | Home, For organisations, Needs, Talent, profiles (impact CV), How it works |
| `src/pages/account.js` | Join, sign in, reset, onboarding, account and deletion |
| `src/pages/workspace.js` | Professional and organisation workspaces, need form, invite and report dialogs |
| `src/pages/engagement.js` | Contribution agreement, time log, conversations |
| `src/pages/admin.js` | Notifications and admin review |
| `src/pages/legal.js` | Privacy, terms, cookies, working responsibly, report a concern |
| `src/examples.js` | Clearly labelled example needs and the Maria Lopez example CV, shown only when there is no real data |
| `supabase/migrations/` | The complete database: tables, row-level security, triggers and server functions |
| `supabase/tests/permissions.sql` | Permission tests; run inside a transaction that is rolled back |
| `tests/mock-supabase.js` | In-browser imitation of the database for local UI testing only |

Security model: the publishable key is public by design. All rules live in the database. Agreements, signatures, reviews, completion and publication happen only through `SECURITY DEFINER` functions that check who is calling; there is no direct insert or update on engagements. The site sends a strict Content Security Policy and self-hosts its fonts.

## Develop

Node 22+ and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm test        # unit tests
pnpm build       # writes app.js and dist/
pnpm start       # serves dist/ on http://127.0.0.1:4173
pnpm qa          # builds a mock-backed copy into ../qa-site and serves it
```

In the QA copy, sign in as `admin@example.test`, `org@example.test` or `talent@example.test` with any password. Data lives only in that browser's local storage. `MOCK` builds refuse to run without `OUT`, so the mock can never replace the production `app.js`; CI also checks this.

## Email notifications

Every in-app notification also triggers the `notify-email` Edge Function (`supabase/functions/notify-email`) through a database trigger. It sends a short title and a link, never message content; at most one message email per person every 30 minutes; nothing to people who turned emails off in Account and privacy. A daily job (`ia-followup-reminders`) creates the six-month "is the work still in use?" reminder for organisations.

## Database changes

Apply new files in `supabase/migrations/` in order (Supabase CLI or dashboard SQL editor). Then run `supabase/tests/permissions.sql`; it must print `PASS: …` and leaves no data behind. Do the same with `supabase/tests/email-notifications.sql` and `supabase/tests/admin-introductions.sql`.

## Before launch: actions only the owner can do

1. **Email sender.** Create a Resend (or similar) account, verify a sending domain, and add its SMTP details in Supabase → Authentication → Emails → SMTP. Without this, confirmation and reset emails are rate-limited to a few per hour.
   Then, for notification emails, add two secrets in Supabase → Edge Functions → Secrets: `RESEND_API_KEY` (the same key) and `NOTIFY_FROM` (for example `Handova <no-reply@your-domain>`). Until both exist, the `notify-email` function skips sending and in-app notifications still work.
2. **Auth URLs.** In Supabase → Authentication → URL configuration set the Site URL to the live address and add it to Redirect URLs (plus the custom domain if you move to one).
3. **Leaked-password protection.** Supabase → Authentication → Passwords: turn it on.
4. **First admin.** Sign up with the admin email, confirm it, then run `insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';`
5. **Contact addresses.** `src/config.js` uses `info@ethicalbridge.org` for contact and safeguarding. Change them if a dedicated inbox is created, then rebuild.
6. **Analytics (optional).** Put a GA4 measurement ID in `src/config.js`; the consent banner appears automatically. Leave it empty to run with no analytics.
7. **Plan.** Upgrade the Supabase project to Pro before launch so it is never paused and has daily backups.
8. **Legal review.** Privacy notice and terms name Ethical Bridge as responsible. Have them checked, and confirm the governing law.

## Roll back

Revert the merge commit; GitHub Pages redeploys the previous `app.js`. The database is separate from the old Ethical Bridge project, so rolling back the site does not affect any records.
