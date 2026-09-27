
-- Add a short shareable code to dashboards
ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_dashboards_share_code ON public.dashboards(share_code);

-- Function to join a dashboard by share code
CREATE OR REPLACE FUNCTION public.join_dashboard_by_code(_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dashboard_id UUID;
  _user_id UUID := auth.uid();
  _existing BOOLEAN;
BEGIN
  -- Find dashboard by code
  SELECT id INTO _dashboard_id FROM public.dashboards WHERE share_code = _code;
  
  IF _dashboard_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid dashboard code');
  END IF;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM public.dashboard_members 
    WHERE dashboard_id = _dashboard_id AND user_id = _user_id
  ) INTO _existing;
  
  IF _existing THEN
    RETURN json_build_object('dashboard_id', _dashboard_id, 'message', 'Already a member');
  END IF;
  
  -- Add as editor by default
  INSERT INTO public.dashboard_members (dashboard_id, user_id, role)
  VALUES (_dashboard_id, _user_id, 'editor');
  
  RETURN json_build_object('dashboard_id', _dashboard_id, 'message', 'Joined successfully');
END;
$$;
