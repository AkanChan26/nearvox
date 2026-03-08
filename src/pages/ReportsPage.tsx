import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";

const reports = [
  { id: "RPT-0047", type: "POST", content: "Offensive language in post about local politics", reporter: "SilentFalcon", reported: "DarkPixel", time: "00:05:14", status: "PENDING", severity: "HIGH" },
  { id: "RPT-0046", type: "USER", content: "Spam account posting fake marketplace listings", reporter: "UrbanGhost", reported: "SpamBot99", time: "00:20:33", status: "PENDING", severity: "HIGH" },
  { id: "RPT-0045", type: "COMMENT", content: "Harassment in comment thread on popular post", reporter: "NeonDrifter", reported: "ToxicUser", time: "00:32:07", status: "REVIEWING", severity: "CRITICAL" },
  { id: "RPT-0044", type: "MESSAGE", content: "Unsolicited promotional messages to users", reporter: "CodeWalker", reported: "PromoKing", time: "02:04:22", status: "PENDING", severity: "MEDIUM" },
  { id: "RPT-0043", type: "POST", content: "Misleading information about local event", reporter: "VoidEcho", reported: "FakeNews22", time: "03:11:58", status: "RESOLVED", severity: "LOW" },
  { id: "RPT-0042", type: "LISTING", content: "Fraudulent product listing with fake images", reporter: "GlitchNode", reported: "ScamSeller", time: "05:44:09", status: "RESOLVED", severity: "HIGH" },
];

export default function ReportsPage() {
  return (
    <AdminLayout>
      <PageHeader title="REPORT CENTER" description="// THREAT ASSESSMENT AND CONTENT REVIEW">
        <span className="text-xs text-warning">PENDING: 3</span>
      </PageHeader>

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">REPORT QUEUE</div>

          {reports.map((report) => (
            <div key={report.id} className={`py-3 border-b border-border last:border-0 ${report.severity === "CRITICAL" ? "bg-destructive/5" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] mb-1">
                <span className="text-muted-foreground">{report.id}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-foreground">[{report.type}]</span>
                <span className={`${
                  report.severity === "CRITICAL" ? "text-destructive" :
                  report.severity === "HIGH" ? "text-warning" :
                  report.severity === "MEDIUM" ? "text-foreground" : "text-muted-foreground"
                }`}>SEV:{report.severity}</span>
                <span className={`ml-auto ${
                  report.status === "PENDING" ? "text-warning" :
                  report.status === "REVIEWING" ? "text-foreground" : "text-muted-foreground"
                }`}>{report.status}</span>
              </div>
              <p className="text-xs text-secondary-foreground mb-1 pl-2 border-l border-border">{report.content}</p>
              <div className="flex items-center text-[10px] text-muted-foreground">
                <span>BY:{report.reporter} → AGAINST:{report.reported}</span>
                <span className="ml-auto">T-{report.time}</span>
                {report.status !== "RESOLVED" && (
                  <span className="ml-4 space-x-2">
                    <button className="text-foreground hover:underline">[REVIEW]</button>
                    <button className="text-foreground hover:underline">[DISMISS]</button>
                    <button className="text-warning hover:underline">[WARN]</button>
                    <button className="text-destructive hover:underline">[BAN]</button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
