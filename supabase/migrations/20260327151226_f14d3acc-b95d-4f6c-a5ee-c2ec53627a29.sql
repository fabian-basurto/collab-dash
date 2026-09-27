
CREATE TABLE public.dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  snapshot JSONB NOT NULL,
  label TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view snapshots"
  ON public.dashboard_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members dm
      WHERE dm.dashboard_id = dashboard_snapshots.dashboard_id
        AND dm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and owners can create snapshots"
  ON public.dashboard_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_members dm
      WHERE dm.dashboard_id = dashboard_snapshots.dashboard_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can delete snapshots"
  ON public.dashboard_snapshots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members dm
      WHERE dm.dashboard_id = dashboard_snapshots.dashboard_id
        AND dm.user_id = auth.uid()
        AND dm.role = 'owner'
    )
  );
