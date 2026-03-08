import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { adminUsername } = useAuth();

  const { data: profileCount } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: postCount } = useQuery({
    queryKey: ["posts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: reportCount } = useQuery({
    queryKey: ["reports-count"],
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: pendingReports } = useQuery({
    queryKey: ["pending-reports"],
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: listingCount } = useQuery({
    queryKey: ["listings-count"],
    queryFn: async () => {
      const { count } = await supabase.from("marketplace_listings").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: announcementCount } = useQuery({
    queryKey: ["announcements-count"],
    queryFn: async () => {
      const { count } = await supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
  });

  const { data: recentReports } = useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });
      return data || [];
    },
  });

  const systemStats = [
    { label: "TOTAL USERS", value: String(profileCount ?? 0) },
    { label: "TOTAL POSTS", value: String(postCount ?? 0) },
    { label: "TOTAL REPORTS", value: String(reportCount ?? 0) },
    { label: "PENDING REPORTS", value: String(pendingReports ?? 0) },
    { label: "MARKETPLACE LISTINGS", value: String(listingCount ?? 0) },
    { label: "ACTIVE ANNOUNCEMENTS", value: String(announcementCount ?? 0) },
  ];

  return (
    <AdminLayout>
      <PageHeader title="SYSTEM DASHBOARD" description="// REAL-TIME PLATFORM MONITORING" />

      <div className="p-6 space-y-6">
        {/* Admin Identity Banner */}
        <div className="admin-box px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] mb-1">
            <span className="admin-text glow-admin font-bold text-sm">{adminUsername || "ADMIN"}</span>
            <span className="admin-badge">ADMIN</span>
            <span className="text-muted-foreground ml-2">LOGGED IN — ROOT ACCESS</span>
            <span className="ml-auto text-muted-foreground">SESSION: ACTIVE</span>
          </div>
          <p className="text-[10px] text-muted-foreground">// All admin actions will be attributed to this identity</p>
        </div>

        {/* System Status Block */}
        <div className="terminal-box">
          <div className="terminal-header">SYSTEM STATUS</div>
          {systemStats.map((stat) => (
            <div key={stat.label} className="terminal-row">
              <span className="terminal-label">{stat.label}</span>
              <span className="terminal-dots" />
              <span className="terminal-value">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="terminal-box">
          <div className="terminal-header">RECENT REPORTS</div>
          {recentReports && recentReports.length > 0 ? (
            recentReports.map((report: any) => (
              <div key={report.id} className="py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{report.id.slice(0, 8)}</span>
                  <span className="text-foreground">[{report.report_type?.toUpperCase()}]</span>
                  <span className={`ml-auto ${
                    report.status === "pending" ? "text-warning" :
                    report.status === "reviewing" ? "text-foreground" : "text-muted-foreground"
                  }`}>{report.status?.toUpperCase()}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {report.reason} — by {report.reporter?.username || "Unknown"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">NO REPORTS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
