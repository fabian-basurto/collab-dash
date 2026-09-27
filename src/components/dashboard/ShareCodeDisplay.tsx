import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function ShareCodeDisplay({ dashboardId }: { dashboardId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (supabase.from("dashboards").select("share_code") as any)
      .eq("id", dashboardId)
      .single()
      .then(({ data }: any) => {
        if (data?.share_code) setCode(data.share_code);
      });
  }, [dashboardId]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
  };

  if (!code) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
      <span className="text-xs text-muted-foreground">Code:</span>
      <span className="font-mono text-sm font-semibold tracking-wider text-foreground">{code}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
