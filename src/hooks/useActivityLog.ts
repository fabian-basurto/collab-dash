import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityEntry {
  id: string;
  dashboard_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
}

export function useActivityLog(dashboardId: string) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});

  const hydrateEntries = useCallback(
    async (entries: ActivityEntry[]) => {
      const userIds = Array.from(
        new Set(entries.map((entry) => entry.user_id).filter(Boolean))
      );
      const missing = userIds.filter((id) => !profilesById[id]);

      let merged = profilesById;
      if (missing.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", missing);
        if (data && data.length > 0) {
          merged = { ...merged };
          data.forEach((p) => {
            merged[p.id] = p as ProfileRow;
          });
          setProfilesById(merged);
        }
      }

      return entries.map((entry) => ({
        ...entry,
        profile: merged[entry.user_id],
      }));
    },
    [profilesById]
  );

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id, dashboard_id, user_id, action, entity_type, entity_id, old_data, new_data, created_at")
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        const hydrated = await hydrateEntries(data as ActivityEntry[]);
        setActivities(hydrated);
      }
    };
    fetch();
  }, [dashboardId, hydrateEntries]);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel(`activity:${dashboardId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `dashboard_id=eq.${dashboardId}` },
        (payload) => {
          const entry = payload.new as ActivityEntry;
          void (async () => {
            const hydrated = await hydrateEntries([entry]);
            setActivities((prev) => [hydrated[0], ...prev].slice(0, 50));
          })();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dashboardId, hydrateEntries]);

  return { activities };
}
