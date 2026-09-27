
-- Fix dashboards SELECT: allow owner to see their own dashboard even before membership row exists
DROP POLICY IF EXISTS "Members can view dashboards" ON public.dashboards;
CREATE POLICY "Members can view dashboards" ON public.dashboards
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_dashboard_member(auth.uid(), id));

-- Fix dashboard_members INSERT: allow dashboard owner to add members (including themselves)
DROP POLICY IF EXISTS "Owners can manage members" ON public.dashboard_members;
CREATE POLICY "Owners can manage members" ON public.dashboard_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_members.dashboard_id AND dashboards.owner_id = auth.uid()
    ))
    OR
    is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner'::dashboard_role])
  );
