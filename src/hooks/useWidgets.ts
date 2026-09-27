import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Widget = Tables<"widgets">;

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CHART_TITLES: Record<string, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  pie: "Pie Chart",
  area: "Area Chart",
  kpi: "Revenue",
};

// 🚨 CRITICAL: useWidgets now scoped by DATASET, not dashboard
export function useWidgets(dashboardId: string, datasetId: string | null) {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // FETCH: Scoped by BOTH dashboard_id AND dataset_id
  useEffect(() => {
    // 🚨 Reset when dataset changes
    setWidgets([]);
    setLoading(true);

    if (!datasetId) {
      console.log("[FETCH] No dataset selected, clearing widgets");
      setLoading(false);
      return;
    }

    const fetchWidgets = async () => {
      console.log(`[FETCH] Loading widgets for dataset: ${datasetId} (dashboard: ${dashboardId})`);
      
      const { data, error } = await supabase
        .from("widgets")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .eq("dataset_id", datasetId)  // 🚨 CRITICAL: Filter by dataset_id
        .order("created_at");

      if (error) {
        console.error("[FETCH] Error loading widgets:", error);
        toast.error("Failed to load widgets");
        return;
      }

      // ✅ Validate all widgets belong to this dataset
      const validWidgets = data?.filter(
        (w) => w.dashboard_id === dashboardId && w.dataset_id === datasetId
      ) || [];
      
      console.log(
        `[FETCH] Loaded ${validWidgets.length}/${data?.length} valid widgets for dataset ${datasetId}`
      );
      
      if (validWidgets.length !== data?.length) {
        console.warn(
          `[FETCH] ⚠️ Filtered out ${(data?.length || 0) - validWidgets.length} foreign widgets`
        );
      }

      setWidgets(validWidgets);
      setLoading(false);
    };

    fetchWidgets();
  }, [dashboardId, datasetId]);

  // REALTIME: Scoped to dataset with strict filter
  useEffect(() => {
    if (!datasetId) {
      console.log("[REALTIME] No dataset selected, skipping subscription");
      return;
    }

    console.log(
      `[REALTIME] Subscribing to widgets for dataset: ${datasetId} (dashboard: ${dashboardId})`
    );

    const channel = supabase
      .channel(`widgets:${datasetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "widgets",
          filter: `dataset_id=eq.${datasetId}`,  // 🚨 CRITICAL: Filter by dataset_id
        },
        (payload) => {
          console.log(`[REALTIME] Event received for dataset: ${datasetId}`, payload.eventType);

          if (payload.eventType === "INSERT") {
            const newWidget = payload.new as Widget;
            // 🚨 CRITICAL: Validate BOTH dashboard_id AND dataset_id
            if (newWidget.dashboard_id !== dashboardId || newWidget.dataset_id !== datasetId) {
              console.log(
                `[REALTIME] ⚠️ BLOCKED: Widget belongs to dashboard ${newWidget.dashboard_id} dataset ${newWidget.dataset_id}, not dataset ${datasetId}`
              );
              return;
            }
            console.log(`[REALTIME] Widget inserted: ${newWidget.id}`);
            setWidgets((prev) => {
              if (prev.find((w) => w.id === newWidget.id)) {
                console.log("[REALTIME] Widget already exists, skipping");
                return prev;
              }
              return [...prev, newWidget];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedWidget = payload.new as Widget;
            // 🚨 CRITICAL: Validate BOTH dashboard_id AND dataset_id
            if (
              updatedWidget.dashboard_id !== dashboardId ||
              updatedWidget.dataset_id !== datasetId
            ) {
              console.log(
                `[REALTIME] ⚠️ BLOCKED: Widget belongs to dashboard ${updatedWidget.dashboard_id} dataset ${updatedWidget.dataset_id}, not dataset ${datasetId}`
              );
              return;
            }
            console.log(`[REALTIME] Widget updated: ${updatedWidget.id}`);
            setWidgets((prev) =>
              prev.map((w) => (w.id === updatedWidget.id ? updatedWidget : w))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedWidget = payload.old as Widget;
            // 🚨 CRITICAL: Validate BOTH dashboard_id AND dataset_id
            if (
              deletedWidget.dashboard_id !== dashboardId ||
              deletedWidget.dataset_id !== datasetId
            ) {
              console.log(
                `[REALTIME] ⚠️ BLOCKED: Widget belongs to dashboard ${deletedWidget.dashboard_id} dataset ${deletedWidget.dataset_id}, not dataset ${datasetId}`
              );
              return;
            }
            const deletedId = deletedWidget.id;
            console.log(`[REALTIME] Widget deleted: ${deletedId}`);
            setWidgets((prev) => prev.filter((w) => w.id !== deletedId));
            setPendingDeletions((prev) => {
              const newSet = new Set(prev);
              newSet.delete(deletedId);
              return newSet;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Subscription status for dataset ${datasetId}: ${status}`);
      });

    return () => {
      console.log(`[REALTIME] Unsubscribing from dataset: ${datasetId}`);
      supabase.removeChannel(channel);
    };
  }, [dashboardId, datasetId]);

  // ADD WIDGET: Include BOTH dashboard_id and dataset_id
  const addWidget = useCallback(
    async (
      type: "bar" | "line" | "pie" | "area" | "kpi",
      datasetIdForWidget: string,
      xKey: string,
      yKey: string,
      customTitle?: string
    ) => {
      console.log(
        `[ADD] Creating widget: type=${type}, dashboard=${dashboardId}, dataset=${datasetIdForWidget}`
      );

      const maxY = widgets.reduce((max, w) => {
        const pos = w.position as unknown as WidgetPosition;
        return Math.max(max, (pos.y || 0) + (pos.h || 3));
      }, 0);

      const position: WidgetPosition = { x: 0, y: maxY, w: 6, h: 4 };

      const { error } = await supabase.from("widgets").insert({
        dashboard_id: dashboardId,
        dataset_id: datasetIdForWidget,  // 🚨 CRITICAL: Explicitly set dataset_id
        type,
        position: position as any,
        title: customTitle || CHART_TITLES[type] || "Chart",
        created_by: user?.id,
        x_key: xKey,
        y_key: yKey,
      });

      if (error) {
        console.error("[ADD] Failed to create widget:", error);
        toast.error(error.message || "Failed to add widget");
      } else {
        console.log(`[ADD] Widget created successfully for dataset ${datasetIdForWidget}`);
      }
    },
    [dashboardId, user, widgets]
  );

  // APPLY TEMPLATE: With dataset scoping
  const applyTemplate = useCallback(
    async (
      templateWidgets: { type: "bar" | "line" | "pie" | "area"; title: string }[],
      datasetIdForTemplate: string,
      xKey: string,
      yKey: string
    ) => {
      console.log(
        `[TEMPLATE] Applying ${templateWidgets.length} widgets to dataset: ${datasetIdForTemplate}`
      );

      for (let i = 0; i < templateWidgets.length; i++) {
        const tw = templateWidgets[i];
        await addWidget(tw.type, datasetIdForTemplate, xKey, yKey, tw.title);
      }

      toast.success(`Applied template with ${templateWidgets.length} widgets`);
    },
    [addWidget]
  );

  // UPDATE POSITION: Scoped by dataset_id
  const updateWidgetPosition = useCallback(
    (widgetId: string, position: WidgetPosition) => {
      console.log(
        `[UPDATE_POS] (Dataset: ${datasetId}) Widget: ${widgetId}`,
        position
      );

      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, position: position as any } : w))
      );

      if (debounceTimers.current[widgetId]) {
        clearTimeout(debounceTimers.current[widgetId]);
      }

      debounceTimers.current[widgetId] = setTimeout(async () => {
        const { error } = await supabase
          .from("widgets")
          .update({ position: position as any })
          .eq("id", widgetId)
          .eq("dashboard_id", dashboardId)
          .eq("dataset_id", datasetId);  // 🚨 CRITICAL: Filter by dataset_id

        if (error) {
          console.error("[UPDATE_POS] Error:", error);
          toast.error("Failed to save position");
        } else {
          console.log("[UPDATE_POS] Position saved successfully");
        }
      }, 200);
    },
    [dashboardId, datasetId]
  );

  // UPDATE TITLE: Scoped by dataset_id
  const updateWidgetTitle = useCallback(
    async (widgetId: string, title: string) => {
      console.log(`[UPDATE_TITLE] (Dataset: ${datasetId}) Widget: ${widgetId}, Title: ${title}`);

      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, title } : w))
      );

      const { error } = await supabase
        .from("widgets")
        .update({ title })
        .eq("id", widgetId)
        .eq("dashboard_id", dashboardId)
        .eq("dataset_id", datasetId);  // 🚨 CRITICAL: Filter by dataset_id

      if (error) {
        console.error("[UPDATE_TITLE] Error:", error);
        toast.error("Failed to save title");
      } else {
        console.log("[UPDATE_TITLE] Title saved successfully");
      }
    },
    [dashboardId, datasetId]
  );

  // UPDATE META: Scoped by dataset_id
  const updateWidgetMeta = useCallback(
    async (widgetId: string, payload: Record<string, any>) => {
      console.log(`[UPDATE_META] (Dataset: ${datasetId}) Widget: ${widgetId}`, payload);

      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, ...payload } : w))
      );

      const { error } = await supabase
        .from("widgets")
        .update(payload as any)
        .eq("id", widgetId)
        .eq("dashboard_id", dashboardId)
        .eq("dataset_id", datasetId);  // 🚨 CRITICAL: Filter by dataset_id

      if (error) {
        console.error("[UPDATE_META] Error:", error);
        toast.error(error.message || "Failed to save widget");
      } else {
        console.log("[UPDATE_META] Widget saved successfully");
      }
    },
    [dashboardId, datasetId]
  );

  // DELETE: Scoped by BOTH dashboard_id AND dataset_id
  const deleteWidget = useCallback(
    async (widgetId: string) => {
      if (pendingDeletions.has(widgetId)) {
        console.log("[DELETE] Deletion already in progress:", widgetId);
        return;
      }

      setPendingDeletions((prev) => new Set(prev).add(widgetId));

      console.log(
        `[DELETE] (Dataset: ${datasetId}) Deleting widget: ${widgetId}`
      );

      // Optimistic update
      setWidgets((prev) => {
        const widgetToDelete = prev.find((w) => w.id === widgetId);
        if (!widgetToDelete) {
          console.log("[DELETE] Widget not found in local state");
          setPendingDeletions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(widgetId);
            return newSet;
          });
          return prev;
        }

        const updated = prev.filter((w) => w.id !== widgetId);
        console.log(`[DELETE] Optimistic update: removed widget from local state`);
        return updated;
      });

      // Database deletion with DATASET ISOLATION - CRITICAL
      const { error } = await supabase
        .from("widgets")
        .delete()
        .eq("id", widgetId)
        .eq("dashboard_id", dashboardId)
        .eq("dataset_id", datasetId);  // 🚨 CRITICAL: Filter by dataset_id

      setPendingDeletions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });

      if (error) {
        console.error("[DELETE] Database error:", error);
        toast.error("Failed to delete widget");
        // Revert optimistic update on error
        const { data: widget } = await supabase
          .from("widgets")
          .select("*")
          .eq("id", widgetId)
          .single();
        if (widget) {
          setWidgets((prev) => [...prev, widget]);
        }
      } else {
        console.log(`[DELETE] Widget deleted successfully from database`);
        toast.success("Widget deleted");
      }
    },
    [dashboardId, datasetId, pendingDeletions]
  );

  // DEBUG: Verify database state
  const verifyDatabaseState = useCallback(async () => {
    console.log(
      `[DEBUG] Verifying database state for dataset: ${datasetId} (dashboard: ${dashboardId})`
    );

    const { data: dbWidgets, error } = await supabase
      .from("widgets")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .eq("dataset_id", datasetId);

    if (error) {
      console.error("[DEBUG] Error fetching widgets:", error);
      return;
    }

    console.log(`[DEBUG] Database: ${dbWidgets?.length} widgets`);
    console.log("[DEBUG] Widget IDs:", dbWidgets?.map((w) => ({ id: w.id, title: w.title })));

    console.log(`[DEBUG] Local state: ${widgets.length} widgets`);
    console.log("[DEBUG] Local IDs:", widgets.map((w) => ({ id: w.id, title: w.title })));

    if (dbWidgets && widgets.length !== dbWidgets.length) {
      console.warn(
        "🚨 [DEBUG] DISCREPANCY DETECTED between local state and database!"
      );
      console.warn(`Expected: ${dbWidgets.length}, Got: ${widgets.length}`);
    }
  }, [dashboardId, datasetId, widgets]);

  // Manual refresh to sync with database
  const refreshWidgets = useCallback(async () => {
    console.log(
      `[REFRESH] Manually refreshing widgets for dataset: ${datasetId}`
    );

    const { data, error } = await supabase
      .from("widgets")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .eq("dataset_id", datasetId)  // 🚨 CRITICAL: Filter by dataset_id
      .order("created_at");

    if (error) {
      console.error("[REFRESH] Error:", error);
      toast.error("Failed to refresh widgets");
    } else {
      // Validate all widgets
      const validWidgets = data?.filter(
        (w) => w.dashboard_id === dashboardId && w.dataset_id === datasetId
      ) || [];
      console.log(`[REFRESH] Loaded ${validWidgets.length}/${data?.length} valid widgets`);

      if (validWidgets.length !== data?.length) {
        console.error(
          `[REFRESH] ⚠️ SECURITY: Filtered out ${(data?.length || 0) - validWidgets.length} foreign widgets!`
        );
      }

      setWidgets(validWidgets);
      toast.success("Widgets refreshed");
    }
  }, [dashboardId, datasetId]);

  // 🚨 CRITICAL: Defensive filter - ensure returned widgets ONLY belong to current dataset
  const validatedWidgets = widgets.filter(
    (w) => w.dashboard_id === dashboardId && w.dataset_id === datasetId
  );
  if (validatedWidgets.length !== widgets.length) {
    console.error(
      `[ISOLATION] 🚨 CRITICAL: State contains ${widgets.length} widgets but only ${validatedWidgets.length} belong to dataset ${datasetId}!`
    );
    console.error(
      "[ISOLATION] Foreign widgets:",
      widgets
        .filter(
          (w) => w.dashboard_id !== dashboardId || w.dataset_id !== datasetId
        )
        .map((w) => ({
          id: w.id,
          dashboard_id: w.dashboard_id,
          dataset_id: w.dataset_id,
          type: w.type,
        }))
    );
  }

  return {
    widgets: validatedWidgets,
    loading,
    addWidget,
    applyTemplate,
    updateWidgetPosition,
    updateWidgetTitle,
    updateWidgetMeta,
    deleteWidget,
    verifyDatabaseState,
    refreshWidgets,
  };
}
