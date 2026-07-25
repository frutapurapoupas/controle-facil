-- Supabase table schema for Contas ARS

create table if not exists public.accounts (
  id text primary key,
  title text,
  type text,
  category text,
  amount numeric,
  due_date date,
  created_at timestamptz,
  paid boolean,
  recurring boolean,
  recurrence text,
  recurrence_count integer,
  note text,
  photo text
);

create index if not exists accounts_created_idx on public.accounts(created_at desc);
