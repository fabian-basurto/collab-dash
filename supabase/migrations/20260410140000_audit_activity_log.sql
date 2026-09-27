-- Audit log schema update for widget activity
alter table public.activity_log
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists old_data jsonb,
  add column if not exists new_data jsonb;

alter table public.activity_log
  drop column if exists details;

create or replace function public.log_widget_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.activity_log (
      dashboard_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      created_at
    ) values (
      NEW.dashboard_id,
      auth.uid(),
      'CREATE',
      'widget',
      NEW.id,
      null,
      row_to_json(NEW),
      now()
    );
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    insert into public.activity_log (
      dashboard_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      created_at
    ) values (
      NEW.dashboard_id,
      auth.uid(),
      'UPDATE',
      'widget',
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW),
      now()
    );
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into public.activity_log (
      dashboard_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      created_at
    ) values (
      OLD.dashboard_id,
      auth.uid(),
      'DELETE',
      'widget',
      OLD.id,
      row_to_json(OLD),
      null,
      now()
    );
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists widgets_audit_log on public.widgets;
create trigger widgets_audit_log
after insert or update or delete on public.widgets
for each row execute function public.log_widget_activity();
