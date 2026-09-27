
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dashboards table
CREATE TABLE public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dashboard members table
CREATE TYPE public.dashboard_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.dashboard_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.dashboard_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dashboard_id, user_id)
);

ALTER TABLE public.dashboard_members ENABLE ROW LEVEL SECURITY;

-- Dashboard RLS: members can see dashboards they belong to
CREATE POLICY "Members can view dashboards"
  ON public.dashboards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members
      WHERE dashboard_members.dashboard_id = dashboards.id
      AND dashboard_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create dashboards"
  ON public.dashboards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update dashboards"
  ON public.dashboards FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete dashboards"
  ON public.dashboards FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Dashboard members RLS
CREATE POLICY "Members can view dashboard members"
  ON public.dashboard_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members AS dm
      WHERE dm.dashboard_id = dashboard_members.dashboard_id
      AND dm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage members"
  ON public.dashboard_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboards
      WHERE dashboards.id = dashboard_members.dashboard_id
      AND dashboards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can remove members"
  ON public.dashboard_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboards
      WHERE dashboards.id = dashboard_members.dashboard_id
      AND dashboards.owner_id = auth.uid()
    )
  );

-- Widgets table
CREATE TABLE public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bar', 'line')),
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}',
  data JSONB NOT NULL DEFAULT '[]',
  title TEXT NOT NULL DEFAULT 'Untitled Widget',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_widgets_updated_at
  BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Widgets RLS: dashboard members can access widgets
CREATE POLICY "Members can view widgets"
  ON public.widgets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members
      WHERE dashboard_members.dashboard_id = widgets.dashboard_id
      AND dashboard_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and owners can create widgets"
  ON public.widgets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_members
      WHERE dashboard_members.dashboard_id = widgets.dashboard_id
      AND dashboard_members.user_id = auth.uid()
      AND dashboard_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors and owners can update widgets"
  ON public.widgets FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members
      WHERE dashboard_members.dashboard_id = widgets.dashboard_id
      AND dashboard_members.user_id = auth.uid()
      AND dashboard_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors and owners can delete widgets"
  ON public.widgets FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_members
      WHERE dashboard_members.dashboard_id = widgets.dashboard_id
      AND dashboard_members.user_id = auth.uid()
      AND dashboard_members.role IN ('owner', 'editor')
    )
  );

-- Enable realtime for widgets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.widgets;

-- Enable full replica identity for realtime
ALTER TABLE public.widgets REPLICA IDENTITY FULL;
