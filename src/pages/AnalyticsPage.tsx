import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, MessageSquare, FileText, Activity } from "lucide-react";

const tooltipStyle = {
  background: "#000",
  border: "1px solid hsl(145, 80%, 12%)",
  borderRadius: 0,
  color: "hsl(145, 80%, 56%)",
  fontFamily: "VT323, monospace",
  fontSize: 14,
};

const CHART_COLORS = [
  "hsl(145, 80%, 56%)",
  "hsl(199, 91%, 56%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 85%, 50%)",
  "hsl(280, 70%, 55%)",
  "hsl(25, 90%, 55%)",
  "hsl(170, 70%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(55, 85%, 55%)",
];

export default function AnalyticsPage() {
  const { data: userGrowth } = useQuery({
    queryKey: ["analytics-user-growth"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("created_at").order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];
      const months: Record<string, number> = {};
      let cumulative = 0;
      data.forEach((p) => {
        const d = new Date(p.created_at);
        const key = d.toLocaleString("en", { month: "short", year: "2-digit" }).toUpperCase();
        cumulative++;
        months[key] = cumulative;
      });
      return Object.entries(months).map(([month, users]) => ({ month, users }));
    },
  });

  const { data: regionActivity } = useQuery({
    queryKey: ["analytics-region-activity"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("location");
      const { data: posts } = await supabase.from("posts").select("location");
      const regionMap: Record<string, { users: number; posts: number }> = {};
      profiles?.forEach((p) => {
        const loc = (p.location || "Unknown").split(",")[0].trim().toUpperCase().slice(0, 8);
        if (!regionMap[loc]) regionMap[loc] = { users: 0, posts: 0 };
        regionMap[loc].users++;
      });
      posts?.forEach((p) => {
        const loc = (p.location || "Unknown").split(",")[0].trim().toUpperCase().slice(0, 8);
        if (!regionMap[loc]) regionMap[loc] = { users: 0, posts: 0 };
        regionMap[loc].posts++;
      });
      return Object.entries(regionMap)
        .map(([city, data]) => ({ city, ...data }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 7);
    },
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ["analytics-category-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("category");
      const counts: Record<string, number> = {};
      data?.forEach((t: any) => {
        const cat = t.category || "discussions";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name: name.replace(/_/g, " ").toUpperCase(), value }))
        .sort((a, b) => b.value - a.value);
    },
  });

  const { data: dailyActivity } = useQuery({
    queryKey: ["analytics-daily-activity"],
    queryFn: async () => {
      const days: { day: string; posts: number; topics: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const start = new Date(date); start.setHours(0, 0, 0, 0);
        const end = new Date(date); end.setHours(23, 59, 59, 999);
        const [postsRes, topicsRes] = await Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
          supabase.from("topics").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        ]);
        days.push({
          day: date.toLocaleString("en", { weekday: "short" }).toUpperCase(),
          posts: postsRes.count ?? 0,
          topics: topicsRes.count ?? 0,
        });
      }
      return days;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["analytics-metrics"],
    queryFn: async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [totalUsers, totalPosts, totalTopics, totalMessages, totalListings, activeAnn, recentUsers, todayPosts] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("chat_messages").select("*", { count: "exact", head: true }),
        supabase.from("marketplace_listings").select("*", { count: "exact", head: true }),
        supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      ]);
      return {
        totalUsers: totalUsers.count ?? 0,
        newThisWeek: recentUsers.count ?? 0,
        totalPosts: totalPosts.count ?? 0,
        totalTopics: totalTopics.count ?? 0,
        totalMessages: totalMessages.count ?? 0,
        totalListings: totalListings.count ?? 0,
        activeBroadcasts: activeAnn.count ?? 0,
        postsToday: todayPosts.count ?? 0,
      };
    },
  });

  const metricCards = metrics ? [
    { label: "TOTAL USERS", value: metrics.totalUsers, icon: Users, color: "text-foreground" },
    { label: "NEW THIS WEEK", value: `+${metrics.newThisWeek}`, icon: TrendingUp, color: "text-foreground" },
    { label: "POSTS TODAY", value: metrics.postsToday, icon: FileText, color: "text-[hsl(var(--warning))]" },
    { label: "TOTAL POSTS", value: metrics.totalPosts, icon: FileText, color: "text-foreground" },
    { label: "TOTAL TOPICS", value: metrics.totalTopics, icon: MessageSquare, color: "text-foreground" },
    { label: "CHAT MESSAGES", value: metrics.totalMessages, icon: MessageSquare, color: "text-foreground" },
  ] : [];

  return (
    <AdminLayout>
      <PageHeader title="ANALYTICS ENGINE" description="// REAL-TIME PLATFORM METRICS" />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {metricCards.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="terminal-box p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground tracking-wider">{m.label}</span>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* User Growth */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px] flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> USER GROWTH
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth || []}>
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(145, 80%, 56%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(145, 80%, 56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 50%, 8%)" />
                <XAxis dataKey="month" stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 11 }} />
                <YAxis stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke="hsl(145, 80%, 56%)" fillOpacity={1} fill="url(#gGreen)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Activity (7 days) */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px] flex items-center gap-2">
              <Activity className="h-3 w-3" /> 7-DAY ACTIVITY
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 50%, 8%)" />
                <XAxis dataKey="day" stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 11 }} />
                <YAxis stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="posts" fill="hsl(145, 80%, 56%)" opacity={0.7} name="Posts" />
                <Bar dataKey="topics" fill="hsl(199, 91%, 56%)" opacity={0.5} name="Topics" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Region Activity */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px]">REGION ACTIVITY</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={regionActivity || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 50%, 8%)" />
                <XAxis type="number" stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 11 }} />
                <YAxis type="category" dataKey="city" stroke="hsl(145, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 10 }} width={55} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="users" fill="hsl(145, 80%, 56%)" opacity={0.6} name="Users" />
                <Bar dataKey="posts" fill="hsl(199, 91%, 56%)" opacity={0.5} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px]">CATEGORY BREAKDOWN</div>
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      stroke="hsl(0 0% 0%)"
                      strokeWidth={1}
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full sm:w-auto space-y-1">
                  {categoryBreakdown.slice(0, 6).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-[10px]">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                      <span className="text-foreground font-bold ml-auto">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">NO DATA YET</p>
            )}
          </div>
        </div>

        {/* Engagement Summary */}
        {metrics && (
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px]">ENGAGEMENT SUMMARY</div>
            <div className="space-y-1">
              {[
                { label: "AVG POSTS PER USER", value: metrics.totalUsers > 0 ? (metrics.totalPosts / metrics.totalUsers).toFixed(1) : "0" },
                { label: "AVG TOPICS PER USER", value: metrics.totalUsers > 0 ? (metrics.totalTopics / metrics.totalUsers).toFixed(1) : "0" },
                { label: "MESSAGES PER USER", value: metrics.totalUsers > 0 ? (metrics.totalMessages / metrics.totalUsers).toFixed(1) : "0" },
                { label: "MARKETPLACE LISTINGS", value: `${metrics.totalListings}` },
                { label: "ACTIVE BROADCASTS", value: `${metrics.activeBroadcasts}` },
              ].map((item) => (
                <div key={item.label} className="terminal-row">
                  <span className="terminal-label text-[9px] sm:text-[10px]">{item.label}</span>
                  <span className="terminal-dots" />
                  <span className="terminal-value text-[10px] sm:text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
