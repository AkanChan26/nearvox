import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Users, FileText, ShoppingBag, AlertTriangle, MapPin, TrendingUp, Eye, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { title: "Total Users", value: "24,891", change: "+12.5% this week", changeType: "up" as const, icon: Users },
  { title: "Active Today", value: "3,472", change: "+8.2% vs yesterday", changeType: "up" as const, icon: Eye },
  { title: "Total Posts", value: "89,204", change: "+2,340 today", changeType: "up" as const, icon: FileText },
  { title: "Reported Posts", value: "47", change: "12 pending review", changeType: "neutral" as const, icon: AlertTriangle },
  { title: "Marketplace", value: "1,284", change: "56 new listings", changeType: "up" as const, icon: ShoppingBag },
  { title: "Trending Locations", value: "Mumbai", change: "3,200 active users", changeType: "neutral" as const, icon: MapPin },
  { title: "Engagement Rate", value: "68%", change: "+5.1% this month", changeType: "up" as const, icon: TrendingUp },
  { title: "Messages Today", value: "12,847", change: "-2.3% vs yesterday", changeType: "down" as const, icon: MessageSquare },
];

const recentReports = [
  { id: 1, type: "Post", reason: "Inappropriate content", user: "SilentFalcon", time: "2 min ago", status: "pending" },
  { id: 2, type: "User", reason: "Spam account", user: "UrbanGhost", time: "15 min ago", status: "pending" },
  { id: 3, type: "Comment", reason: "Harassment", user: "MidnightVoice", time: "32 min ago", status: "reviewing" },
  { id: 4, type: "Listing", reason: "Fraudulent item", user: "CodeWalker", time: "1 hr ago", status: "resolved" },
  { id: 5, type: "Post", reason: "Misinformation", user: "NeonDrifter", time: "2 hr ago", status: "pending" },
];

const trendingLocations = [
  { city: "Mumbai", users: 3200, posts: 890 },
  { city: "Delhi", users: 2800, posts: 720 },
  { city: "Bangalore", users: 2100, posts: 650 },
  { city: "Ahmedabad", users: 1400, posts: 380 },
  { city: "Pune", users: 1100, posts: 290 },
];

const Index = () => {
  return (
    <AdminLayout>
      <PageHeader title="Dashboard" description="Platform overview and real-time activity" />

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
            </div>
            <div className="divide-y divide-border">
              {recentReports.map((report) => (
                <div key={report.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      report.status === "pending" ? "bg-warning" : report.status === "reviewing" ? "bg-info" : "bg-success"
                    }`} />
                    <div>
                      <p className="text-sm text-foreground">{report.reason}</p>
                      <p className="text-xs text-muted-foreground">{report.type} • by {report.user} • {report.time}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                    report.status === "pending" ? "bg-warning/10 text-warning" :
                    report.status === "reviewing" ? "bg-info/10 text-info" : "bg-success/10 text-success"
                  }`}>
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Trending Locations */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Trending Locations</h2>
            </div>
            <div className="divide-y divide-border">
              {trendingLocations.map((loc, i) => (
                <div key={loc.city} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-5">#{i + 1}</span>
                    <div>
                      <p className="text-sm text-foreground font-medium">{loc.city}</p>
                      <p className="text-xs text-muted-foreground">{loc.users.toLocaleString()} active users</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{loc.posts} posts</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
