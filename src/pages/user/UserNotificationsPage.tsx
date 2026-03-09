import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { UserLayout } from "@/components/UserLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Bell, Heart, MessageSquare, Megaphone, FileText,
  AlertTriangle, CheckCheck, Clock, Trash2, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; label: string }> = {
  comment: { icon: MessageSquare, label: "COMMENT" },
  like: { icon: Heart, label: "LIKE" },
  announcement: { icon: Megaphone, label: "ANNOUNCEMENT" },
  new_post: { icon: FileText, label: "NEW POST" },
  report: { icon: AlertTriangle, label: "REPORT" },
};

function getNotificationRoute(n: any, isAdminRoute: boolean): string | null {
  const prefix = isAdminRoute ? "/admin" : "";
  if (!n.related_id) return null;
  switch (n.type) {
    case "comment":
    case "like":
    case "new_post":
      return `${prefix || "/user"}/posts`;
    case "announcement":
      return `${prefix || "/user"}/announcements`;
    case "report":
      return isAdminRoute ? "/reports" : null;
    default:
      return null;
  }
}

export default function UserNotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const Layout = isAdminRoute ? AdminLayout : UserLayout;

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) toast.error("Failed");
    else {
      toast.success("All marked as read");
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    }
  };

  const handleClick = async (n: any) => {
    // Mark as read
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    }
    // Navigate
    const route = getNotificationRoute(n, isAdminRoute);
    if (route) navigate(route);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    }
  };

  const deleteAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) toast.error("Failed");
    else {
      toast.success("All notifications cleared");
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    }
  };

  return (
    <Layout>
      <PageHeader title="NOTIFICATIONS" description={`${unreadCount} UNREAD`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground border border-foreground px-1.5 sm:px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
            >
              <CheckCheck className="h-3 w-3" />
              <span className="hidden sm:inline">MARK ALL READ</span>
              <span className="sm:hidden">READ ALL</span>
            </button>
          )}
          {notifications && notifications.length > 0 && (
            <button
              onClick={deleteAll}
              className="flex items-center gap-1 text-[9px] sm:text-[10px] text-destructive border border-destructive px-1.5 sm:px-2 py-1 hover:bg-destructive hover:text-destructive-foreground transition-none"
            >
              <Trash2 className="h-3 w-3" />
              <span className="hidden sm:inline">CLEAR ALL</span>
              <span className="sm:hidden">CLEAR</span>
            </button>
          )}
        </div>
      </PageHeader>

      <div className="px-3 sm:px-4 py-4 sm:py-6">
        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING</p>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.map((n: any) => {
              const config = TYPE_CONFIG[n.type] || { icon: Bell, label: n.type?.toUpperCase?.() || "NOTIFICATION" };
              const Icon = config.icon;
              const route = getNotificationRoute(n, isAdminRoute);
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left p-2.5 sm:p-3 border transition-none cursor-pointer ${
                    n.is_read
                      ? "border-border opacity-60"
                      : "border-foreground/30 bg-foreground/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                      n.type === "like" ? "text-destructive" :
                      n.type === "report" ? "text-warning" :
                      n.type === "announcement" ? "text-[hsl(var(--admin))]" :
                      "text-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                        <span className="text-[9px] text-muted-foreground tracking-wider">{config.label}</span>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                        )}
                        {route && (
                          <ExternalLink className="h-2 w-2 text-muted-foreground" />
                        )}
                        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-0.5 shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground font-bold leading-tight">{n.title}</p>
                      <p className="text-[10px] sm:text-[11px] text-secondary-foreground truncate">{n.message}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive p-1"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">NO NOTIFICATIONS YET</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
