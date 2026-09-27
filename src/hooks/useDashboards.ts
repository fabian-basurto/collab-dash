import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useDashboards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const dashboardsQuery = useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const { data: memberRows, error: memberError } = await supabase
        .from("dashboard_members")
        .select("dashboard_id, role")
        .eq("user_id", user!.id);
      if (memberError) throw memberError;

      if (!memberRows.length) return [];

      const ids = memberRows.map((m) => m.dashboard_id);
      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return data.map((d) => ({
        ...d,
        role: memberRows.find((m) => m.dashboard_id === d.id)?.role ?? "viewer",
      }));
    },
    enabled: !!user,
  });

  const createDashboard = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("dashboards")
        .insert({ name, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase
        .from("dashboard_members")
        .insert({ dashboard_id: data.id, user_id: user!.id, role: "owner" as const });
      if (memberError) throw memberError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteDashboard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard deleted.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { dashboardsQuery, createDashboard, deleteDashboard };
}
