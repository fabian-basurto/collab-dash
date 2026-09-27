import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "./useProfile";

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  onlineAt: string;
  editingWidgetId: string | null;
}

export function usePresence(dashboardId: string) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [channelRef, setChannelRef] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !dashboardId) return;

    const channel = supabase.channel(`presence:${dashboardId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        for (const key in state) {
          const presences = state[key];
          if (presences.length > 0) {
            users.push(presences[0]);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            displayName: profile?.display_name || user.email?.split("@")[0] || "User",
            avatarUrl: profile?.avatar_url,
            onlineAt: new Date().toISOString(),
            editingWidgetId: null,
          });
        }
      });

    setChannelRef(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dashboardId, profile]);

  const setEditingWidget = useCallback(
    async (widgetId: string | null) => {
      if (!channelRef || !user) return;
      await channelRef.track({
        userId: user.id,
        displayName: profile?.display_name || user.email?.split("@")[0] || "User",
        avatarUrl: profile?.avatar_url,
        onlineAt: new Date().toISOString(),
        editingWidgetId: widgetId,
      });
    },
    [channelRef, user, profile]
  );

  return { onlineUsers, setEditingWidget };
}
