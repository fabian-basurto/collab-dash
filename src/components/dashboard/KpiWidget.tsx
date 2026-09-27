import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { Widget } from "@/hooks/useWidgets";
import type { Dataset } from "@/hooks/useDatasets";
import type { PresenceUser } from "@/hooks/usePresence";

interface KpiWidgetProps {
  widget: Widget;
  onDelete?: (id: string) => void;
  editingBy?: PresenceUser | null;
  readOnly?: boolean;
  dataset?: Dataset | null;
  availableDatasets?: Dataset[];
  onReconnectDataset?: (widgetId: string, datasetId: string) => void;
  onUpdateMapping?: (widgetId: string, datasetId: string | null, xKey: string, yKey: string) => void;
}

export function KpiWidget({ widget, onDelete, editingBy, readOnly, dataset, availableDatasets = [], onReconnectDataset, onUpdateMapping }: KpiWidgetProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(availableDatasets[0]?.id || "");
  const datasetRows = (dataset?.data as any[]) || [];
  const datasetColumns = useMemo(() => Object.keys(datasetRows[0] || {}), [dataset?.id, datasetRows.length]);
  const widgetMeta = widget as any;
  const [xKey, setXKey] = useState(widgetMeta.x_key || "");
  const [yKey, setYKey] = useState(widgetMeta.y_key || "");
  const datasetMissing = !dataset;

  const buildDataPoints = (rows: any[], x: string, y: string) => {
    return rows.slice(0, 100).map((row, index) => {
      const r = (row || {}) as Record<string, any>;
      const label = String(r[x] ?? `Item ${index + 1}`);
      const raw = r[y];
      const value = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "")) || 0;
      return { label, value };
    });
  };

  useEffect(() => {
    if (!datasetColumns.length) return;
    const nextX = widgetMeta.x_key || datasetColumns[0];
    const nextY = widgetMeta.y_key || datasetColumns.find((c) => c !== nextX) || datasetColumns[0];
    setXKey(nextX);
    setYKey(nextY);
  }, [dataset?.id, datasetColumns.length]);

  const mappedData = datasetRows.length && xKey && yKey
    ? buildDataPoints(datasetRows, xKey, yKey)
    : [];
  const current = mappedData.length > 0 ? mappedData[mappedData.length - 1].value : 0;
  const previous = mappedData.length > 1 ? mappedData[mappedData.length - 2].value : current;
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const trend = change > 0 ? "up" : change < 0 ? "down" : "flat";

  return (
    <Card className={`h-full flex flex-col overflow-hidden shadow-card transition-all duration-200 hover:shadow-elevated ${editingBy ? "ring-2 ring-accent/40" : "border-border/60"}`}>
      <CardHeader className="flex flex-row items-center gap-2 py-2 px-3 space-y-0 border-b border-border/40">
        {!readOnly && (
          <div className="drag-handle cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <span className="flex-1 text-sm font-semibold truncate text-foreground">
          {widget.title}
          <span className="ml-1.5 text-[9px] text-muted-foreground font-medium uppercase tracking-wider">KPI</span>
        </span>
        {!readOnly && onDelete && (
          <button
            onClick={() => onDelete(widget.id)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
        {datasetMissing ? (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="mt-2 text-sm font-semibold text-foreground">Dataset deleted or missing</p>
            <p className="mt-1">This widget is inactive until a dataset is connected.</p>
            <div className="mt-3 flex flex-col gap-2 w-full max-w-xs">
              <select
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                disabled={availableDatasets.length === 0}
              >
                {availableDatasets.length === 0 ? (
                  <option value="">No datasets available</option>
                ) : (
                  availableDatasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))
                )}
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!selectedDatasetId || !onReconnectDataset}
                  onClick={() => selectedDatasetId && onReconnectDataset?.(widget.id, selectedDatasetId)}
                >
                  Reconnect Dataset
                </Button>
                {!readOnly && onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      console.log('KpiWidget delete button clicked:', {
                        widgetId: widget.id,
                        widgetTitle: widget.title,
                        widgetType: widget.type,
                        datasetId: widget.dataset_id
                      });
                      onDelete(widget.id);
                    }}
                  >
                    Delete Widget
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <p className="text-5xl font-extrabold text-foreground tracking-tight leading-none">
              {current.toLocaleString()}
            </p>
            <div className={`flex items-center justify-center gap-1.5 mt-3 text-sm font-semibold ${
              trend === "up" ? "text-[hsl(var(--success))]" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              <div className={`flex items-center justify-center h-5 w-5 rounded-full ${
                trend === "up" ? "bg-[hsl(var(--success)/0.1)]" : trend === "down" ? "bg-destructive/10" : "bg-muted"
              }`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </div>
              <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
              <span className="text-muted-foreground font-normal text-xs">vs previous</span>
            </div>
            {mappedData.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 font-medium">{mappedData[mappedData.length - 1].label}</p>
            )}
          </motion.div>
        )}
      </CardContent>
      {!datasetMissing && datasetColumns.length > 0 && (
        <div className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="truncate mb-2">Columns: {datasetColumns.join(", ")}</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1">X-axis</label>
              <select
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={xKey}
                onChange={(e) => {
                  const nextX = e.target.value;
                  setXKey(nextX);
                  if (dataset?.id && !readOnly) onUpdateMapping?.(widget.id, dataset.id, nextX, yKey);
                }}
                disabled={readOnly}
              >
                {datasetColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1">Y-axis</label>
              <select
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={yKey}
                onChange={(e) => {
                  const nextY = e.target.value;
                  setYKey(nextY);
                  if (dataset?.id && !readOnly) onUpdateMapping?.(widget.id, dataset.id, xKey, nextY);
                }}
                disabled={readOnly}
              >
                {datasetColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
