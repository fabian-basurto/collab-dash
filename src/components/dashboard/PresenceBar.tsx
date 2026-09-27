import type { PresenceUser } from "@/hooks/usePresence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";

const AVATAR_COLORS = [
  "bg-primary", "bg-accent", "bg-[hsl(var(--chart-3))]",
  "bg-[hsl(var(--chart-4))]", "bg-destructive",
];

export function PresenceBar({ users }: { users: PresenceUser[] }) {
  const editingUsers = users.filter((u) => u.editingWidgetId);

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence>
        {editingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-xs font-medium text-accent">
              {editingUsers.map((u) => u.displayName).join(", ")} editing…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 mr-1">
          <Wifi className="h-3 w-3 text-[hsl(var(--success))]" />
          <span className="text-[11px] font-medium text-muted-foreground">
            {users.length}
          </span>
        </div>
        <div className="flex -space-x-2">
          <AnimatePresence>
            {users.slice(0, 8).map((u, i) => (
              <motion.div
                key={u.userId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar
                      className={`h-7 w-7 border-2 transition-all duration-200 ${
                        u.editingWidgetId
                          ? "border-accent ring-2 ring-accent/30 scale-105"
                          : "border-card hover:scale-105"
                      }`}
                    >
                      <AvatarFallback className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-primary-foreground text-[10px] font-bold`}>
                        {(u.displayName || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs font-medium">
                      {u.displayName}
                      {u.editingWidgetId && <span className="text-accent ml-1">— editing</span>}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
          {users.length > 8 && (
            <Avatar className="h-7 w-7 border-2 border-card">
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                +{users.length - 8}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
