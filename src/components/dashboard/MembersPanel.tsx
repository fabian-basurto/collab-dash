import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Trash2, Crown, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  email: string | null;
  display_name: string | null;
}

export function MembersPanel({ dashboardId, userRole }: { dashboardId: string; userRole: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data: memberRows, error } = await supabase
      .from("dashboard_members")
      .select("id, user_id, role")
      .eq("dashboard_id", dashboardId);

    if (error || !memberRows) {
      setLoading(false);
      return;
    }

    const userIds = memberRows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    const merged: Member[] = memberRows.map((m) => {
      const p = profiles?.find((pr) => pr.id === m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role as Member["role"],
        email: p?.email || null,
        display_name: p?.display_name || null,
      };
    });

    // Sort: owner first, then editors, then viewers
    merged.sort((a, b) => {
      const order = { owner: 0, editor: 1, viewer: 2 };
      return order[a.role] - order[b.role];
    });

    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, dashboardId]);

  const handleRoleChange = async (memberId: string, memberUserId: string, newRole: "editor" | "viewer") => {
    if (memberUserId === user?.id) {
      toast.error("You can't change your own role");
      return;
    }

    const { error } = await supabase
      .from("dashboard_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Role updated");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    }
  };

  const handleRemove = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error("You can't remove yourself");
      return;
    }

    const { error } = await supabase
      .from("dashboard_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-3.5 w-3.5 text-amber-500" />;
    if (role === "editor") return <Shield className="h-3.5 w-3.5 text-primary" />;
    return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const isOwner = userRole === "owner";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dashboard Members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {roleIcon(member.role)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.display_name || member.email || "Unknown"}
                      {member.user_id === user?.id && (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    {member.display_name && member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {member.role === "owner" ? (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      Owner
                    </span>
                  ) : isOwner ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.id, member.user_id, v as "editor" | "viewer")
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(member.id, member.user_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      member.role === "editor"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {member.role === "editor" ? "Editor" : "Viewer"}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {!isOwner && (
          <p className="text-xs text-muted-foreground text-center">
            Only the owner can manage roles.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
