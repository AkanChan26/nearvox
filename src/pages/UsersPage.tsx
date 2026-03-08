import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal, Ban, Eye } from "lucide-react";
import { motion } from "framer-motion";

const users = [
  { id: 1, username: "SilentFalcon", location: "Mumbai", status: "active", posts: 42, joined: "2025-12-01", lastActive: "2 min ago" },
  { id: 2, username: "UrbanGhost", location: "Delhi", status: "active", posts: 87, joined: "2025-11-15", lastActive: "5 min ago" },
  { id: 3, username: "MidnightVoice", location: "Bangalore", status: "suspended", posts: 12, joined: "2026-01-20", lastActive: "3 days ago" },
  { id: 4, username: "CodeWalker", location: "Ahmedabad", status: "active", posts: 156, joined: "2025-10-08", lastActive: "1 hr ago" },
  { id: 5, username: "NeonDrifter", location: "Pune", status: "active", posts: 29, joined: "2026-02-14", lastActive: "12 min ago" },
  { id: 6, username: "ShadowPulse", location: "Chennai", status: "banned", posts: 3, joined: "2026-03-01", lastActive: "1 week ago" },
  { id: 7, username: "VoidEcho", location: "Hyderabad", status: "active", posts: 64, joined: "2025-09-22", lastActive: "30 min ago" },
  { id: 8, username: "GlitchNode", location: "Jaipur", status: "active", posts: 201, joined: "2025-08-05", lastActive: "Just now" },
];

export default function UsersPage() {
  return (
    <AdminLayout>
      <PageHeader title="User Management" description="View, search, and manage platform users">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9 w-64 bg-muted border-border" />
        </div>
      </PageHeader>

      <div className="p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Username</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Location</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Status</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Posts</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Last Active</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-semibold text-primary">{user.username[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{user.location}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                      user.status === "active" ? "bg-success/10 text-success" :
                      user.status === "suspended" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>{user.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{user.posts}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{user.lastActive}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning">
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
