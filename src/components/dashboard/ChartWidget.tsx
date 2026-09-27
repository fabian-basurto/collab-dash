import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { Widget } from "@/hooks/useWidgets";
import type { PresenceUser } from "@/hooks/usePresence";
import type { Dataset } from "@/hooks/useDatasets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GripVertical, Trash2, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChartWidgetProps {
  widget: Widget;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onEditStart?: (widgetId: string) => void;
  onEditEnd?: () => void;
  editingBy?: PresenceUser | null;
  readOnly?: boolean;
  dataset?: Dataset | null;
  availableDatasets?: Dataset[];
  onReconnectDataset?: (widgetId: string, datasetId: string) => void;
  onUpdateMapping?: (widgetId: string, datasetId: string | null, xKey: string, yKey: string) => void;
}

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(230, 60%, 70%)",
  "hsl(262, 50%, 70%)", "hsl(152, 40%, 60%)",
];

export function ChartWidget({
  widget, onUpdateTitle, onDelete,
  onEditStart, onEditEnd, editingBy, readOnly,
  dataset, availableDatasets = [], onReconnectDataset, onUpdateMapping,
}: ChartWidgetProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(widget.title);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(availableDatasets[0]?.id || "");

  const datasetRows = (dataset?.data as any[]) || [];
  const datasetColumns = useMemo(() => Object.keys(datasetRows[0] || {}), [dataset?.id, datasetRows.length]);
  const widgetMeta = widget as any;
  const [xKey, setXKey] = useState(widgetMeta.x_key || "");
  const [yKey, setYKey] = useState(widgetMeta.y_key || "");
  const datasetMissing = !dataset;
  const isDisabled = readOnly || datasetMissing;

  const handleSaveTitle = () => { onUpdateTitle(widget.id, titleValue); setEditingTitle(false); };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    fontSize: 12,
    boxShadow: "var(--shadow-card)",
  };

  const tooltipLabel = xKey || "Label";
  const tooltipValue = yKey || "Value";

  const buildDataPoints = (rows: any[], x: string, y: string) => {
    return rows.slice(0, 100).map((row, index) => {
      const r = (row || {}) as Record<string, any>;
      const label = String(r[x] ?? `Item ${index + 1}`);
      const raw = r[y];
      const value = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "")) || 0;
      return { label, value };
    });
  };

  const mappedData = useMemo(() => {
    if (!datasetRows.length || !xKey || !yKey) return [] as { label: string; value: number }[];
    return buildDataPoints(datasetRows, xKey, yKey);
  }, [datasetRows, xKey, yKey]);

  useEffect(() => {
    if (!datasetColumns.length) return;
    const nextX = widgetMeta.x_key || datasetColumns[0];
    const nextY = widgetMeta.y_key || datasetColumns.find((c) => c !== nextX) || datasetColumns[0];
    setXKey(nextX);
    setYKey(nextY);
  }, [dataset?.id, datasetColumns.length]);

  useEffect(() => {
    if (!selectedDatasetId && availableDatasets.length) {
      setSelectedDatasetId(availableDatasets[0].id);
    }
  }, [availableDatasets, selectedDatasetId]);

  const handleMappingChange = (nextX: string, nextY: string) => {
    setXKey(nextX);
    setYKey(nextY);
    if (!dataset?.id) return;
    if (readOnly) return;
    onUpdateMapping?.(widget.id, dataset.id, nextX, nextY);
  };

  const renderChart = () => {
    switch (widget.type) {
      case "pie":
        return (
          <PieChart>
            <Pie data={mappedData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="70%" animationDuration={400} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {mappedData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `${tooltipLabel}: ${label}`}
              formatter={(value) => [value, tooltipValue]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        );
      case "area":
        return (
          <AreaChart data={mappedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `${tooltipLabel}: ${label}`}
              formatter={(value) => [value, tooltipValue]}
            />
            <defs>
              <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill={`url(#grad-${widget.id})`} strokeWidth={2} animationDuration={400} />
          </AreaChart>
        );
      case "line":
        return (
          <LineChart data={mappedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `${tooltipLabel}: ${label}`}
              formatter={(value) => [value, tooltipValue]}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ fill: "hsl(var(--accent))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} animationDuration={400} />
          </LineChart>
        );
      default:
        return (
          <BarChart data={mappedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `${tooltipLabel}: ${label}`}
              formatter={(value) => [value, tooltipValue]}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} animationDuration={400} />
          </BarChart>
        );
    }
  };

  return (
    <Card className={`h-full flex flex-col overflow-hidden shadow-card transition-all duration-200 hover:shadow-elevated ${editingBy ? "ring-2 ring-accent/40" : "border-border/60"}`}>
      <CardHeader className="flex flex-row items-center gap-2 py-2 px-3 space-y-0 border-b border-border/40">
        {!readOnly && (
          <div className="drag-handle cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        {editingTitle && !isDisabled ? (
          <div className="flex items-center gap-1 flex-1">
            <Input value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="h-7 text-sm" onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveTitle}><Check className="h-3 w-3" /></Button>
          </div>
        ) : (
          <span className={`flex-1 text-sm font-semibold truncate ${!isDisabled ? "cursor-pointer hover:text-primary transition-colors" : ""}`} onDoubleClick={!isDisabled ? () => setEditingTitle(true) : undefined}>
            {widget.title}
            <span className="ml-1.5 text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{widget.type}</span>
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <AnimatePresence>
            {editingBy && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-[10px] text-accent font-medium mr-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {editingBy.displayName} editing…
              </motion.span>
            )}
          </AnimatePresence>
          {!readOnly && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
              onClick={() => {
                console.log('ChartWidget delete button clicked:', {
                  widgetId: widget.id,
                  widgetTitle: widget.title,
                  widgetType: widget.type,
                  datasetId: widget.dataset_id
                });
                onDelete(widget.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 min-h-0">
        <div className="flex h-full flex-col gap-3">
          <div className="flex-1 min-h-0">
            {datasetMissing ? (
              <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
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
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          console.log('ChartWidget reconnect/delete button clicked:', {
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
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            )}
          </div>

          {!datasetMissing && datasetColumns.length > 0 && (
            <div className="shrink-0 space-y-2 text-[11px] text-muted-foreground">
              <div className="truncate">Columns: {datasetColumns.join(", ")}</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block mb-1">X-axis</label>
                  <select
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                    value={xKey}
                    onChange={(e) => handleMappingChange(e.target.value, yKey)}
                    disabled={isDisabled}
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
                    onChange={(e) => handleMappingChange(xKey, e.target.value)}
                    disabled={isDisabled}
                  >
                    {datasetColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
