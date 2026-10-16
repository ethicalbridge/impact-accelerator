-- Visible messages say "contribution", like the rest of the site (the table keeps its name "engagements").
-- Rewrites only quoted message text inside these functions; logic and identifiers are untouched.
do $$
declare
  fn record;
  def text;
  pairs text[][] := array[
    array['''You cannot complete this engagement.''', '''You cannot complete this contribution.'''],
    array['''This engagement has already finished.''', '''This contribution has already finished.'''],
    array['''Only an active engagement can be completed.''', '''Only an active contribution can be completed.'''],
    array['''You are not a party to this engagement.''', '''You are not a party to this contribution.'''],
    array['''Engagement completed''', '''Contribution completed'''],
    array['''Engagement ended''', '''Contribution ended'''],
    array['''An engagement was ended''', '''A contribution was ended''']
  ];
  i int;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('complete_engagement', 'end_engagement', 'sign_engagement', 'review_hours', 'answer_followup', 'set_contribution_visibility')
  loop
    def := pg_get_functiondef(fn.oid);
    for i in 1 .. array_length(pairs, 1) loop
      def := replace(def, pairs[i][1], pairs[i][2]);
    end loop;
    if def <> pg_get_functiondef(fn.oid) then
      execute def;
    end if;
  end loop;
end $$;
