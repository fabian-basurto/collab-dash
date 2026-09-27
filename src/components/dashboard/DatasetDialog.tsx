import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface DatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { name: string; data: any[] } | null;
  onSave: (payload: { name: string; data: any[]; source: string }) => void | Promise<void>;
  readOnly?: boolean;
}

const parseCsvText = (text: string) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Need a header and at least one data row");
  const headers = lines[0].split(",").map((s) => s.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const key = h || `col_${idx + 1}`;
      row[key] = (values[idx] || "").trim();
    });
    return row;
  });
};

const parseJsonText = (text: string) => {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.data)) return parsed.data;
  throw new Error("JSON must be an array of objects or contain a data array");
};

export function DatasetDialog({ open, onOpenChange, initial, onSave, readOnly = false }: DatasetDialogProps) {
  const [name, setName] = useState("");
  const [textValue, setTextValue] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setTextValue(initial ? JSON.stringify(initial.data, null, 2) : "");
    setFile(null);
  }, [open, initial]);

  const fileLabel = useMemo(() => (file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "No file selected"), [file]);

  const readFileAsText = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(f);
    });

  const readFileAsArrayBuffer = (f: File) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(f);
    });

  const parseFromFile = async (f: File) => {
    const nameLower = f.name.toLowerCase();
    if (nameLower.endsWith(".json")) {
      const text = await readFileAsText(f);
      return { rows: parseJsonText(text), source: "json" };
    }
    if (nameLower.endsWith(".csv") || nameLower.endsWith(".txt")) {
      const text = await readFileAsText(f);
      return { rows: parseCsvText(text), source: "csv" };
    }
    if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")) {
      const buffer = await readFileAsArrayBuffer(f);
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return { rows, source: "excel" };
    }
    throw new Error("Unsupported file type");
  };

  const parseFromText = () => {
    const trimmed = textValue.trim();
    if (!trimmed) throw new Error("Paste CSV or JSON, or upload a file");
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return { rows: parseJsonText(trimmed), source: "json" };
    }
    return { rows: parseCsvText(trimmed), source: "csv" };
  };

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        toast.error("Dataset name is required");
        return;
      }
      const parsed = file ? await parseFromFile(file) : parseFromText();
      if (!parsed.rows.length) {
        toast.error("No rows found in dataset");
        return;
      }
      await onSave({ name: name.trim(), data: parsed.rows, source: parsed.source });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse dataset";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{readOnly ? "Dataset Preview" : initial ? "Edit Dataset" : "Add Dataset"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Dataset name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales Q1" disabled={readOnly} />
          </div>
          {!readOnly && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Upload file (CSV, JSON, Excel)</label>
              <input
                type="file"
                accept=".csv,.txt,.json,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:text-primary-foreground"
              />
              <p className="text-[11px] text-muted-foreground">{fileLabel}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{readOnly ? "Preview" : "Or paste CSV or JSON"}</label>
            <Textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="label,value\nJan,40\nFeb,65"
              readOnly={readOnly}
            />
          </div>
          {!readOnly && (
            <Button onClick={handleSave} className="w-full">
              {initial ? "Save Changes" : "Save Dataset"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
