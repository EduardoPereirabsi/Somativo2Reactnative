-- Maratona - esquema do bonus em nuvem (Supabase / Postgres).
--
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase.
-- Ele cria a tabela da colecao (favoritos, assistidas e notas) e liga o
-- Row Level Security: cada usuario so enxerga e altera as proprias linhas.

create table if not exists public.collection_items (
  user_id         uuid        not null references auth.users (id) on delete cascade,
  show_id         integer     not null,
  is_favorite     boolean     not null default false,
  is_watched      boolean     not null default false,
  personal_rating smallint    check (personal_rating between 1 and 5),
  payload         jsonb       not null,   -- resumo da serie: id, nome, capa, generos
  updated_at      timestamptz not null default now(),
  primary key (user_id, show_id)
);

alter table public.collection_items enable row level security;

-- O app faz upsert (insert + update), select e delete.
drop policy if exists "colecao: ler a propria" on public.collection_items;
create policy "colecao: ler a propria"
  on public.collection_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "colecao: inserir na propria" on public.collection_items;
create policy "colecao: inserir na propria"
  on public.collection_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "colecao: alterar a propria" on public.collection_items;
create policy "colecao: alterar a propria"
  on public.collection_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "colecao: remover da propria" on public.collection_items;
create policy "colecao: remover da propria"
  on public.collection_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
