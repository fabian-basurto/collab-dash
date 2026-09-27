import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboards } from "@/hooks/useDashboards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LayoutDashboard, Plus, Trash2, LogOut, Search, Clock, ArrowRight, Crown, Shield, Eye } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { JoinByCodeDialog } from "@/components/JoinByCodeDialog";
import { motion } from "framer-motion";

const ROLE_CONFIG = {
  owner: { icon: Crown, label: "Owner", className: "bg-primary/10 text-primary border border-primary/20" },
  editor: { icon: Shield, label: "Editor", className: "bg-accent/10 text-accent border border-accent/20" },
  viewer: { icon: Eye, label: "Viewer", className: "bg-muted text-muted-foreground border border-border" },
};

export default function DashboardListPage() {
  const { user, signOut } = useAuth();
  const { dashboardsQuery, createDashboard, deleteDashboard } = useDashboards();
  const [dashboardDraftName, setDashboardDraftName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleCreateDashboard = () => {
    if (!dashboardDraftName.trim()) return;
    createDashboard.mutate(dashboardDraftName.trim(), {
      onSuccess: () => { setDashboardDraftName(""); setIsCreateDialogOpen(false); },
    });
  };

  const visibleDashboards = (dashboardsQuery.data || []).filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Tri-color glassmorphism background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-[40%] left-[-8%] h-[450px] w-[450px] rounded-full bg-secondary/8 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[20%] h-[350px] w-[350px] rounded-full bg-foreground/4 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border glass-strong">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="gradient-text">CollabDash</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        {/* Actions row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your dashboards</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Open a dashboard, start a new one, or join your team.</p>
          </div>
          <div className="flex items-center gap-2">
            <JoinByCodeDialog />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" /> New dashboard
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create dashboard</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Dashboard name" value={dashboardDraftName} onChange={(e) => setDashboardDraftName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateDashboard()} className="h-11" />
                  <Button onClick={handleCreateDashboard} className="w-full h-11" disabled={createDashboard.isPending}>
                    {createDashboard.isPending ? "Creating..." : "Create dashboard"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </motion.div>

        {dashboardsQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !visibleDashboards.length ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-dashed border-2 shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                  <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="mb-1.5 text-lg font-semibold text-foreground">
                  {searchQuery ? "No dashboards match your search" : "No dashboards yet"}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  {searchQuery ? "Try a different search term" : "Create your first dashboard or join one with a share code to get started"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDashboards.map((dashboard, i) => {
              const role = ROLE_CONFIG[dashboard.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.viewer;
              const RoleIcon = role.icon;
              return (
                <motion.div
                  key={dashboard.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className="group cursor-pointer transition-all duration-200 hover:shadow-card hover:border-primary/20 hover:-translate-y-0.5"
                    onClick={() => navigate(`/dashboard/${dashboard.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                            {dashboard.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${role.className}`}>
                              <RoleIcon className="h-2.5 w-2.5" />
                              {role.label}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(dashboard.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {dashboard.role === "owner" && (
                            <>
                              <ShareDialog dashboardId={dashboard.id} />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Dashboard?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete "{dashboard.name}" and all its widgets.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteDashboard.mutate(dashboard.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-6">
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                          Open <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
