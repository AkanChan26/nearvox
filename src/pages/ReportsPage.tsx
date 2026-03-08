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
      return data;
    },
  });

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

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">REPORT QUEUE — {reports?.length ?? 0} ENTRIES</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : reports && reports.length > 0 ? (
            reports.map((report: any) => (
              <div key={report.id} className={`py-3 border-b border-border last:border-0 ${report.severity === "critical" ? "bg-destructive/5" : ""}`}>
                <div className="flex items-center gap-2 text-[10px] mb-1">
                  <span className="text-muted-foreground">{report.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">|</span>
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
                <p className="text-xs text-secondary-foreground mb-1 pl-2 border-l border-border">{report.reason}</p>
                <div className="flex items-center text-[10px] text-muted-foreground">
                  <span>BY:{report.reporter?.username || "?"} → AGAINST:{report.reported?.username || "?"}</span>
                  <span className="ml-auto">{timeSince(report.created_at)}</span>
                  {report.status !== "resolved" && report.status !== "dismissed" && (
                    <span className="ml-4 space-x-2">
                      <button onClick={() => handleStatusUpdate(report.id, "reviewing")} className="text-foreground hover:underline">[REVIEW]</button>
                      <button onClick={() => handleStatusUpdate(report.id, "dismissed")} className="text-foreground hover:underline">[DISMISS]</button>
                      <button onClick={() => handleStatusUpdate(report.id, "resolved")} className="text-foreground hover:underline">[RESOLVE]</button>
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO REPORTS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
