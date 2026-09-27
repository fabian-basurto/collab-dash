-- Dashboard datasets table for storing uploaded data
CREATE TABLE public.dashboard_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dashboard_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_datasets_dashboard_id
  ON public.dashboard_datasets(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_datasets_created_at
  ON public.dashboard_datasets(created_at DESC);

ALTER TABLE public.dashboard_datasets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_dashboard_datasets_updated_at
  BEFORE UPDATE ON public.dashboard_datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members can view datasets"
  ON public.dashboard_datasets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members dm
      WHERE dm.dashboard_id = dashboard_datasets.dashboard_id
        AND dm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and owners can create datasets"
  ON public.dashboard_datasets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[])
  );

CREATE POLICY "Editors and owners can update datasets"
  ON public.dashboard_datasets FOR UPDATE TO authenticated
  USING (
    public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[])
  )
  WITH CHECK (
    public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[])
  );

CREATE POLICY "Editors and owners can delete datasets"
  ON public.dashboard_datasets FOR DELETE TO authenticated
  USING (
    public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[])
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_datasets;
ALTER TABLE public.dashboard_datasets REPLICA IDENTITY FULL;
