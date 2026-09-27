import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { motion, AnimatePresence } from "framer-motion";

interface CursorData {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = [
  "hsl(230, 80%, 56%)",
  "hsl(262, 70%, 58%)",
  "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 70%, 55%)",
  "hsl(190, 70%, 45%)",
];

export function CursorOverlay({ dashboardId }: { dashboardId: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const throttle = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`cursors:${dashboardId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (payload.userId === user.id) return;
        setCursors((prev) => ({ ...prev, [payload.userId]: payload as CursorData }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dashboardId, user]);

  // Remove stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next = { ...prev };
        // Keep all cursors — they'll be removed when user leaves presence
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!channelRef.current || !user) return;
      const now = Date.now();
      if (now - throttle.current < 50) return; // 20fps max
      throttle.current = now;

      const container = document.querySelector("[data-cursor-area]");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const colorIdx = user.id.charCodeAt(0) % COLORS.length;

      channelRef.current.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: user.id,
          displayName: profile?.display_name || user.email?.split("@")[0] || "User",
          x,
          y,
          color: COLORS[colorIdx],
        },
      });
    },
    [user, profile]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {Object.values(cursors).map((c) => (
          <motion.div
            key={c.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: 1,
              left: `${c.x}%`,
              top: `${c.y}%`,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 3L10 17L12.5 10.5L19 8L3 3Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <span
              className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.displayName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
