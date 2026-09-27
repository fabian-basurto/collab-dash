
-- 1. Fix infinite recursion: create security definer function for membership check
CREATE OR REPLACE FUNCTION public.is_dashboard_member(_user_id uuid, _dashboard_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_members
    WHERE user_id = _user_id AND dashboard_id = _dashboard_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_dashboard_member_with_role(_user_id uuid, _dashboard_id uuid, _roles dashboard_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_members
    WHERE user_id = _user_id AND dashboard_id = _dashboard_id AND role = ANY(_roles)
  )
$$;

-- 2. Drop and recreate dashboard_members policies using the function
DROP POLICY IF EXISTS "Members can view dashboard members" ON public.dashboard_members;
CREATE POLICY "Members can view dashboard members" ON public.dashboard_members
  FOR SELECT TO authenticated
  USING (public.is_dashboard_member(auth.uid(), dashboard_id));

-- 3. Fix dashboards SELECT policy too (it also references dashboard_members)
DROP POLICY IF EXISTS "Members can view dashboards" ON public.dashboards;
CREATE POLICY "Members can view dashboards" ON public.dashboards
  FOR SELECT TO authenticated
  USING (public.is_dashboard_member(auth.uid(), id));

-- 4. Fix widgets policies
DROP POLICY IF EXISTS "Members can view widgets" ON public.widgets;
CREATE POLICY "Members can view widgets" ON public.widgets
  FOR SELECT TO authenticated
  USING (public.is_dashboard_member(auth.uid(), dashboard_id));

DROP POLICY IF EXISTS "Editors and owners can create widgets" ON public.widgets;
CREATE POLICY "Editors and owners can create widgets" ON public.widgets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[]));

DROP POLICY IF EXISTS "Editors and owners can update widgets" ON public.widgets;
CREATE POLICY "Editors and owners can update widgets" ON public.widgets
  FOR UPDATE TO authenticated
  USING (public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[]));

DROP POLICY IF EXISTS "Editors and owners can delete widgets" ON public.widgets;
CREATE POLICY "Editors and owners can delete widgets" ON public.widgets
  FOR DELETE TO authenticated
  USING (public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[]));

-- 5. Fix snapshots policies
DROP POLICY IF EXISTS "Members can view snapshots" ON public.dashboard_snapshots;
CREATE POLICY "Members can view snapshots" ON public.dashboard_snapshots
  FOR SELECT TO authenticated
  USING (public.is_dashboard_member(auth.uid(), dashboard_id));

DROP POLICY IF EXISTS "Editors and owners can create snapshots" ON public.dashboard_snapshots;
CREATE POLICY "Editors and owners can create snapshots" ON public.dashboard_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[]));

DROP POLICY IF EXISTS "Owners can delete snapshots" ON public.dashboard_snapshots;
CREATE POLICY "Owners can delete snapshots" ON public.dashboard_snapshots
  FOR DELETE TO authenticated
  USING (public.is_dashboard_member_with_role(auth.uid(), dashboard_id, ARRAY['owner','editor']::dashboard_role[]));

-- 6. Activity log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_dashboard_member(auth.uid(), dashboard_id));

CREATE POLICY "Members can insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_dashboard_member(auth.uid(), dashboard_id));

-- Enable realtime for activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- 7. Add email column to profiles for sharing lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 8. Create function to find user by email and add as member
CREATE OR REPLACE FUNCTION public.invite_user_by_email(_email text, _dashboard_id uuid, _role dashboard_role DEFAULT 'editor')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user_id uuid;
  _result jsonb;
BEGIN
  -- Check caller is owner/editor
  IF NOT is_dashboard_member_with_role(auth.uid(), _dashboard_id, ARRAY['owner']::dashboard_role[]) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  -- Find user by email in auth.users
  SELECT id INTO _target_user_id FROM auth.users WHERE email = _email;
  
  IF _target_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found. They need to sign up first.');
  END IF;

  -- Check if already a member
  IF is_dashboard_member(_target_user_id, _dashboard_id) THEN
    RETURN jsonb_build_object('error', 'User is already a member');
  END IF;

  -- Add as member
  INSERT INTO dashboard_members (dashboard_id, user_id, role)
  VALUES (_dashboard_id, _target_user_id, _role);

  RETURN jsonb_build_object('success', true, 'user_id', _target_user_id);
END;
$$;

-- 9. Update profile trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
