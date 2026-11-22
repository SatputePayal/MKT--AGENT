create table campaigns (id text primary key, name text, channel text, status text check (status in ('draft','pending_approval','active','rejected')),
  approved_budget numeric not null, spent numeric not null default 0, plan jsonb, approved_by text, created_at timestamptz default now(),
  constraint spend_within_budget check (spent <= approved_budget));  -- DB-level backstop for the budget guardrail
create table metrics (campaign_id text references campaigns(id), date date, impressions int, clicks int, spend numeric, conversions int, revenue numeric, primary key (campaign_id, date));
create table approvals (id bigserial primary key, campaign_id text references campaigns(id), decision text, reviewer text, decided_at timestamptz default now());
