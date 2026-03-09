import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ReportsPage() {
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Collect all user IDs from reports (reporters + reported users)
  const allUserIds = [
    ...new Set([
      ...(reports?.map((r: any) => r.reporter_id) || []),
      ...(reports?.map((r: any) => r.reported_user_id).filter(Boolean) || []),
    ]),
  ];

  const { data: profiles } = useQuery({
    queryKey: ["admin-report-profiles", allUserIds],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", allUserIds);
      return data || [];
    },
    enabled: allUserIds.length > 0,
  });

  // Collect all reported post IDs
  const reportedPostIds = [
    ...new Set(reports?.map((r: any) => r.reported_post_id).filter(Boolean) || []),
  ];

  const { data: reportedPosts } = useQuery({
    queryKey: ["admin-reported-posts", reportedPostIds],
    queryFn: async () => {
      if (reportedPostIds.length === 0) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, content")
        .in("id", reportedPostIds);
      return data || [];
    },
    enabled: reportedPostIds.length > 0,
  });

  const getName = (userId: string | null) => {
    if (!userId) return "—";
    const p = profiles?.find((pr) => pr.user_id === userId);
    if (!p) return userId.slice(0, 8);
    if (p.is_admin) return p.username || "ADMIN";
    return p.anonymous_name || p.username || userId.slice(0, 8);
  };

  const getPostPreview = (postId: string | null) => {
    if (!postId) return null;
    const post = reportedPosts?.find((p) => p.id === postId);
    return post ? post.content.slice(0, 80) + (post.content.length > 80 ? "..." : "") : null;
  };

  // Clean up reason by removing internal reference tags
  const cleanReason = (reason: string) => {
    return reason
      .replace(/\s*\[topic:[^\]]+\]/g, "")
      .replace(/\s*\[reply:[^\]]+\]/g, "")
      .replace(/\s*\[board_post:[^\]]+\]/g, "")
      .trim();
  };

  const pendingCount = reports?.filter((r: any) => r.status === "pending").length ?? 0;

  const handleStatusUpdate = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error("Failed");
    else {
      toast.success(`Report ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  };

  const timeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <AdminLayout>
      <PageHeader title="REPORT CENTER" description="// THREAT ASSESSMENT AND CONTENT REVIEW">
        <span className="text-xs text-warning">PENDING: {pendingCount}</span>
      </PageHeader>

      <div className="p-3 sm:p-6">
        <div className="terminal-box">
          <div className="terminal-header text-[10px] sm:text-xs">REPORT QUEUE — {reports?.length ?? 0} ENTRIES</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : reports && reports.length > 0 ? (
            reports.map((report: any) => {
              const postPreview = getPostPreview(report.reported_post_id);
              return (
                <div key={report.id} className={`py-3 px-1 sm:px-0 border-b border-border last:border-0 ${report.severity === "critical" ? "bg-destructive/5" : ""}`}>
                  {/* Row 1: type + severity + status */}
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] mb-1.5">
                    <span className="text-muted-foreground hidden sm:inline">{report.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <span className="text-foreground">[{report.report_type?.toUpperCase()}]</span>
                    <span className={`${
                      report.severity === "critical" ? "text-destructive" :
                      report.severity === "high" ? "text-warning" :
                      report.severity === "medium" ? "text-foreground" : "text-muted-foreground"
                    }`}>SEV:{report.severity?.toUpperCase()}</span>
                    <span className={`ml-auto ${
                      report.status === "pending" ? "text-warning" :
                      report.status === "reviewing" ? "text-foreground" : "text-muted-foreground"
                    }`}>{report.status?.toUpperCase()}</span>
                  </div>

                  {/* Row 2: reason */}
                  <p className="text-[11px] sm:text-xs text-secondary-foreground mb-1.5 pl-2 border-l-2 border-border leading-relaxed break-words">{cleanReason(report.reason)}</p>

                  {/* Row 3: post preview */}
                  {postPreview && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1.5 pl-2 border-l-2 border-foreground/20 italic break-words">
                      POST: "{postPreview}"
                    </p>
                  )}

                  {/* Row 4: reporter + against */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-x-2 text-[9px] sm:text-[10px] text-muted-foreground mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>FROM: <span className="text-foreground">{getName(report.reporter_id)}</span></span>
                      <span className="hidden sm:inline">→</span>
                      <span>AGAINST: <span className="text-foreground">{getName(report.reported_user_id)}</span></span>
                    </div>
                    <span className="sm:ml-auto text-muted-foreground">{timeSince(report.created_at)}</span>
                  </div>

                  {/* Row 5: actions */}
                  {report.status !== "resolved" && report.status !== "dismissed" && (
                    <div className="flex items-center gap-1 sm:gap-2 pt-1.5 border-t border-border/50">
                      <button onClick={() => handleStatusUpdate(report.id, "reviewing")} className="text-[9px] sm:text-[10px] text-foreground hover:underline px-1.5 py-1 border border-border">REVIEW</button>
                      <button onClick={() => handleStatusUpdate(report.id, "dismissed")} className="text-[9px] sm:text-[10px] text-foreground hover:underline px-1.5 py-1 border border-border">DISMISS</button>
                      <button onClick={() => handleStatusUpdate(report.id, "resolved")} className="text-[9px] sm:text-[10px] text-foreground hover:underline px-1.5 py-1 border border-border">RESOLVE</button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO REPORTS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
