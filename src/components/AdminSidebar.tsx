import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingBag,
  AlertTriangle,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Posts", url: "/posts", icon: FileText },
  { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
  { title: "Reports", url: "/reports", icon: AlertTriangle },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-border">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">NearVox</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                isActive
                  ? ""
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
              activeClassName="bg-primary/10 text-primary font-medium glow-border"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-mono font-semibold text-primary">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">TheCaptain</p>
            <p className="text-[10px] text-muted-foreground">System Admin</p>
          </div>
          <button className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
