import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const users = [
  { id: "USR-00001", username: "SilentFalcon", location: "MUMBAI", status: "ACTIVE", posts: 42, lastActive: "00:02:14" },
  { id: "USR-00002", username: "UrbanGhost", location: "DELHI", status: "ACTIVE", posts: 87, lastActive: "00:05:33" },
  { id: "USR-00003", username: "MidnightVoice", location: "BANGALORE", status: "SUSPENDED", posts: 12, lastActive: "72:00:00" },
  { id: "USR-00004", username: "CodeWalker", location: "AHMEDABAD", status: "ACTIVE", posts: 156, lastActive: "01:04:22" },
  { id: "USR-00005", username: "NeonDrifter", location: "PUNE", status: "ACTIVE", posts: 29, lastActive: "00:12:44" },
  { id: "USR-00006", username: "ShadowPulse", location: "CHENNAI", status: "BANNED", posts: 3, lastActive: "168:00:00" },
  { id: "USR-00007", username: "VoidEcho", location: "HYDERABAD", status: "ACTIVE", posts: 64, lastActive: "00:30:11" },
  { id: "USR-00008", username: "GlitchNode", location: "JAIPUR", status: "ACTIVE", posts: 201, lastActive: "00:00:04" },
];

export default function UsersPage() {
  return (
    <AdminLayout>
      <PageHeader title="USER REGISTRY" description="// MANAGE AND MONITOR USER ACCOUNTS">
        <Input placeholder="> SEARCH USER..." className="w-56 bg-input border-border text-foreground placeholder:text-muted-foreground text-xs" />
      </PageHeader>

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">REGISTERED USERS — {users.length} RECORDS</div>

          {/* Table header */}
          <div className="flex items-center text-[10px] text-muted-foreground tracking-wider pb-2 mb-2 border-b border-border">
            <span className="w-24">ID</span>
            <span className="flex-1">HANDLE</span>
            <span className="w-28">SECTOR</span>
            <span className="w-24">STATUS</span>
            <span className="w-16 text-right">POSTS</span>
            <span className="w-24 text-right">LAST SEEN</span>
            <span className="w-32 text-right">ACTIONS</span>
          </div>

          {users.map((user) => (
            <div key={user.id} className="flex items-center text-xs py-2 border-b border-border last:border-0 hover:bg-muted/50 transition-none">
              <span className="w-24 text-muted-foreground">{user.id}</span>
              <span className="flex-1 text-foreground">{user.username}</span>
              <span className="w-28 text-muted-foreground">{user.location}</span>
              <span className={`w-24 ${
                user.status === "ACTIVE" ? "text-foreground" :
                user.status === "SUSPENDED" ? "text-warning" : "text-destructive"
              }`}>{user.status}</span>
              <span className="w-16 text-right text-muted-foreground">{user.posts}</span>
              <span className="w-24 text-right text-muted-foreground">T-{user.lastActive}</span>
              <span className="w-32 text-right space-x-2">
                <button className="text-foreground hover:underline">[VIEW]</button>
                <button className="text-warning hover:underline">[BAN]</button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
