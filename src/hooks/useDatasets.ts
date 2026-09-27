import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Dataset {
  id: string;
  dashboard_id: string;
  name: string;
  data: any[];
  row_count: number;
  source: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetInput {
  name: string;
  data: any[];
  source: string;
}

export function useDatasets(dashboardId: string) {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("dashboard_datasets")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load datasets");
        return;
      }
      setDatasets((data || []) as Dataset[]);
      setLoading(false);
    };
    fetchDatasets();
  }, [dashboardId]);

  useEffect(() => {
    const channel = supabase
      .channel(`datasets:${dashboardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_datasets", filter: `dashboard_id=eq.${dashboardId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDatasets((prev) => {
              if (prev.find((d) => d.id === (payload.new as Dataset).id)) return prev;
              return [payload.new as Dataset, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setDatasets((prev) => prev.map((d) => (d.id === (payload.new as Dataset).id ? (payload.new as Dataset) : d)));
          } else if (payload.eventType === "DELETE") {
            setDatasets((prev) => prev.filter((d) => d.id !== (payload.old as Dataset).id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dashboardId]);

  const addDataset = useCallback(
    async (input: DatasetInput) => {
      const { data, error } = await supabase
        .from("dashboard_datasets")
        .insert({
          dashboard_id: dashboardId,
          name: input.name,
          data: input.data as any,
          row_count: input.data.length,
          source: input.source,
          created_by: user?.id,
        })
        .select("*")
        .single();
      if (error) {
        toast.error(error.message || "Failed to add dataset");
        return null;
      }
      toast.success("Dataset saved");
      return data as Dataset;
    },
    [dashboardId, user]
  );

  const updateDataset = useCallback(async (datasetId: string, input: DatasetInput) => {
    const { error } = await supabase
      .from("dashboard_datasets")
      .update({ name: input.name, data: input.data as any, row_count: input.data.length, source: input.source })
      .eq("id", datasetId);
    if (error) {
      toast.error(error.message || "Failed to update dataset");
    } else {
      toast.success("Dataset updated");
    }
  }, []);

  const deleteDataset = useCallback(async (datasetId: string) => {
    const { error } = await supabase.from("dashboard_datasets").delete().eq("id", datasetId);
    if (error) toast.error("Failed to delete dataset");
  }, []);

  return { datasets, loading, addDataset, updateDataset, deleteDataset };
}
