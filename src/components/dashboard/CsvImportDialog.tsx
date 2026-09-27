import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { WidgetDataPoint } from "@/hooks/useWidgets";

interface CsvImportDialogProps {
  onImport: (data: WidgetDataPoint[]) => void;
}

export function CsvImportDialog({ onImport }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("label,value\nJan,40\nFeb,65\nMar,50");

  const handleImport = () => {
    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("Need at least a header and one data row");
        return;
      }
      const data: WidgetDataPoint[] = lines.slice(1).map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return { label: parts[0] || "?", value: Number(parts[1]) || 0 };
      });
      onImport(data);
      setOpen(false);
      toast.success(`Imported ${data.length} data points`);
    } catch {
      toast.error("Failed to parse CSV");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">
              Paste CSV data (label, value) or upload a file:
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="mb-2 block w-full text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:text-primary-foreground"
            />
          </div>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            className="font-mono text-xs"
            placeholder="label,value&#10;Jan,40&#10;Feb,65"
          />
          <Button onClick={handleImport} className="w-full">
            Import Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
