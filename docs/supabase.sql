-- PROPOSTA DE MIGRAÇÃO. Não aplicada. Executar somente em projeto de homologação autorizado.
-- Alvo: Supabase Auth para identidades; Postgres para cadastros e protocolos.
-- Credenciais e sessões do SQLite de demonstração NÃO são migradas.
begin;
create schema if not exists portal_private;
revoke all on schema portal_private from public, anon, authenticated;
create table public.portal_customers (
 id uuid primary key default gen_random_uuid(), name text not null,
 email text not null, phone text, siprov_person_id text unique,
 created_at timestamptz not null default now()
);
create table public.portal_memberships (
 user_id uuid primary key references auth.users(id),
 customer_id uuid references public.portal_customers(id),
 role text not null check(role in ('client','support','admin')),
 active boolean not null default true,
 check ((role='client' and customer_id is not null) or (role<>'client' and customer_id is null))
);
create table public.portal_plans (
 id uuid primary key default gen_random_uuid(),name text not null,
 benefits jsonb not null default '[]'::jsonb, active boolean not null default true
);
create table public.portal_subscriptions (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.portal_customers(id),
 plan_id uuid not null references public.portal_plans(id),
 status text not null, starts_on date, ends_on date
 -- sem preços calculados, multa ou regras contratuais presumidas
);
create table public.portal_vehicles (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.portal_customers(id),
 subscription_id uuid references public.portal_subscriptions(id),
 description text not null, plate text not null
);
create table public.portal_requests (
 id uuid primary key default gen_random_uuid(),
 protocol text not null unique,
 customer_id uuid not null references public.portal_customers(id),
 kind text not null check(kind in ('Atendimento','Mudança de plano','Cancelamento','Atualização cadastral')),
 subject text not null check(length(subject) between 4 and 120),
 body text not null check(length(body) between 10 and 2000),
 status text not null default 'Aberto' check(status in ('Aberto','Em análise','Aguardando cliente','Concluído')),
 assigned_to uuid references auth.users(id),
 destination text not null default 'atendimento' check(destination in ('atendimento','comercial')),
 idempotency_key uuid not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(customer_id,idempotency_key)
);
create table public.portal_request_actions (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.portal_requests(id),
 actor_id uuid not null references auth.users(id),
 status text not null,message text not null,created_at timestamptz not null default now()
);
create table portal_private.document_links (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.portal_customers(id),
 provider_token text not null unique,signer_token text,
 verified_by uuid not null references auth.users(id),verified_at timestamptz not null default now()
);
create table portal_private.webhook_events (
 digest text primary key,provider text not null,received_at timestamptz not null default now(),
 state text not null default 'pending_reconciliation',attempts integer not null default 0,
 next_attempt_at timestamptz
);
create table portal_private.audit (
 id bigint generated always as identity primary key,
 actor_id uuid,event text not null,resource_id uuid,at timestamptz not null default now()
);
-- Apenas vínculo verificado por operador. Sem policy de insert/update pelo cliente.
create function portal_private.current_customer() returns uuid
 language sql stable security definer set search_path='' as $$
 select customer_id from public.portal_memberships where user_id=(select auth.uid()) and active and role='client'
$$;
create function portal_private.is_staff() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_memberships where user_id=(select auth.uid()) and active and role in ('support','admin'))
$$;
revoke all on function portal_private.current_customer() from public;
revoke all on function portal_private.is_staff() from public;
grant usage on schema portal_private to authenticated;
grant execute on function portal_private.current_customer() to authenticated;
grant execute on function portal_private.is_staff() to authenticated;
-- RLS em todas as tabelas e nenhuma escrita direta para anon/authenticated.
alter table public.portal_customers enable row level security;
alter table public.portal_memberships enable row level security;
alter table public.portal_plans enable row level security;
alter table public.portal_subscriptions enable row level security;
alter table public.portal_vehicles enable row level security;
alter table public.portal_requests enable row level security;
alter table public.portal_request_actions enable row level security;
alter table portal_private.document_links enable row level security;
alter table portal_private.webhook_events enable row level security;
alter table portal_private.audit enable row level security;
revoke all on public.portal_customers,public.portal_memberships,public.portal_plans,public.portal_subscriptions,public.portal_vehicles,public.portal_requests,public.portal_request_actions from anon,authenticated;
grant select on public.portal_customers,public.portal_memberships,public.portal_plans,public.portal_subscriptions,public.portal_vehicles,public.portal_requests,public.portal_request_actions to authenticated;
revoke all on all tables in schema portal_private from anon,authenticated;
create policy own_membership on public.portal_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy own_customer on public.portal_customers for select to authenticated using(id=(select portal_private.current_customer()) or (select portal_private.is_staff()));
create policy visible_plans on public.portal_plans for select to authenticated using((select portal_private.is_staff()) or exists(select 1 from public.portal_subscriptions s where s.plan_id=portal_plans.id and s.customer_id=(select portal_private.current_customer())));
create policy own_subscription on public.portal_subscriptions for select to authenticated using(customer_id=(select portal_private.current_customer()) or (select portal_private.is_staff()));
create policy own_vehicle on public.portal_vehicles for select to authenticated using(customer_id=(select portal_private.current_customer()) or (select portal_private.is_staff()));
create policy own_request on public.portal_requests for select to authenticated using(customer_id=(select portal_private.current_customer()) or (select portal_private.is_staff()));
create policy own_actions on public.portal_request_actions for select to authenticated using(exists(select 1 from public.portal_requests r where r.id=request_id));
create index requests_customer on public.portal_requests(customer_id,created_at desc);
create index subscriptions_customer on public.portal_subscriptions(customer_id);
create index vehicles_customer on public.portal_vehicles(customer_id);
create index request_actions_request on public.portal_request_actions(request_id,created_at);
-- Backend confiável: operações após validação de JWT, papel e propriedade.
-- service_role/secret key contornam RLS: nunca enviar ao browser.
grant usage on schema portal_private to service_role;
grant all on public.portal_customers,public.portal_memberships,public.portal_plans,public.portal_subscriptions,public.portal_vehicles,public.portal_requests,public.portal_request_actions to service_role;
grant all on all tables in schema portal_private to service_role;
grant usage,select on all sequences in schema portal_private to service_role;
commit;
