-- Recursos operacionais do Sistema de Vídeos no banco do ARTX Hub.
-- O histórico é somente do servidor: não é exposto a anon/authenticated.

create table if not exists public.video_revisions (
  id bigint generated always as identity primary key,
  video_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists video_revisions_video_created_idx
on public.video_revisions (video_id, created_at desc);

alter table public.video_revisions enable row level security;
revoke all on public.video_revisions from anon, authenticated;

create or replace function public.capture_video_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_id text;
  operation text;
  snapshot_value jsonb;
begin
  if tg_table_name = 'Video' then
    target_id := coalesce(new.id, old.id);
  else
    target_id := coalesce(new."videoId", old."videoId");
  end if;
  operation := lower(tg_op);

  select jsonb_build_object(
    'video', to_jsonb(v),
    'scriptBlocks', coalesce((select jsonb_agg(to_jsonb(s) order by s."order") from public."ScriptBlock" s where s."videoId" = target_id), '[]'::jsonb),
    'checklistItems', coalesce((select jsonb_agg(to_jsonb(c) order by c."order") from public."ChecklistItem" c where c."videoId" = target_id), '[]'::jsonb)
  ) into snapshot_value
  from public."Video" v where v.id = target_id;

  if snapshot_value is null then
    snapshot_value := jsonb_build_object('deletedRow', to_jsonb(old));
  end if;

  insert into public.video_revisions(video_id, action, snapshot)
  values (target_id, operation, snapshot_value);
  return coalesce(new, old);
end;
$$;

drop trigger if exists video_revision_video on public."Video";
create trigger video_revision_video after insert or update or delete on public."Video"
for each row execute function public.capture_video_revision();

drop trigger if exists video_revision_script on public."ScriptBlock";
create trigger video_revision_script after insert or update or delete on public."ScriptBlock"
for each row execute function public.capture_video_revision();

drop trigger if exists video_revision_checklist on public."ChecklistItem";
create trigger video_revision_checklist after insert or update or delete on public."ChecklistItem"
for each row execute function public.capture_video_revision();

create table if not exists public.video_generation_limits (
  bucket timestamptz primary key,
  uses integer not null default 0 check (uses between 0 and 20)
);
alter table public.video_generation_limits enable row level security;
revoke all on public.video_generation_limits from anon, authenticated;

create or replace function public.claim_video_generation()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_bucket timestamptz := date_trunc('hour', now());
  accepted boolean := false;
begin
  insert into public.video_generation_limits(bucket, uses)
  values (current_bucket, 1)
  on conflict (bucket) do update
    set uses = public.video_generation_limits.uses + 1
    where public.video_generation_limits.uses < 20
  returning true into accepted;

  delete from public.video_generation_limits where bucket < current_bucket - interval '48 hours';
  return coalesce(accepted, false);
end;
$$;

revoke all on function public.claim_video_generation() from public, anon, authenticated;
