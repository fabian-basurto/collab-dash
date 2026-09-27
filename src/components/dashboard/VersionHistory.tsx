import { useState } from "react";
import type { Snapshot } from "@/hooks/useSnapshots";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, ChevronRight, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VersionHistoryProps {
  snapshots: Snapshot[];
  loading: boolean;
  onSave?: () => void;
  onRestore?: (snapshot: Snapshot) => void;
}

export function VersionHistory({ snapshots, loading, onSave, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">History</span>
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-border bg-card shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Version History
              </h4>
              <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onSave}>
                <Save className="h-3 w-3" />
                Save Now
              </Button>
            </div>
            <ScrollArea className="max-h-64">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : snapshots.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No versions saved yet
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {snapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {idx === 0 && (
                            <span className="mr-1.5 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Latest
                            </span>
                          )}
                          {snap.label || "Untitled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(snap.created_at).toLocaleString()}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will replace all current widgets with the saved version. All connected users will be synced instantly.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRestore(snap)}>
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
