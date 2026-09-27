-- Add dataset mapping metadata to widgets
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS dataset_id UUID REFERENCES public.dashboard_datasets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS x_key TEXT,
  ADD COLUMN IF NOT EXISTS y_key TEXT;

CREATE INDEX IF NOT EXISTS idx_widgets_dataset_id
  ON public.widgets(dataset_id);