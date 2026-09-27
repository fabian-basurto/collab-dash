import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ShareDialog({ dashboardId }: { dashboardId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("invite_user_by_email", {
        _email: email.trim().toLowerCase(),
        _dashboard_id: dashboardId,
        _role: role,
      });

      if (error) {
        setResult({ error: error.message });
        toast.error(error.message);
      } else if (data && typeof data === "object" && "error" in (data as any)) {
        setResult({ error: (data as any).error });
        toast.error((data as any).error);
      } else {
        setResult({ success: true });
        toast.success(`Invited ${email} as ${role}`);
        setEmail("");
      }
    } catch (err: any) {
      setResult({ error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setResult(null); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Share Dashboard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Collaborator email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1"
            />
            <Select value={role} onValueChange={(v) => setRole(v as "editor" | "viewer")}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} className="w-full" disabled={loading}>
            {loading ? "Inviting..." : "Invite"}
          </Button>
          {result?.success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
              <Check className="h-4 w-4" />
              Invitation sent successfully!
            </div>
          )}
          {result?.error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {result.error}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Collaborators need an existing account to be invited.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
