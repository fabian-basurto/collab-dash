import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Hash, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function JoinByCodeDialog() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("join_dashboard_by_code", {
        _code: trimmed,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const result = data as { dashboard_id?: string; error?: string; message?: string };
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message || "Joined!");
      setOpen(false);
      setCode("");
      navigate(`/dashboard/${result.dashboard_id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Hash className="mr-2 h-4 w-4" /> Join by Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Dashboard by Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Enter dashboard code (e.g. a1b2c3d4)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="font-mono tracking-wider text-center text-lg"
          />
          <Button onClick={handleJoin} className="w-full" disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Joining..." : "Join Dashboard"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Ask the dashboard owner for their share code
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
