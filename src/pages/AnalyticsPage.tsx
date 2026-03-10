import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const tooltipStyle = {
  background: "#000",
  border: "1px solid hsl(120, 100%, 12%)",
  borderRadius: 0,
  color: "hsl(120, 100%, 50%)",
  fontFamily: "VT323, monospace",
  fontSize: 14,
};

export default function AnalyticsPage() {
  // Real user growth data (grouped by month)
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

  // Real location/region breakdown
  const { data: regionActivity } = useQuery({
    queryKey: ["analytics-region-activity"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("location");
      const { data: posts } = await supabase.from("posts").select("location");
      const regionMap: Record<string, { users: number; posts: number }> = {};
      profiles?.forEach((p) => {
        const loc = (p.location || "Unknown").split(",")[0].trim().toUpperCase().slice(0, 5);
        if (!regionMap[loc]) regionMap[loc] = { users: 0, posts: 0 };
        regionMap[loc].users++;
      });
      posts?.forEach((p) => {
        const loc = (p.location || "Unknown").split(",")[0].trim().toUpperCase().slice(0, 5);
        if (!regionMap[loc]) regionMap[loc] = { users: 0, posts: 0 };
        regionMap[loc].posts++;
      });
      return Object.entries(regionMap)
        .map(([city, data]) => ({ city, ...data }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 7);
    },
  });

  // Real metrics
  const { data: metrics } = useQuery({
    queryKey: ["analytics-metrics"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: totalPosts } = await supabase.from("posts").select("*", { count: "exact", head: true });
      const { count: totalTopics } = await supabase.from("topics").select("*", { count: "exact", head: true });
      const { count: totalMessages } = await supabase.from("chat_messages").select("*", { count: "exact", head: true });
      const { count: totalListings } = await supabase.from("marketplace_listings").select("*", { count: "exact", head: true });
      const { count: activeAnn } = await supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_active", true);
      
      // Users joined in last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
      
      return [
        { label: "TOTAL USERS", value: `${totalUsers ?? 0}` },
        { label: "NEW THIS WEEK", value: `+${recentUsers ?? 0}` },
        { label: "TOTAL POSTS", value: `${totalPosts ?? 0}` },
        { label: "TOTAL TOPICS", value: `${totalTopics ?? 0}` },
        { label: "CHAT MESSAGES", value: `${totalMessages ?? 0}` },
        { label: "ACTIVE BROADCASTS", value: `${activeAnn ?? 0}` },
      ];
    },
  });

  return (
    <AdminLayout>
      <PageHeader title="ANALYTICS ENGINE" description="// REAL-TIME PLATFORM METRICS" />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Key Metrics */}
        <div className="terminal-box">
          <div className="terminal-header text-[9px] sm:text-[10px]">LIVE METRICS</div>
          {metrics ? metrics.map((m) => (
            <div key={m.label} className="terminal-row">
              <span className="terminal-label text-[9px] sm:text-[10px]">{m.label}</span>
              <span className="terminal-dots" />
              <span className="terminal-value text-[10px] sm:text-xs">{m.value}</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground cursor-blink">LOADING</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* User Growth */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px]">USER GROWTH</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth || []}>
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 100%, 8%)" />
                <XAxis dataKey="month" stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 12 }} />
                <YAxis stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke="hsl(120, 100%, 50%)" fillOpacity={1} fill="url(#gGreen)" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Region Activity */}
          <div className="terminal-box">
            <div className="terminal-header text-[9px] sm:text-[10px]">REGION ACTIVITY</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={regionActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 100%, 8%)" />
                <XAxis dataKey="city" stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 12 }} />
                <YAxis stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="posts" fill="hsl(120, 100%, 50%)" opacity={0.7} />
                <Bar dataKey="users" fill="hsl(120, 100%, 30%)" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
