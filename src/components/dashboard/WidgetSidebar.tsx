import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart, PieChart, TrendingUp, Hash, Plus, Pencil, Trash2, Database, Search } from "lucide-react";
import { DashboardTemplates } from "./DashboardTemplates";
import type { WidgetDataPoint } from "@/hooks/useWidgets";
import type { Dataset, DatasetInput } from "@/hooks/useDatasets";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { DatasetDialog } from "./DatasetDialog";
import { rankDatasets, collectDatasetSuggestions } from "@/lib/dataset-search";

interface WidgetSidebarProps {
  onAddWidget: (type: "bar" | "line" | "pie" | "area" | "kpi") => void;
  onApplyTemplate?: (widgets: { type: "bar" | "line" | "pie" | "area"; title: string; data: WidgetDataPoint[] }[]) => void;
  datasets?: Dataset[];
  canEdit?: boolean;
  onCreateDataset?: (input: DatasetInput) => void | Promise<void>;
  onUpdateDataset?: (datasetId: string, input: DatasetInput) => void | Promise<void>;
  onDeleteDataset?: (datasetId: string) => void | Promise<void>;
  onApplyDataset?: (dataset: Dataset) => void | Promise<void>;
  activeDatasetId?: string | null;
  activeDatasetName?: string | null;
}

const WIDGETS = [
  { type: "kpi" as const, icon: Hash, label: "KPI Metric", desc: "Single number + trend", color: "text-destructive" },
  { type: "bar" as const, icon: BarChart3, label: "Bar Chart", desc: "Compare categories", color: "text-primary" },
  { type: "line" as const, icon: LineChart, label: "Line Chart", desc: "Track trends", color: "text-accent" },
  { type: "pie" as const, icon: PieChart, label: "Pie Chart", desc: "Show proportions", color: "text-[hsl(var(--chart-3))]" },
  { type: "area" as const, icon: TrendingUp, label: "Area Chart", desc: "Visualize volume", color: "text-[hsl(var(--chart-4))]" },
];

export function WidgetSidebar({
  onAddWidget,
  onApplyTemplate,
  datasets,
  canEdit = false,
  onCreateDataset,
  onUpdateDataset,
  onDeleteDataset,
  onApplyDataset,
  activeDatasetId,
  activeDatasetName,
}: WidgetSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDataset(null);
      setPreviewDataset(null);
    }
  };

  const openCreate = () => {
    setEditingDataset(null);
    setPreviewDataset(null);
    setDialogOpen(true);
  };

  const openEdit = (dataset: Dataset) => {
    setEditingDataset(dataset);
    setPreviewDataset(null);
    setDialogOpen(true);
  };

  const openPreview = (dataset: Dataset) => {
    setEditingDataset(null);
    setPreviewDataset(dataset);
    setDialogOpen(true);
  };

  const handleSaveDataset = async (input: DatasetInput) => {
    if (editingDataset) {
      await onUpdateDataset?.(editingDataset.id, input);
    } else {
      await onCreateDataset?.(input);
    }
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  // Enhanced search with scoring and matching
  const searchResults = useMemo(() => {
    return rankDatasets(datasets, searchQuery);
  }, [datasets, searchQuery]);

  // Get search suggestions
  const searchSuggestions = useMemo(() => {
    return collectDatasetSuggestions(datasets);
  }, [datasets]);

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSearchIndex >= 0 && searchResults[selectedSearchIndex]) {
        const dataset = searchResults[selectedSearchIndex].dataset;
        if (canEdit) {
          onApplyDataset?.(dataset);
        } else {
          openPreview(dataset);
        }
      }
    } else if (e.key === 'Escape') {
      setSearchQuery("");
      setSelectedSearchIndex(-1);
    }
  };

  return (
    <aside className="flex w-56 flex-col gap-1.5 border-r border-border bg-card/50 p-4 overflow-y-auto">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Add Widget
      </h3>
      {WIDGETS.map((w, i) => (
        <motion.div
          key={w.type}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-2.5 px-3 hover:bg-muted/80 transition-all group"
            onClick={() => onAddWidget(w.type)}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:scale-105 transition-transform ${w.color}`}>
              <w.icon className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{w.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{w.desc}</p>
            </div>
          </Button>
        </motion.div>
      ))}

      {onApplyTemplate && (
        <>
          <Separator className="my-3" />
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Quick Start
          </h3>
          <DashboardTemplates onApply={onApplyTemplate} />
        </>
      )}

      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Data Sets
        </h3>
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search datasets (name, content, type...)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedSearchIndex(-1);
          }}
          onKeyDown={handleSearchKeyDown}
          className="pl-8 h-8 text-xs"
          list="dataset-suggestions"
        />
        <datalist id="dataset-suggestions">
          {searchSuggestions.slice(0, 5).map((suggestion, index) => (
            <option key={index} value={suggestion} />
          ))}
        </datalist>
        {searchQuery && (
          <div className="absolute -bottom-6 left-0 text-[10px] text-muted-foreground">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {searchResults && searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map(({ dataset: d, score, matchedFields }, index) => (
            (() => {
              const isActive = (activeDatasetId && d.id === activeDatasetId) || (!activeDatasetId && activeDatasetName === d.name);
              return (
            <button
              key={d.id}
              type="button"
              onClick={() => (canEdit ? onApplyDataset?.(d) : openPreview(d))}
              onMouseEnter={() => setSelectedSearchIndex(index)}
              className={`w-full rounded-lg border p-2 text-left transition-colors hover:bg-muted/50 ${
                isActive 
                  ? "border-primary/40 bg-primary/10" 
                  : selectedSearchIndex === index 
                    ? "border-primary/20 bg-muted/60" 
                    : "border-border/60 bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {d.name}
                    {searchQuery && score > 50 && (
                      <span className="ml-1 text-[10px] text-primary font-medium">
                        ({Math.round(score / 10)}% match)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.row_count} rows · {d.source} · {formatDate(d.created_at)}
                  </p>
                  {searchQuery && matchedFields.length > 0 && (
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                      Matched: {matchedFields.join(', ')}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(d);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDataset?.(d.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </button>
              );
            })()
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
          {searchQuery.trim() ? 'No datasets match your search' : 'No datasets yet'}
        </div>
      )}

      <DatasetDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        initial={
          editingDataset
            ? { name: editingDataset.name, data: editingDataset.data as any[] }
            : previewDataset
              ? { name: previewDataset.name, data: previewDataset.data as any[] }
              : null
        }
        onSave={handleSaveDataset}
        readOnly={!canEdit && !!previewDataset}
      />
    </aside>
  );
}
