import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Bell, Heart, MessageSquare, Megaphone, FileText,
  AlertTriangle, CheckCheck, Clock,
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

export default function UserNotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
  };

  return (
    <UserLayout>
      <PageHeader title="NOTIFICATIONS" description={`${unreadCount} UNREAD`}>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
          >
            <CheckCheck className="h-3 w-3" />
            MARK ALL READ
          </button>
        )}
      </PageHeader>

      <div className="px-4 py-6">
        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING</p>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.map((n: any) => {
              const config = TYPE_CONFIG[n.type] || { icon: Bell, label: n.type.toUpperCase() };
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left p-3 border transition-none ${
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] text-muted-foreground tracking-wider">{config.label}</span>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                        )}
                        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground font-bold">{n.title}</p>
                      <p className="text-[11px] text-secondary-foreground truncate">{n.message}</p>
                    </div>
                  </div>
                </button>
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
    </UserLayout>
  );
}
