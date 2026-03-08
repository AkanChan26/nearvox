import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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

  return (
    <AdminLayout>
      <PageHeader title="CONFIGURATION" description="// SYSTEM SETTINGS AND ADMIN PROFILE" />

      <div className="p-6 max-w-2xl space-y-6">
        <div className="terminal-box">
          <div className="terminal-header">ADMIN IDENTITY</div>
          <div className="space-y-3">
            <div className="terminal-row">
              <span className="terminal-label w-40">ADMIN HANDLE</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-input border border-border text-foreground text-xs px-3 py-1.5 focus:outline-none focus:border-foreground"
              />
            </div>
            <div className="terminal-row">
              <span className="terminal-label w-40">ADMIN EMAIL</span>
              <span className="terminal-value text-xs">{user?.email || "—"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">// This handle appears publicly on all admin interactions</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs text-foreground border border-border px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
        >
          {saving ? "[SAVING...]" : "[SAVE CONFIGURATION]"}
        </button>
      </div>
    </AdminLayout>
  );
}
