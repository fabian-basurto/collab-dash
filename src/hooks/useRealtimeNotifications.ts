import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook that listens for realtime widget changes and shows toasts
 * when OTHER users make modifications.
 */
export function useRealtimeNotifications(dashboardId: string) {
  const { user } = useAuth();
  const lastNotified = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!dashboardId || !user) return;

    const channel = supabase
      .channel(`notifications:${dashboardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "widgets",
          filter: `dashboard_id=eq.${dashboardId}`,
        },
        (payload) => {
          // Skip own changes
          const createdBy = (payload.new as any)?.created_by;
          if (createdBy === user.id) return;

          // Throttle: one notification per widget per 3 seconds
          const widgetId = (payload.new as any)?.id || (payload.old as any)?.id;
          const now = Date.now();
          if (lastNotified.current[widgetId] && now - lastNotified.current[widgetId] < 3000) return;
          lastNotified.current[widgetId] = now;

          const title = (payload.new as any)?.title || "Widget";

          switch (payload.eventType) {
            case "INSERT":
              toast.info(`🆕 New widget added: "${title}"`, { duration: 3000 });
              break;
            case "UPDATE":
              toast.info(`✏️ "${title}" was updated`, { duration: 2000 });
              break;
            case "DELETE":
              toast.info(`🗑️ A widget was removed`, { duration: 2000 });
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dashboardId, user]);
}
