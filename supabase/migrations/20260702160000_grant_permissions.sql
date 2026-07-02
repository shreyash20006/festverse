-- Grant SELECT/INSERT/UPDATE/DELETE permissions to authenticated and anon roles on all new SaaS/payment tables.
-- This ensures PostgREST (Supabase Client) can query them, while RLS policies enforce security.

-- 1. subscription_plans
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans to service_role;

-- 2. subscriptions
grant select on public.subscriptions to authenticated;
grant insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- 3. event_pricing
grant select on public.event_pricing to anon, authenticated;
grant insert, update, delete on public.event_pricing to authenticated;
grant all on public.event_pricing to service_role;

-- 4. coupons
grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;

-- 5. coupon_usage
grant select, insert on public.coupon_usage to authenticated;
grant all on public.coupon_usage to service_role;

-- 6. payment_logs
grant select, insert on public.payment_logs to authenticated;
grant all on public.payment_logs to service_role;

-- 7. refunds
grant select, insert on public.refunds to authenticated;
grant all on public.refunds to service_role;

-- 8. invoices
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;

-- 9. google_forms (if exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='google_forms') then
    grant select, insert, update, delete on public.google_forms to authenticated;
  end if;
end $$;

-- 10. activity_logs
grant select on public.activity_logs to authenticated;

