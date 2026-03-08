import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Users, TrendingUp, MapPin, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const userGrowth = [
  { month: "Oct", users: 2400 },
  { month: "Nov", users: 5800 },
  { month: "Dec", users: 9200 },
  { month: "Jan", users: 14500 },
  { month: "Feb", users: 19800 },
  { month: "Mar", users: 24891 },
];

const cityActivity = [
  { city: "Mumbai", posts: 890, users: 3200 },
  { city: "Delhi", posts: 720, users: 2800 },
  { city: "Bangalore", posts: 650, users: 2100 },
  { city: "Ahmedabad", posts: 380, users: 1400 },
  { city: "Pune", posts: 290, users: 1100 },
  { city: "Chennai", posts: 240, users: 900 },
  { city: "Hyderabad", posts: 310, users: 1050 },
];

export default function AnalyticsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Analytics" description="Platform insights and growth metrics" />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="User Growth" value="+25.6%" change="vs last month" changeType="up" icon={Users} />
          <StatCard title="Engagement" value="68%" change="+5.1% this month" changeType="up" icon={TrendingUp} />
          <StatCard title="Active Cities" value="142" change="+12 new cities" changeType="up" icon={MapPin} />
          <StatCard title="Avg. Messages/Day" value="12.8K" change="-2.3% vs last week" changeType="down" icon={MessageSquare} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
                <XAxis dataKey="month" stroke="hsl(215, 15%, 50%)" fontSize={12} />
                <YAxis stroke="hsl(215, 15%, 50%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 16%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Area type="monotone" dataKey="users" stroke="hsl(175, 80%, 50%)" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activity by City</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cityActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
                <XAxis dataKey="city" stroke="hsl(215, 15%, 50%)" fontSize={11} />
                <YAxis stroke="hsl(215, 15%, 50%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 16%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} />
                <Bar dataKey="posts" fill="hsl(175, 80%, 50%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="users" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
