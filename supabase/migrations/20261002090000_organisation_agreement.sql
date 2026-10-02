-- Organisations sign their own agreement before they can be created (see src/agreement.js).
-- Applied to the live project as migration "organisation_agreement"; see that migration for the full body of
-- current_agreement(), sign_org_agreement() and the updated create_organisation().
alter table public.agreement_signatures add column organisation_id uuid, add column signer_role text not null default '';
