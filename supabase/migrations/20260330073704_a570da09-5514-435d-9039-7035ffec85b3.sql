-- Allow owners to update member roles
CREATE POLICY "Owners can update members"
ON public.dashboard_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dashboard_members dm
    WHERE dm.dashboard_id = dashboard_members.dashboard_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dashboard_members dm
    WHERE dm.dashboard_id = dashboard_members.dashboard_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'owner'
  )
);

-- Allow owners to delete members
CREATE POLICY "Owners can delete members"
ON public.dashboard_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dashboard_members dm
    WHERE dm.dashboard_id = dashboard_members.dashboard_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'owner'
  )
);