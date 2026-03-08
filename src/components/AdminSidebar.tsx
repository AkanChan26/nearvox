import {
  LayoutDashboard, Users, FileText, ShoppingBag,
  AlertTriangle, Megaphone, BarChart3, Settings, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "DASHBOARD", url: "/", icon: LayoutDashboard, cmd: "01" },
  { title: "USERS", url: "/users", icon: Users, cmd: "02" },
  { title: "POSTS", url: "/posts", icon: FileText, cmd: "03" },
  { title: "MARKETPLACE", url: "/marketplace", icon: ShoppingBag, cmd: "04" },
  { title: "REPORTS", url: "/reports", icon: AlertTriangle, cmd: "05" },
  { title: "ANNOUNCEMENTS", url: "/announcements", icon: Megaphone, cmd: "06" },
  { title: "ANALYTICS", url: "/analytics", icon: BarChart3, cmd: "07" },
  { title: "SETTINGS", url: "/settings", icon: Settings, cmd: "08" },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, adminUsername, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <p className="text-foreground text-lg glow-text tracking-widest">NEARVOX</p>
        <p className="text-[10px] text-muted-foreground tracking-[0.4em] mt-0.5">ADMIN TERMINAL v1.0</p>
      </div>

      <div className="px-4 py-2 border-b border-sidebar-border">
        <p className="text-[10px] text-muted-foreground">STATUS: <span className="text-foreground">ONLINE</span></p>
        <p className="text-[10px] text-muted-foreground">SESSION: <span className="text-foreground">ACTIVE</span></p>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        <p className="px-4 text-[10px] text-muted-foreground tracking-[0.3em] mb-2">COMMAND MENU</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-2 px-4 py-1.5 text-sm transition-none ${
                isActive ? "" : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
              activeClassName="bg-foreground text-primary-foreground"
            >
              <span className="text-[10px] opacity-60">[{item.cmd}]</span>
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs admin-text glow-admin font-bold">{adminUsername || "USER"}</p>
              {isAdmin && <span className="admin-badge">ADMIN</span>}
            </div>
            <p className="text-[10px] text-muted-foreground">ROOT ACCESS</p>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
