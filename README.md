# Impact Accelerator

The Strengthen platform of Local Impact Alliance. A static, bundled web client on GitHub Pages connects to the existing Ethical Bridge Supabase service. Organisational needs, professional portfolios and contribution records are the core product.

## Features

- Shared Ethical Bridge authentication; private-by-default professional profiles with explicit publishing.
- Portfolio case studies with type, description, role, outcomes, organisation/client, date, skills, supporting link, featured status and draft/public visibility.
- JPEG/PNG/WebP thumbnail uploads (5 MB maximum) to a private bucket, or external HTTPS thumbnails. Signed viewing URLs expire after one hour.
- Searchable talent and needs directories, shareable profile/work/need routes, saved needs, JSON export and print-to-PDF profile layouts.
- Organisation workspaces based on existing membership, with draft and open/closed needs. Only published organisations may open needs.
- Applications, invitations, participant-only conversations, contribution logging and auditable organisation review.
- Database-enforced ownership, role boundaries, decision transitions, daily time limits and immutable hour decisions.

## Development

Node 22+ and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm start
```

`src/` contains maintainable modules. `app.js` is the committed production bundle so the existing GitHub Pages branch-root deployment continues to work without changing hosting. Build also writes `dist/` for local preview at port 4173. The publishable Supabase key is intentionally public; permissions are enforced by RLS, not by key secrecy.

## Backend and testing

Applied migrations, in order, are recorded as `schema.sql`, `hardening.sql`, `media-visibility.sql`, and `media-ownership.sql`. They create only Accelerator tables (`ia_*`), functions and a separate Storage bucket/policies. Existing organisation and account records are referenced, not copied. Do not rerun these SQL files against an already migrated database.

`tests/rls.sql` exercises the live database policies within a rolled-back transaction, creating no durable test users or public records. It tests profile and image visibility, cross-user writes, organisation isolation, application decisions, messages, daily hour totals and immutable review evidence.

`pnpm test` includes DOM workflow tests using an isolated mock service, plus escaping, URL and filter tests. For manual UI testing, `node scripts/qa.mjs` builds a mock-backed site outside the repository into `../qa-site`. Run `node scripts/serve.mjs ../qa-site 4174`. This QA bundle never enters `dist` or the production bundle. It uses fictional records stored only in that local browser origin. Sign in with `talent@example.test` or `org@example.test` and any nonempty password in this local harness only.

## Deployment and outstanding launch configuration

The production callback `https://ethicalbridge.github.io/impact-accelerator/` is allowlisted in Supabase Auth. Existing default redirect settings for Ethical Bridge were preserved.

**Production SMTP is not yet configured.** The owner elected to configure it later. Existing-account sign-in uses the live Auth service, but public signup and password-reset email delivery cannot be considered launch-ready until a custom sender is configured and real delivery/confirmation/recovery is tested. Do not disable email verification to bypass this requirement.

Application, invitation and conversation updates are visible in the workspaces; transactional notification emails are not implemented. Users are told to check their workspace. No analytics, advertising, fabricated verification, match scores or invented impact totals are used.

The shared project's security advisor reports pre-existing warnings about existing Ethical Bridge security-definer functions and leaked-password protection. Accelerator adds no security-definer functions. Changes to unrelated shared-service policies are outside this release.

For rollback, revert the frontend commit. Additive backend tables may remain; do not drop records that users have created. Private records and Storage objects must continue to retain their RLS protections.
