-- Enforce dataset-driven widgets (no inline widget data)
alter table public.widgets
  drop column if exists data;

-- Keep dataset_id nullable so widgets become inactive when dataset is deleted
-- (dataset_id already references public.dashboard_datasets with ON DELETE SET NULL)
