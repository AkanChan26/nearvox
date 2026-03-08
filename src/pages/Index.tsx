import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FileText, ShoppingBag,
  AlertTriangle, Megaphone, BarChart3, Settings, LogOut, ChevronRight,
} from "lucide-react";

const adminSections = [
  {
    title: "SYSTEM DASHBOARD",
    description: "Real-time platform monitoring & system stats",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
    cmd: "01",
  },
  {
    title: "USER REGISTRY",
    description: "Manage and monitor user accounts",
    url: "/users",
    icon: Users,
    cmd: "02",
  },
  {
    title: "POSTS",
    description: "Content moderation & post management",
    url: "/posts",
    icon: FileText,
    cmd: "03",
  },
  {
    title: "MARKETPLACE",
    description: "Listing verification & marketplace oversight",
    url: "/marketplace",
    icon: ShoppingBag,
    cmd: "04",
  },
  {
    title: "REPORTS",
    description: "User reports, flagged content & investigations",
    url: "/reports",
    icon: AlertTriangle,
    cmd: "05",
  },
  {
    title: "ANNOUNCEMENTS",
    description: "System announcements & broadcast messages",
    url: "/announcements",
    icon: Megaphone,
    cmd: "06",
  },
  {
    title: "ANALYTICS",
    description: "Platform metrics & data analysis",
    url: "/analytics",
    icon: BarChart3,
    cmd: "07",
  },
  {
    title: "SETTINGS",
    description: "System configuration & preferences",
    url: "/settings",
    icon: Settings,
    cmd: "08",
  },
];

const Index = () => {
  const { adminUsername, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: pendingReports } = useQuery({
    queryKey: ["pending-reports"],
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: profileCount } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <AdminLayout showBack={false}>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-foreground text-lg glow-text tracking-widest">NEARVOX</p>
            <p className="text-[10px] text-muted-foreground tracking-[0.4em]">ADMIN TERMINAL v1.0</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xs admin-text glow-admin font-bold">{adminUsername || "USER"}</p>
                {isAdmin && <span className="admin-badge">ADMIN</span>}
              </div>
              <p className="text-[10px] text-muted-foreground">ROOT ACCESS</p>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="border border-border p-2 mb-6 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>STATUS: <span className="text-foreground">ONLINE</span></span>
          <span>SESSION: <span className="text-foreground">ACTIVE</span></span>
          <span>USERS: <span className="text-foreground">{profileCount ?? "..."}</span></span>
          {(pendingReports ?? 0) > 0 && (
            <span className="text-warning">⚠ {pendingReports} PENDING REPORTS</span>
          )}
        </div>

        {/* Command menu as topic list */}
        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-3">COMMAND MENU</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.url}
                onClick={() => navigate(section.url)}
                className="text-left p-4 border border-border hover:border-foreground/30 hover:bg-muted/30 transition-none group flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">[{section.cmd}]</span>
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="text-sm text-foreground">{section.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{section.description}</p>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground mt-6">// Select a command to proceed</p>
      </div>
    </AdminLayout>
  );
};

export default Index;
