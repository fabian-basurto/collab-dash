import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LayoutTemplate, BarChart3, LineChart, PieChart, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { WidgetDataPoint } from "@/hooks/useWidgets";

interface Template {
  name: string;
  description: string;
  icon: React.ReactNode;
  widgets: { type: "bar" | "line" | "pie" | "area"; title: string; data: WidgetDataPoint[] }[];
}

const TEMPLATES: Template[] = [
  {
    name: "Sales Dashboard",
    description: "Revenue tracking with bar & line charts",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    widgets: [
      { type: "bar", title: "Monthly Revenue", data: [{ label: "Jan", value: 12000 }, { label: "Feb", value: 19000 }, { label: "Mar", value: 15000 }, { label: "Apr", value: 22000 }, { label: "May", value: 28000 }] },
      { type: "line", title: "Growth Trend", data: [{ label: "Q1", value: 45 }, { label: "Q2", value: 62 }, { label: "Q3", value: 78 }, { label: "Q4", value: 91 }] },
      { type: "pie", title: "Revenue by Region", data: [{ label: "North", value: 35 }, { label: "South", value: 25 }, { label: "East", value: 22 }, { label: "West", value: 18 }] },
    ],
  },
  {
    name: "Marketing Analytics",
    description: "Campaign performance & engagement",
    icon: <TrendingUp className="h-5 w-5 text-accent" />,
    widgets: [
      { type: "bar", title: "Campaign Clicks", data: [{ label: "Email", value: 4200 }, { label: "Social", value: 7800 }, { label: "Search", value: 6100 }, { label: "Display", value: 2900 }] },
      { type: "area", title: "Weekly Engagement", data: [{ label: "Mon", value: 120 }, { label: "Tue", value: 180 }, { label: "Wed", value: 150 }, { label: "Thu", value: 220 }, { label: "Fri", value: 290 }] },
      { type: "pie", title: "Traffic Sources", data: [{ label: "Organic", value: 42 }, { label: "Paid", value: 28 }, { label: "Referral", value: 18 }, { label: "Direct", value: 12 }] },
    ],
  },
  {
    name: "Project Overview",
    description: "Task metrics & team performance",
    icon: <PieChart className="h-5 w-5 text-chart-3" />,
    widgets: [
      { type: "pie", title: "Task Status", data: [{ label: "Done", value: 45 }, { label: "In Progress", value: 30 }, { label: "Todo", value: 15 }, { label: "Blocked", value: 10 }] },
      { type: "bar", title: "Team Output", data: [{ label: "Alice", value: 28 }, { label: "Bob", value: 22 }, { label: "Carol", value: 35 }, { label: "Dave", value: 18 }] },
      { type: "line", title: "Sprint Velocity", data: [{ label: "S1", value: 32 }, { label: "S2", value: 38 }, { label: "S3", value: 41 }, { label: "S4", value: 45 }, { label: "S5", value: 50 }] },
    ],
  },
];

interface DashboardTemplatesProps {
  onApply: (widgets: Template["widgets"]) => void;
}

export function DashboardTemplates({ onApply }: DashboardTemplatesProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-start gap-3 h-auto py-3 w-full">
          <LayoutTemplate className="h-5 w-5 text-chart-3" />
          <div className="text-left">
            <p className="text-sm font-medium">Templates</p>
            <p className="text-xs text-muted-foreground">Quick start</p>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dashboard Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => { onApply(t.widgets); setOpen(false); }}
              className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {t.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t.widgets.length} widgets · {t.widgets.map((w) => w.type).join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
