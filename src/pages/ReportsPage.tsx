import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { motion } from "framer-motion";

const reports = [
  { id: 1, type: "Post", content: "Offensive language in post about local politics", reporter: "SilentFalcon", reported: "DarkPixel", time: "5 min ago", status: "pending", severity: "high" },
  { id: 2, type: "User", content: "Spam account posting fake marketplace listings", reporter: "UrbanGhost", reported: "SpamBot99", time: "20 min ago", status: "pending", severity: "high" },
  { id: 3, type: "Comment", content: "Harassment in comment thread on popular post", reporter: "NeonDrifter", reported: "ToxicUser", time: "1 hr ago", status: "reviewing", severity: "critical" },
  { id: 4, type: "Message", content: "Unsolicited promotional messages to multiple users", reporter: "CodeWalker", reported: "PromoKing", time: "2 hr ago", status: "pending", severity: "medium" },
  { id: 5, type: "Post", content: "Misleading information about local event", reporter: "VoidEcho", reported: "FakeNews22", time: "3 hr ago", status: "resolved", severity: "low" },
  { id: 6, type: "Listing", content: "Fraudulent product listing with fake images", reporter: "GlitchNode", reported: "ScamSeller", time: "5 hr ago", status: "resolved", severity: "high" },
];

export default function ReportsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Report Management" description="Review and take action on user reports">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            <span className="text-warning font-semibold">4</span> pending
          </span>
        </div>
      </PageHeader>

      <div className="p-8 space-y-3">
        {reports.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-5 ${report.severity === "critical" ? "border-destructive/30" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                    report.severity === "critical" ? "bg-destructive/10 text-destructive" :
                    report.severity === "high" ? "bg-warning/10 text-warning" :
                    report.severity === "medium" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                  }`}>{report.severity}</span>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{report.type}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                    report.status === "pending" ? "bg-warning/10 text-warning" :
                    report.status === "reviewing" ? "bg-info/10 text-info" : "bg-success/10 text-success"
                  }`}>{report.status}</span>
                </div>
                <p className="text-sm text-foreground mb-1">{report.content}</p>
                <p className="text-xs text-muted-foreground">
                  Reported by <span className="text-secondary-foreground">{report.reporter}</span> against <span className="text-secondary-foreground">{report.reported}</span> • {report.time}
                </p>
              </div>
              {report.status !== "resolved" && (
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-info">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </AdminLayout>
  );
}
