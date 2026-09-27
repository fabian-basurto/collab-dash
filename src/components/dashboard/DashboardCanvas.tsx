import { useMemo, useRef, useState, useEffect } from "react";
import { Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { Widget, WidgetPosition } from "@/hooks/useWidgets";
import type { PresenceUser } from "@/hooks/usePresence";
import type { Dataset } from "@/hooks/useDatasets";
import { ChartWidget } from "./ChartWidget";
import { KpiWidget } from "./KpiWidget";
import { motion } from "framer-motion";
import { LayoutDashboard, Plus } from "lucide-react";

interface DashboardCanvasProps {
  widgets: Widget[];
  loading: boolean;
  onUpdatePosition: (id: string, pos: WidgetPosition) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onlineUsers: PresenceUser[];
  onEditStart?: (widgetId: string) => void;
  onEditEnd?: () => void;
  readOnly?: boolean;
  datasets?: Dataset[];
  datasetsById?: Map<string, Dataset>;
  onUpdateMapping?: (widgetId: string, datasetId: string | null, xKey: string, yKey: string) => void;
  onReconnectDataset?: (widgetId: string, datasetId: string) => void;
}

export function DashboardCanvas({
  widgets, loading, onUpdatePosition, onUpdateTitle,
  onDelete, onlineUsers, onEditStart, onEditEnd, readOnly = false,
  datasets, datasetsById, onUpdateMapping, onReconnectDataset,
}: DashboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => {
      // ✅ CRITICAL: Filter out any widgets not belonging to this dataset
      const validWidgets = widgets.filter(w => w.dashboard_id && w.dataset_id);
      if (validWidgets.length !== widgets.length) {
        console.error(
          `[CANVAS] ⚠️ Filtered out ${widgets.length - validWidgets.length} invalid widgets`
        );
      }
      return validWidgets.map((w) => {
        const pos = w.position as unknown as WidgetPosition;
        return { i: w.id, x: pos.x ?? 0, y: pos.y ?? 0, w: pos.w ?? 6, h: pos.h ?? 4, minW: 3, minH: 3 };
      });
    },
    [widgets]
  );

  const handleLayoutChange = (newLayout: any[]) => {
    for (const item of newLayout) {
      const widget = widgets.find((w) => w.id === item.i);
      if (!widget) continue;
      const pos = widget.position as unknown as WidgetPosition;
      if (pos.x !== item.x || pos.y !== item.y || pos.w !== item.w || pos.h !== item.h) {
        onUpdatePosition(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    }
  };

  const getEditingUser = (widgetId: string): PresenceUser | null => {
    return onlineUsers.find((u) => u.editingWidgetId === widgetId) || null;
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!widgets.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground" data-cursor-area>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="mx-auto mb-5 h-20 w-20 rounded-3xl bg-muted/60 flex items-center justify-center">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-1.5">Empty canvas</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add a widget from the sidebar or use a template to get started
          </p>
          {!readOnly && (
            <div className="mt-4 flex items-center justify-center gap-1 text-xs text-primary font-medium">
              <Plus className="h-3.5 w-3.5" />
              Choose a widget type from the left panel
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4 relative" data-cursor-area data-export-root>
      <Responsive
        className="layout"
        width={containerWidth}
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        onLayoutChange={readOnly ? undefined : handleLayoutChange}
        // @ts-ignore compactType exists at runtime
        compactType="vertical"
        draggableHandle={readOnly ? ".no-drag" : ".drag-handle"}
        isDraggable={!readOnly}
        isResizable={!readOnly}
      >
        {widgets.filter(w => w.dashboard_id && w.dataset_id).map((widget) => (
          <div key={widget.id}>
            {widget.type === "kpi" ? (
              (() => {
                const widgetDatasetId = (widget as any).dataset_id as string | undefined;
                const widgetDataset = widgetDatasetId ? datasetsById?.get(widgetDatasetId) : null;
                const resolvedDataset = widgetDatasetId ? widgetDataset : null;
                return (
              <KpiWidget
                widget={widget}
                onDelete={readOnly ? undefined : onDelete}
                editingBy={getEditingUser(widget.id)}
                readOnly={readOnly}
                dataset={resolvedDataset}
                availableDatasets={datasets || []}
                onReconnectDataset={onReconnectDataset}
                onUpdateMapping={onUpdateMapping}
              />
                );
              })()
            ) : (
              (() => {
                const widgetDatasetId = (widget as any).dataset_id as string | undefined;
                const widgetDataset = widgetDatasetId ? datasetsById?.get(widgetDatasetId) : null;
                const resolvedDataset = widgetDatasetId ? widgetDataset : null;
                return (
              <ChartWidget
                widget={widget} onUpdateTitle={onUpdateTitle}
                onDelete={onDelete} onEditStart={onEditStart} onEditEnd={onEditEnd}
                editingBy={getEditingUser(widget.id)} readOnly={readOnly}
                dataset={resolvedDataset}
                availableDatasets={datasets || []}
                onReconnectDataset={onReconnectDataset}
                onUpdateMapping={onUpdateMapping}
              />
                );
              })()
            )}
          </div>
        ))}
      </Responsive>
    </div>
  );
}
