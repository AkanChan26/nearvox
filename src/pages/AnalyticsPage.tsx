import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const userGrowth = [
  { month: "OCT", users: 2400 },
  { month: "NOV", users: 5800 },
  { month: "DEC", users: 9200 },
  { month: "JAN", users: 14500 },
  { month: "FEB", users: 19800 },
  { month: "MAR", users: 24891 },
];

const cityActivity = [
  { city: "MUM", posts: 890, users: 3200 },
  { city: "DEL", posts: 720, users: 2800 },
  { city: "BLR", posts: 650, users: 2100 },
  { city: "AMD", posts: 380, users: 1400 },
  { city: "PUN", posts: 290, users: 1100 },
  { city: "CHE", posts: 240, users: 900 },
  { city: "HYD", posts: 310, users: 1050 },
];

const metrics = [
  { label: "USER GROWTH RATE", value: "+25.6%" },
  { label: "ENGAGEMENT INDEX", value: "68%" },
  { label: "ACTIVE SECTORS", value: "142" },
  { label: "AVG DAILY MESSAGES", value: "12,847" },
  { label: "PEAK HOUR", value: "21:00 IST" },
  { label: "RETENTION RATE", value: "74.2%" },
];

const tooltipStyle = {
  background: "#000",
  border: "1px solid hsl(120, 100%, 12%)",
  borderRadius: 0,
  color: "hsl(120, 100%, 50%)",
  fontFamily: "VT323, monospace",
  fontSize: 14,
};

export default function AnalyticsPage() {
  return (
    <AdminLayout>
      <PageHeader title="ANALYTICS ENGINE" description="// PLATFORM INTELLIGENCE METRICS" />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="terminal-box">
          <div className="terminal-header">KEY METRICS</div>
          {metrics.map((m) => (
            <div key={m.label} className="terminal-row">
              <span className="terminal-label">{m.label}</span>
              <span className="terminal-dots" />
              <span className="terminal-value">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <div className="terminal-box">
            <div className="terminal-header">USER GROWTH TRAJECTORY</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 100%, 8%)" />
                <XAxis dataKey="month" stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 14 }} />
                <YAxis stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 14 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke="hsl(120, 100%, 50%)" fillOpacity={1} fill="url(#gGreen)" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* City Activity */}
          <div className="terminal-box">
            <div className="terminal-header">SECTOR ACTIVITY</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cityActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 100%, 8%)" />
                <XAxis dataKey="city" stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 14 }} />
                <YAxis stroke="hsl(120, 30%, 30%)" tick={{ fontFamily: "VT323", fontSize: 14 }} />
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
