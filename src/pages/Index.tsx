import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";

const systemStats = [
  { label: "TOTAL USERS", value: "24,891" },
  { label: "ACTIVE TODAY", value: "3,472" },
  { label: "TOTAL POSTS", value: "89,204" },
  { label: "REPORTED POSTS", value: "47" },
  { label: "MARKETPLACE LISTINGS", value: "1,284" },
  { label: "TRENDING LOCATION", value: "MUMBAI" },
  { label: "ENGAGEMENT RATE", value: "68%" },
  { label: "MESSAGES TODAY", value: "12,847" },
];

const recentReports = [
  { id: "RPT-0047", type: "POST", reason: "INAPPROPRIATE CONTENT", user: "SilentFalcon", time: "00:02:14", status: "PENDING" },
  { id: "RPT-0046", type: "USER", reason: "SPAM ACCOUNT", user: "UrbanGhost", time: "00:15:33", status: "PENDING" },
  { id: "RPT-0045", type: "COMMENT", reason: "HARASSMENT", user: "MidnightVoice", time: "00:32:07", status: "REVIEWING" },
  { id: "RPT-0044", type: "LISTING", reason: "FRAUDULENT ITEM", user: "CodeWalker", time: "01:04:22", status: "RESOLVED" },
  { id: "RPT-0043", type: "POST", reason: "MISINFORMATION", user: "NeonDrifter", time: "02:11:58", status: "PENDING" },
];

const trendingLocations = [
  { rank: 1, city: "MUMBAI", users: 3200, posts: 890 },
  { rank: 2, city: "DELHI", users: 2800, posts: 720 },
  { rank: 3, city: "BANGALORE", users: 2100, posts: 650 },
  { rank: 4, city: "AHMEDABAD", users: 1400, posts: 380 },
  { rank: 5, city: "PUNE", users: 1100, posts: 290 },
];

const Index = () => {
  return (
    <AdminLayout>
      <PageHeader title="SYSTEM DASHBOARD" description="// REAL-TIME PLATFORM MONITORING" />

      <div className="p-6 space-y-6">
        {/* Admin Identity Banner */}
        <div className="admin-box px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] mb-1">
            <span className="admin-text glow-admin font-bold text-sm">TheCaptain</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="terminal-box">
            <div className="terminal-header">INCOMING REPORTS</div>
            {recentReports.map((report) => (
              <div key={report.id} className="py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{report.id}</span>
                  <span className="text-foreground">[{report.type}]</span>
                  <span className={`ml-auto ${
                    report.status === "PENDING" ? "text-warning" :
                    report.status === "REVIEWING" ? "text-foreground" : "text-muted-foreground"
                  }`}>{report.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {report.reason} — by {report.user} — T-{report.time}
                </div>
              </div>
            ))}
          </div>

          {/* Trending Locations */}
          <div className="terminal-box">
            <div className="terminal-header">LOCATION ACTIVITY MONITOR</div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-between mb-2 pb-1">
              <span>RANK</span><span>CITY</span><span>USERS</span><span>POSTS</span><span>LOAD</span>
            </div>
            {trendingLocations.map((loc) => {
              const load = Math.round((loc.users / 3200) * 100);
              const barLength = Math.round(load / 5);
              const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
              return (
                <div key={loc.city} className="flex items-center justify-between text-xs py-1">
                  <span className="text-muted-foreground w-8">#{loc.rank}</span>
                  <span className="text-foreground w-24">{loc.city}</span>
                  <span className="text-muted-foreground w-12 text-right">{loc.users}</span>
                  <span className="text-muted-foreground w-12 text-right">{loc.posts}</span>
                  <span className="text-foreground text-[10px] tracking-tighter ml-3">{bar}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Log */}
        <div className="terminal-box">
          <div className="terminal-header">SYSTEM LOG</div>
          <div className="text-xs space-y-1">
            <p><span className="text-muted-foreground">[08:24:01]</span> <span className="admin-text glow-admin">TheCaptain</span> <span className="admin-badge">ADMIN</span> <span className="text-foreground">posted announcement: Community Guidelines Update</span></p>
            <p><span className="text-muted-foreground">[08:22:45]</span> <span className="text-foreground">New marketplace listing from CodeWalker</span></p>
            <p><span className="text-muted-foreground">[08:20:12]</span> <span className="admin-text glow-admin">TheCaptain</span> <span className="admin-badge">ADMIN</span> <span className="text-foreground">removed spam post in DELHI sector</span></p>
            <p><span className="text-muted-foreground">[08:18:33]</span> <span className="admin-text glow-admin">TheCaptain</span> <span className="admin-badge">ADMIN</span> <span className="text-foreground">suspended user UrbanGhost — REASON: spam</span></p>
            <p><span className="text-muted-foreground">[08:15:07]</span> <span className="text-foreground">System backup completed successfully</span></p>
            <p className="cursor-blink"><span className="text-muted-foreground">[08:14:59]</span> <span className="text-foreground">Monitoring active</span></p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
