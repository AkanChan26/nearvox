import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export default function UserSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");

  // Sync form with loaded data
  useEffect(() => {
    if (profile) {
      if (!username && profile.username) setUsername(profile.username);
      if (!location && profile.location) setLocation(profile.location);
      if (!interests && profile.interests) setInterests(profile.interests.join(", "));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    setSaving(true);

    // Check username uniqueness if changed
    if (profile && username.trim() !== profile.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        toast.error("Username already taken");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        location: location.trim() || null,
        interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile-settings"] });
    }
    setSaving(false);
  };

  return (
    <UserLayout>
      <PageHeader title="SETTINGS" description="YOUR PROFILE & PREFERENCES" />

      <div className="px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING PROFILE</p>
        ) : profile ? (
          <>
            {/* Read-only info */}
            <div className="terminal-box">
              <div className="terminal-header">IDENTITY INFO</div>
              <div className="space-y-2">
                <div className="terminal-row">
                  <span className="terminal-label text-[10px]">ANONYMOUS NAME</span>
                  <span className="terminal-dots" />
                  <span className="terminal-value text-xs">{profile.anonymous_name || "N/A"}</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label text-[10px]">MEMBER SINCE</span>
                  <span className="terminal-dots" />
                  <span className="terminal-value text-xs">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="terminal-box">
              <div className="terminal-header">EDIT PROFILE</div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">&gt; USERNAME:</p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">&gt; REGION / SECTOR:</p>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Pune..."
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">&gt; INTERESTS (comma separated):</p>
                  <input
                    type="text"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g. tech, music, gaming..."
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
                >
                  {saving ? "[SAVING...]" : "[SAVE CHANGES]"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">PROFILE NOT FOUND</p>
        )}
      </div>
    </UserLayout>
  );
}
