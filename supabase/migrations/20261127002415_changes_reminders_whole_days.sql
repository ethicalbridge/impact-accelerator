-- 27 Nov 2026: reminders count whole days. The daily run (03:35 UTC) came a few hours short of "4 days" after the
-- previous reminder and slipped each reminder by a day. The admin cards show the same date the run will use.
do $do$ begin
  execute replace(replace(replace(pg_get_functiondef('public.changes_reminders'::regproc),
    'continue when now() < r.asked_at + interval ''3 days'' + sent * interval ''4 days'' or (last_at is not null and last_at > now() - interval ''4 days'');',
    'continue when current_date < (r.asked_at + interval ''3 days'' + sent * interval ''4 days'')::date or (last_at is not null and last_at::date > current_date - 4);'),
    'if last_at < now() - interval ''4 days'' and not exists',
    'if last_at::date <= current_date - 4 and not exists'),
    'LANGUAGE plpgsql', 'LANGUAGE plpgsql');
  execute replace(replace(pg_get_functiondef('public.admin_review_rounds'::regproc),
    'else greatest(r.asked_at + interval ''3 days'' + rem.n * interval ''4 days'', coalesce(rem.last_at + interval ''4 days'', r.asked_at)) end,',
    'else greatest((r.asked_at + interval ''3 days'' + rem.n * interval ''4 days'')::date, coalesce((rem.last_at + interval ''4 days'')::date, r.asked_at::date), current_date) end,'),
    '''alert_at'', case when r.resent_at is null and not r.reminders_off and rem.n >= 3 then rem.last_at + interval ''4 days'' end,',
    '''alert_at'', case when r.resent_at is null and not r.reminders_off and rem.n >= 3 then (rem.last_at + interval ''4 days'')::date end,');
end $do$;
