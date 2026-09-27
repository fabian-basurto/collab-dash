import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

export function ExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const canvas = document.querySelector<HTMLElement>("[data-export-root]");
    if (!canvas) {
      toast.error("No dashboard content to export");
      return;
    }
    setExporting(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const width = canvas.scrollWidth || canvas.clientWidth;
      const height = canvas.scrollHeight || canvas.clientHeight;
      const dataUrl = await toPng(canvas as HTMLElement, {
        backgroundColor: "hsl(220, 20%, 97%)",
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: "",
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
        },
      });
      const link = document.createElement("a");
      link.download = `dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Dashboard exported as PNG");
    } catch (error) {
      console.error("Export failed", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Export failed: ${message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={exporting}>
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
    </Button>
  );
}
