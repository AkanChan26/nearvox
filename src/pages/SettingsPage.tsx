import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Server, Database, Globe, Clock } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: systemInfo } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => {
      const [users, topics, posts, msgs, reports] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("chat_messages").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0,
        topics: topics.count ?? 0,
        posts: posts.count ?? 0,
        messages: msgs.count ?? 0,
        pendingReports: reports.count ?? 0,
      };
    },
  });

  useEffect(() => {
    if (profile) setUsername(profile.username);
  }, [profile]);

  const handleSave = async () => {
    if (!user || !username) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username }).eq("user_id", user.id);
    if (error) {
      toast.error(error.message.includes("unique") ? "Username already taken" : "Failed to save");
    } else {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
    }
    setSaving(false);
  };

  const uptime = (() => {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  })();

  return (
    <AdminLayout>
      <PageHeader title="CONFIGURATION" description="// SYSTEM SETTINGS AND ADMIN PROFILE" />

      <div className="p-3 sm:p-6 max-w-2xl space-y-4 sm:space-y-6">
        {/* Admin Identity */}
        <div className="terminal-box">
          <div className="terminal-header flex items-center gap-2">
            <Shield className="h-3 w-3 text-[hsl(var(--admin))]" />
            <span>ADMIN IDENTITY</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">&gt; ADMIN HANDLE:</p>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-input border border-border text-foreground text-xs sm:text-sm px-3 py-2 focus:outline-none focus:border-foreground"
              />
            </div>
            <div className="terminal-row">
              <span className="terminal-label text-[10px] sm:text-xs">ADMIN EMAIL</span>
              <span className="terminal-dots" />
              <span className="terminal-value text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-none">{user?.email || "—"}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">// This handle appears publicly on all admin interactions</p>
          </div>
        </div>

        {/* System Overview */}
        <div className="terminal-box">
          <div className="terminal-header flex items-center gap-2">
            <Server className="h-3 w-3" />
            <span>SYSTEM OVERVIEW</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            {[
              { label: "USERS", value: systemInfo?.users ?? "—", icon: Globe },
              { label: "TOPICS", value: systemInfo?.topics ?? "—", icon: Database },
              { label: "POSTS", value: systemInfo?.posts ?? "—", icon: Database },
              { label: "MESSAGES", value: systemInfo?.messages ?? "—", icon: Database },
              { label: "PENDING REPORTS", value: systemInfo?.pendingReports ?? "—", icon: Shield, warn: (systemInfo?.pendingReports ?? 0) > 0 },
            ].map((item) => (
              <div key={item.label} className="border border-border p-2 sm:p-3">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground tracking-wider">{item.label}</p>
                <p className={`text-sm sm:text-lg font-bold ${item.warn ? "text-[hsl(var(--warning))]" : "text-foreground"}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="terminal-row">
            <span className="terminal-label text-[9px] sm:text-[10px] flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> SERVER TIME</span>
            <span className="terminal-dots" />
            <span className="terminal-value text-[10px] sm:text-xs">{uptime}</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[10px] sm:text-xs text-foreground border border-border px-3 sm:px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? "[SAVING...]" : "[SAVE CONFIGURATION]"}
        </button>
      </div>
    </AdminLayout>
  );
}
