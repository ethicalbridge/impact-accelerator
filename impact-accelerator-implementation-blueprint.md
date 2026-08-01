# Impact Accelerator Platform — implementation blueprint

## Proposed architecture

Build Impact Accelerator as a standalone modular product with its own authentication, organisation directory, geographic and impact-taxonomy tables, file storage and design system. Add dedicated service-layer enforcement for matching, hours and approvals. Supabase Postgres provides relational data, RLS enforces tenancy, Storage holds private evidence, and Edge Functions handle scheduled monthly allocations, notifications, exports and certificate generation.

Organisation identity remains canonical in the platform `organisations` table. New records reference `organisations.id`; organisation data is not copied across feature areas.

## Core schema

| Domain | Tables | Key relationships |
|---|---|---|
| Profiles | `talent_profiles`, `organisation_members`, `talent_skills`, `talent_impact_interests` | `talent_profiles.user_id -> users.id`; organisation membership references canonical `organisations.id` |
| Taxonomies | `skill_categories`, `skills`, `impact_areas`, `project_required_skills` | Skills are data-managed; category and subskill hierarchy uses `skills.parent_skill_id` |
| Projects | `support_projects`, `project_milestones`, `project_tasks`, `project_applications`, `project_invitations` | Each project belongs to exactly one existing organisation |
| Delivery | `assignments`, `assignment_members`, `deliverables`, `time_entries`, `files` | Assignment connects project and talent; files remain access-controlled |
| Hours | `hour_wallets`, `hour_transactions` | One wallet per talent/month; ledger entries are immutable and append-only |
| Trust | `feedback`, `endorsements`, `portfolio_items`, `certificates`, `disputes`, `audit_logs` | Public portfolio entries only expose approved, non-confidential fields |

Every material table includes `id`, `created_at`, `updated_at`, `archived_at` / `deleted_at` where suitable, plus approval timestamps and actor IDs for state changes. Use foreign keys, check constraints for statuses, and optimistic locking for approvals.

## User journeys

1. Talent member completes profile, accepts policies, chooses a monthly commitment and receives admin verification.
2. Organisation completes or claims its Impact Accelerator profile, creates a structured support request, and submits it for admin review.
3. Matching ranks eligible talent with explainable factors. The organisation/admin invites or selects; the talent accepts; an assignment reserves planned hours.
4. Talent logs time and evidence. Organisation contact (or administrator) reviews. Approval writes ledger transactions, updates the wallet and produces a verified portfolio item.
5. On completion, both parties submit moderated feedback; the talent chooses public/private portfolio visibility; certificates and summaries are generated.

## Permissions model

| Role | Scope |
|---|---|
| Talent | Own profile, applications, invitations, assigned work, draft time entries and portfolio visibility only |
| Organisation member | Their organisation’s projects, candidates, assignments, time approvals and feedback; permission tiers for owner/project manager/reviewer |
| Administrator | Verification, moderation, matching, dispute management, taxonomy/configuration, reports and audit review |
| Public | Only explicitly published organisation/project/portfolio fields |

RLS should always validate tenant membership from `organisation_members`; never trust an organisation ID supplied by the client. Private documents require signed, short-lived URLs and a policy check. All updates to approvals, hours, project/assignment state and moderation create `audit_logs` entries.

## Hours calculation logic

For wallet `W(talent, month)`: `committed` is monthly allocation (admin-configured minimum validated at update); `voluntary` is separately tracked. `available = committed + voluntary - reserved - approved` with all figures derived from the immutable ledger rather than mutable counters.

When an assignment is accepted, append a `reservation` for estimated hours after checking availability. Time entry submission does not deduct hours. On approval, append an `approved` transaction and release the proportional reservation. On rejection/cancellation, append a compensating release; never delete the original transaction. Enforce: no duplicate entry signature, no entry outside assignment dates, daily maximum (configurable), and no approved total over allocation unless an approved allocation amendment exists. Unused month allocation expires through a scheduled ledger event, preserving history.

## Phased delivery

1. Foundation: roles/RLS, talent profile, skills, organisation integration, support requests, review flow.
2. Matching & assignments: applications, invitations, explainable recommendations, workspaces/tasks/milestones.
3. Hours: wallets, reservations, time-entry review, immutable ledger, safeguards and audit trail.
4. Verification: moderated feedback, portfolio, evidence rules, certificates, exports and public pages.
5. Analytics: aggregate reporting, supply/demand insights, notifications and optimisation.

## Architecture risks to resolve before integration

- Confirm the organisation primary key and verification-state model before writing migrations; use compatibility views if legacy data has inconsistent geography/taxonomy IDs.
- Reconcile the existing user roles with accelerator role claims, rather than introducing a parallel auth system.
- Treat hours as financial-grade audit data: use database transactions / RPC functions for every reservation, approval and release; do not calculate balances only in the UI.
- Establish file retention, consent and safeguarding policies before allowing uploads or public portfolios.
- Match-score criteria must be visible and adjustable, and must support human override to avoid opaque or discriminatory selection.
