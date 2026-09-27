import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWidgets } from "@/hooks/useWidgets";
import { usePresence } from "@/hooks/usePresence";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useDatasets } from "@/hooks/useDatasets";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";
import { WidgetSidebar } from "@/components/dashboard/WidgetSidebar";
import { PresenceBar } from "@/components/dashboard/PresenceBar";
import { VersionHistory } from "@/components/dashboard/VersionHistory";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { CursorOverlay } from "@/components/dashboard/CursorOverlay";
import { ShareCodeDisplay } from "@/components/dashboard/ShareCodeDisplay";
import { MembersPanel } from "@/components/dashboard/MembersPanel";
import { ShareDialog } from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Shield, Eye, LogOut, Database } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ROLE_BADGE = {
  owner: { icon: Crown, label: "Owner", className: "bg-primary/10 text-primary border border-primary/20" },
  editor: { icon: Shield, label: "Editor", className: "bg-accent/10 text-accent border border-accent/20" },
  viewer: { icon: Eye, label: "Viewer", className: "bg-muted text-muted-foreground border border-border" },
};

export default function DashboardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [dashboardName, setDashboardName] = useState("Loading...");
  const [userRole, setUserRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [activeDatasetName, setActiveDatasetName] = useState<string | null>(null);
  const [activeDatasetMissing, setActiveDatasetMissing] = useState(false);
  const {
    widgets, loading, addWidget, applyTemplate,
    updateWidgetPosition, updateWidgetTitle, updateWidgetMeta, deleteWidget, verifyDatabaseState, refreshWidgets,
  } = useWidgets(id!, activeDatasetId);
  const { onlineUsers, setEditingWidget } = usePresence(id!);
  const { snapshots, loading: snapshotsLoading, saveSnapshot, restoreSnapshot } = useSnapshots(id!);
  const { activities } = useActivityLog(id!);
  const { datasets, addDataset, updateDataset, deleteDataset } = useDatasets(id!);
  useRealtimeNotifications(id!);

  const canEdit = userRole === "owner" || userRole === "editor";
  const roleBadge = ROLE_BADGE[userRole] || ROLE_BADGE.viewer;
  const RoleIcon = roleBadge.icon;

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data, error } = await supabase
        .from("dashboards").select("name").eq("id", id!).single();
      if (error) { toast.error("Dashboard not found"); navigate("/"); return; }
      setDashboardName(data.name);
    };
    fetchDashboard();
  }, [id, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from("dashboard_members").select("role")
      .eq("dashboard_id", id).eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.role) setUserRole(data.role); });
  }, [user, id]);

  useEffect(() => {
    if (!activeDatasetId) return;
    const exists = datasets.some((d) => d.id === activeDatasetId);
    setActiveDatasetMissing(!exists);
  }, [activeDatasetId, datasets]);

  const handleAddWidget = async (type: "bar" | "line" | "pie" | "area" | "kpi") => {
    if (!activeDataset) {
      toast.error("Dataset required before adding a widget");
      return;
    }
    const { xKey, yKey } = pickDefaultKeys(activeDataset.data as any[]);
    await addWidget(type, activeDataset.id, xKey, yKey);
  };
  const handleDelete = async (widgetId: string) => {
    console.log('Dashboard handleDelete called:', {
      widgetId,
      currentWidgets: widgets.map(w => ({ id: w.id, title: w.title, type: w.type, dataset_id: w.dataset_id }))
    });
    await deleteWidget(widgetId);
  };

  const handleVerifyDatabase = async () => {
    await verifyDatabaseState();
  };

  const handleRefreshWidgets = async () => {
    await refreshWidgets();
  };
  const handleUpdateData = async () => {};
  const handleSaveSnapshot = async () => { await saveSnapshot(widgets); };
  const handleRestoreSnapshot = async (snap: any) => { await restoreSnapshot(snap); };
  const handleApplyTemplate = async (templateWidgets: { type: "bar" | "line" | "pie" | "area"; title: string }[]) => {
    if (!activeDataset) {
      toast.error("Dataset required before applying a template");
      return;
    }
    const { xKey, yKey } = pickDefaultKeys(activeDataset.data as any[]);
    await applyTemplate(templateWidgets, activeDataset.id, xKey, yKey);
  };

  const coerceNumber = (value: any) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const pickDefaultKeys = (rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) return { xKey: "label", yKey: "value" };
    const sampleRow = rows[0] as Record<string, any>;
    const keys = Object.keys(sampleRow || {});
    if (!keys.length) return { xKey: "label", yKey: "value" };

    const numericScore: Record<string, number> = {};
    const stringScore: Record<string, number> = {};
    for (const row of rows.slice(0, 50)) {
      const r = (row || {}) as Record<string, any>;
      for (const key of keys) {
        const num = coerceNumber(r[key]);
        if (num !== null) numericScore[key] = (numericScore[key] || 0) + 1;
        if (typeof r[key] === "string") stringScore[key] = (stringScore[key] || 0) + 1;
      }
    }

    const yKey = keys.includes("value")
      ? "value"
      : keys
          .slice()
          .sort((a, b) => (numericScore[b] || 0) - (numericScore[a] || 0))
          .find((k) => (numericScore[k] || 0) > 0) || keys[0];
    const xKey = keys.includes("label")
      ? "label"
      : keys
          .filter((k) => k !== yKey)
          .sort((a, b) => (stringScore[b] || 0) - (stringScore[a] || 0))[0] || keys[0];

    return { xKey, yKey };
  };

  const applyDatasetToWidgets = async (dataset: { id?: string; data: any[] }) => {
    const { xKey, yKey } = pickDefaultKeys(dataset.data);
    const seenTypes = new Set<string>();
    for (const widget of widgets) {
      if (["bar", "line", "area", "pie", "kpi"].includes(widget.type)) {
        if (seenTypes.has(widget.type)) continue;
        seenTypes.add(widget.type);
        await updateWidgetMeta(widget.id, {
          dataset_id: dataset.id || null,
          x_key: xKey,
          y_key: yKey,
        });
      }
    }
  };

  const handleCreateDataset = async (input: { name: string; data: any[]; source: string }) => {
    const created = await addDataset(input);
    if (created) {
      await applyDatasetToWidgets({ id: created.id, data: created.data as any[] });
      setActiveDatasetId(created.id);
      setActiveDatasetName(created.name);
      setActiveDatasetMissing(false);
    }
  };

  const handleUpdateDataset = async (datasetId: string, input: { name: string; data: any[]; source: string }) => {
    await updateDataset(datasetId, input);
    if (activeDatasetId === datasetId) setActiveDatasetName(input.name);
  };

  const handleDeleteDataset = async (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    await deleteDataset(datasetId);
    if (activeDatasetId === datasetId) {
      setActiveDatasetMissing(true);
      setActiveDatasetName(dataset?.name || activeDatasetName);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log out";
      toast.error(message);
    }
  };

  const handleApplyDataset = async (dataset: { id?: string; name: string; data: any[]; source: string }) => {
    await applyDatasetToWidgets({ id: dataset.id, data: dataset.data });
    if (dataset.id) setActiveDatasetId(dataset.id);
    setActiveDatasetName(dataset.name);
    setActiveDatasetMissing(false);
    toast.success(`Applied dataset: ${dataset.name}`);
  };

  const handleUpdateMapping = async (widgetId: string, datasetId: string | null, xKey: string, yKey: string) => {
    const dataset = datasetId ? datasets.find((d) => d.id === datasetId) : null;
    if (!dataset) return;
    await updateWidgetMeta(widgetId, { dataset_id: datasetId, x_key: xKey, y_key: yKey });
    toast.success("Chart mapping updated");
  };

  const handleReconnectDataset = async (widgetId: string, datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    if (!dataset) return;
    const { xKey, yKey } = pickDefaultKeys(dataset.data as any[]);
    await updateWidgetMeta(widgetId, { dataset_id: datasetId, x_key: xKey, y_key: yKey });
    toast.success("Dataset reconnected");
  };

  const datasetsById = useMemo(() => {
    return new Map(datasets.map((d) => [d.id, d]));
  }, [datasets]);

  const activeDataset = useMemo(() => {
    if (activeDatasetMissing) return null;
    if (activeDatasetId) return datasetsById.get(activeDatasetId) || null;
    if (activeDatasetName) return datasets.find((d) => d.name === activeDatasetName) || null;
    return null;
  }, [activeDatasetId, activeDatasetName, activeDatasetMissing, datasets, datasetsById]);

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden relative">
      {/* Tri-color glassmorphism background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[10%] h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] h-[350px] w-[350px] rounded-full bg-secondary/6 blur-[100px]" />
        <div className="absolute top-[50%] left-[50%] h-[300px] w-[300px] rounded-full bg-foreground/3 blur-[100px]" />
      </div>
      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between border-b border-border glass-strong px-4 py-2.5 z-20"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-base font-semibold text-foreground truncate max-w-[200px]">{dashboardName}</h1>
          {activeDatasetName && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
              Data: {activeDatasetName}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${roleBadge.className}`}>
            <RoleIcon className="h-2.5 w-2.5" />
            {roleBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MembersPanel dashboardId={id!} userRole={userRole} />
          {userRole === "owner" && (
            <>
              <ShareDialog dashboardId={id!} />
              <ShareCodeDisplay dashboardId={id!} />
            </>
          )}
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <ExportButton />
          <ActivityPanel activities={activities} />
          <VersionHistory
            snapshots={snapshots} loading={snapshotsLoading}
            onSave={canEdit ? handleSaveSnapshot : undefined}
            onRestore={canEdit ? handleRestoreSnapshot : undefined}
          />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleVerifyDatabase} className="text-muted-foreground hover:text-blue-600" title="Verify Database State">
            <Database className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefreshWidgets} className="text-muted-foreground hover:text-green-600" title="Refresh Widgets">
            <ArrowLeft className="h-4 w-4 rotate-270" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <PresenceBar users={onlineUsers} />
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {canEdit && (
          <WidgetSidebar
            onAddWidget={handleAddWidget}
            onApplyTemplate={handleApplyTemplate}
            datasets={datasets}
            canEdit={canEdit}
            onCreateDataset={handleCreateDataset}
            onUpdateDataset={handleUpdateDataset}
            onDeleteDataset={handleDeleteDataset}
            onApplyDataset={handleApplyDataset}
            activeDatasetId={activeDatasetId}
            activeDatasetName={activeDatasetName}
          />
        )}
        <DashboardCanvas
          widgets={widgets} loading={loading}
          onUpdatePosition={canEdit ? updateWidgetPosition : () => {}}
          onUpdateTitle={canEdit ? updateWidgetTitle : () => {}}
          onDelete={canEdit ? handleDelete : () => {}}
          onlineUsers={onlineUsers}
          onEditStart={canEdit ? (widgetId) => setEditingWidget(widgetId) : undefined}
          onEditEnd={canEdit ? () => setEditingWidget(null) : undefined}
          readOnly={!canEdit}
          datasets={datasets}
          datasetsById={datasetsById}
          datasetMissing={activeDatasetMissing}
          onUpdateMapping={canEdit ? handleUpdateMapping : undefined}
          onReconnectDataset={canEdit ? handleReconnectDataset : undefined}
        />
        <CursorOverlay dashboardId={id!} />
      </div>
    </div>
  );
}
