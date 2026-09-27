import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Widget } from "./useWidgets";

export interface Snapshot {
  id: string;
  dashboard_id: string;
  snapshot: any;
  label: string | null;
  created_by: string;
  created_at: string;
}

export function useSnapshots(dashboardId: string) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_snapshots")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error("Failed to load version history");
    } else {
      setSnapshots(data || []);
    }
    setLoading(false);
  }, [dashboardId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const saveSnapshot = useCallback(
    async (widgets: Widget[], label?: string) => {
      if (!user) return;
      const widgetData = widgets.map((w) => ({
        id: w.id,
        type: w.type,
        position: w.position,
        data: w.data,
        title: w.title,
      }));
      const { error } = await supabase.from("dashboard_snapshots").insert({
        dashboard_id: dashboardId,
        snapshot: widgetData,
        label: label || `Version ${new Date().toLocaleString()}`,
        created_by: user.id,
      });
      if (error) {
        toast.error("Failed to save snapshot");
      } else {
        toast.success("Version saved");
        fetchSnapshots();
      }
    },
    [dashboardId, user, fetchSnapshots]
  );

  const restoreSnapshot = useCallback(
    async (snapshot: Snapshot) => {
      const widgetsData = snapshot.snapshot as any[];
      // Delete all current widgets
      const { error: delError } = await supabase
        .from("widgets")
        .delete()
        .eq("dashboard_id", dashboardId);
      if (delError) {
        toast.error("Failed to restore version");
        return;
      }
      // Re-insert from snapshot
      if (widgetsData.length > 0) {
        const inserts = widgetsData.map((w: any) => ({
          dashboard_id: dashboardId,
          type: w.type,
          position: w.position,
          data: w.data,
          title: w.title,
          created_by: user?.id,
        }));
        const { error: insError } = await supabase.from("widgets").insert(inserts);
        if (insError) {
          toast.error("Failed to restore widgets");
          return;
        }
      }
      toast.success("Version restored — all users synced");
    },
    [dashboardId, user]
  );

  return { snapshots, loading, saveSnapshot, restoreSnapshot, fetchSnapshots };
}
