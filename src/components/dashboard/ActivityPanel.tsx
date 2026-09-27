import { useState } from "react";
import type { ActivityEntry } from "@/hooks/useActivityLog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTION_ICONS: Record<string, string> = {
  CREATE: "➕",
  UPDATE: "✏️",
  DELETE: "🗑️",
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

export function ActivityPanel({ activities }: { activities: ActivityEntry[] }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <Activity className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Activity</span>
        {activities.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
            {activities.length}
          </span>
        )}
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-[26rem] rounded-lg border border-border bg-card shadow-lg"
          >
            <div className="border-b border-border px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Feed
              </h4>
            </div>
            <ScrollArea className="max-h-72">
              {activities.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No activity yet
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activities.map((a) => (
                    <div key={a.id} className="px-3 py-2">
                      <button
                        type="button"
                        className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <span className="text-base">{ACTION_ICONS[a.action] || "📌"}</span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {a.profile?.display_name || a.profile?.email || "Unknown user"}
                                </span>
                                {a.profile?.display_name && a.profile?.email && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {a.profile.email}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    ACTION_STYLES[a.action] || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {formatAction(a.action)}
                                </span>
                                <span className="text-xs text-foreground">
                                  {getWidgetTitle(a)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTimestamp(a.created_at)}
                                </span>
                              </div>
                              <div className="mt-2 text-[11px] text-muted-foreground">
                                {renderChangePreview(a)}
                              </div>
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                              expandedId === a.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedId === a.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-md border border-border bg-background px-3 py-2">
                              <div className="text-xs font-semibold text-muted-foreground">Changes</div>
                              <div className="mt-2 space-y-1">
                                {renderChangeList(a)}
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-md border border-border bg-rose-50/60 p-2">
                                  <div className="text-[10px] font-semibold text-rose-700">Old Data</div>
                                  <pre className="mt-1 max-h-40 overflow-auto text-[10px] text-rose-700">
                                    {stringifyData(a.old_data)}
                                  </pre>
                                </div>
                                <div className="rounded-md border border-border bg-emerald-50/60 p-2">
                                  <div className="text-[10px] font-semibold text-emerald-700">New Data</div>
                                  <pre className="mt-1 max-h-40 overflow-auto text-[10px] text-emerald-700">
                                    {stringifyData(a.new_data)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatAction(action: string): string {
  if (action === "CREATE") return "CREATED WIDGET";
  if (action === "UPDATE") return "UPDATED WIDGET";
  if (action === "DELETE") return "DELETED WIDGET";
  return action.replace(/_/g, " ").toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

function getWidgetTitle(entry: ActivityEntry): string {
  return entry.new_data?.title || entry.old_data?.title || "Widget";
}

function getChanges(entry: ActivityEntry) {
  const ignoreKeys = new Set(["created_at", "updated_at", "dashboard_id"]);
  const oldData = entry.old_data || {};
  const newData = entry.new_data || {};
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  const changes: { key: string; oldValue: any; newValue: any }[] = [];
  keys.forEach((key) => {
    if (ignoreKeys.has(key)) return;
    const oldValue = (oldData as Record<string, any>)[key];
    const newValue = (newData as Record<string, any>)[key];
    if (!isEqualValue(oldValue, newValue)) {
      changes.push({ key, oldValue, newValue });
    }
  });

  return changes;
}

function renderChangePreview(entry: ActivityEntry) {
  const changes = getChanges(entry);
  if (changes.length === 0) {
    if (entry.action === "CREATE") return "Created widget";
    if (entry.action === "DELETE") return "Deleted widget";
    return "No field changes recorded";
  }

  const preview = changes.slice(0, 2);
  return (
    <span>
      {preview.map((change, index) => (
        <span key={change.key}>
          <span className="text-rose-600">{formatValue(change.oldValue)}</span>
          <span className="mx-1 text-muted-foreground">→</span>
          <span className="text-emerald-600">{formatValue(change.newValue)}</span>
          {index < preview.length - 1 && <span className="text-muted-foreground"> • </span>}
        </span>
      ))}
      {changes.length > 2 && <span className="text-muted-foreground"> +{changes.length - 2} more</span>}
    </span>
  );
}

function renderChangeList(entry: ActivityEntry) {
  const changes = getChanges(entry);
  if (changes.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">No field-level changes recorded.</div>
    );
  }

  return changes.map((change) => (
    <div key={change.key} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="min-w-[80px] rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
        {change.key}
      </span>
      <span className="text-rose-600">{formatValue(change.oldValue)}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-emerald-600">{formatValue(change.newValue)}</span>
    </div>
  ));
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function stringifyData(value: Record<string, any> | null): string {
  if (!value) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isEqualValue(a: any, b: any): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
