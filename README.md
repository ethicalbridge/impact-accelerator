# Handova

**Skills handed over. Capability that stays.**

Skilled professionals contributing, unpaid, to the needs locally led organisations define. An initiative of Ethical Bridge, run as an independent platform with its own database. Previously called Impact Accelerator; the repository name and web address keep the old slug so existing links keep working.

**Live site:** https://handova.org/ (GitHub Pages, branch root, custom domain via the CNAME file)
**Database:** Supabase project `jcfezemkbseaqbwuojhs` (EU, Frankfurt), used only by Handova.

## How the product works

1. An organisation signs up, describes itself and is **reviewed by an admin** before anything is public.
2. Approved organisations send needs for **Handova's review**; Handova opens each one. Up to **3 needs** can be waiting for review, open or in progress at a time. Each need confirms there is no direct contact with children or adults at risk.
3. Professionals (18+) create a profile. It becomes public only after they choose to publish it **and** an admin approves it.
4. Professionals apply, or organisations invite. Accepting creates a **contribution agreement** from a frozen snapshot of the need. Both sides sign contribution agreement v2; each signature keeps the exact text, its SHA-256, the confirmations, email, IP address and browser for six years after the account closes. Handova then posts a first-call agenda into Messages.
5. Hours can be logged only after both signatures (max 12 hours a day, https evidence links only). The organisation approves or returns each entry.
6. The organisation finishes and endorses the work: what was handed over, 1–3 confirmed skills and a written endorsement (no rating). The professional reads it first and decides whether it appears on their public **impact CV**; they can ask for one correction. Both sides get a short optional questionnaire.
7. Six months later, the organisation is asked whether the work is still in use.

The Needs page shows every published need in its state (open, receiving applications, professional chosen, in progress, handed over, applications closed). An apply-by date must be at least two weeks after the need is sent for review; a later date on a live need is requested by the organisation and approved by Handova, and organisations are reminded 3 days before it. People who sign up but never send a profile (or set up an organisation) get reminders after 1 and 7 days; admins see them in Admin → Unfinished sign-ups.

When Handova approves a need for the first time, every professional with an active profile gets a notification and email about it (naming any skills they share with the need). Admins can open any organisation at `#admin-org/<id>` to see everything about it and suggest profile changes, which the organisation accepts or declines from its workspace.

Anyone signed in can report a profile, need or conversation; admins see reports, pending organisations and pending profiles in `#admin`. Every user can delete their account; organisations keep an anonymised record ("Former member").

If an organisation stops responding, an admin can close the contribution from Admin → Contributions ("Close for them"): hours the organisation already approved stay on the professional's record, marked "Closed by Handova". An account can't be deleted while its owner has a contribution still open, or is the only person managing an organisation with one. Text typed in a dialog is kept as a draft in that browser tab until it is sent.

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

## Account emails (sign-up, password reset)

Supabase Auth sends these. The branded templates are in `supabase/templates/`, one HTML file per email, with subjects in `subjects.txt`. Each one is written in English, Spanish, Portuguese and French and picks the language the person used when they signed up (`lang` in the sign-up data), falling back to English. To change one, edit the file and paste it again into Supabase → Authentication → Emails → Templates.

The sender name and address come from the SMTP settings (Authentication → Emails → SMTP Settings): sender name `Handova`, sender email on `handova.org`. Supabase's built-in sender cannot be renamed and only delivers to project team members, so custom SMTP is required before launch.

## Database changes

Apply new files in `supabase/migrations/` in order (Supabase CLI or dashboard SQL editor). Then run `supabase/tests/permissions.sql`; it must print `PASS: …` and leaves no data behind. Do the same with `supabase/tests/email-notifications.sql` and `supabase/tests/admin-introductions.sql`.

## Before launch: actions only the owner can do

1. **Email sender.** Add SMTP details in Supabase → Authentication → Emails → SMTP Settings (the Hostinger mailbox: `smtp.hostinger.com`, port 465, `hello@handova.org`), sender name `Handova`. Then paste the files from `supabase/templates/` into Authentication → Emails → Templates. Without this, confirmation and reset emails come from Supabase and only reach project team members.
   Notification emails go through the same mailbox: its password is the Edge Function secret `SMTP_PASS`. If the mailbox password changes, update it in both places.
2. **Auth URLs.** In Supabase → Authentication → URL configuration set the Site URL to the live address and add it to Redirect URLs (plus the custom domain if you move to one).
3. **Leaked-password protection.** Supabase → Authentication → Passwords: turn it on.
4. **First admin.** Sign up with the admin email, confirm it, then run `insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';`
5. **Contact addresses.** `src/config.js` uses `hello@handova.org` for contact and safeguarding. Change them if a dedicated inbox is created, then rebuild.
6. **Analytics (optional).** Put a GA4 measurement ID in `src/config.js`; the consent banner appears automatically. Leave it empty to run with no analytics.
7. **Plan.** Upgrade the Supabase project to Pro before launch so it is never paused and has daily backups.
8. **Legal review.** Privacy notice and terms name Ethical Bridge as responsible. Have them checked, and confirm the governing law.

## Roll back

Revert the merge commit; GitHub Pages redeploys the previous `app.js`. The database is separate from the old Ethical Bridge project, so rolling back the site does not affect any records.
