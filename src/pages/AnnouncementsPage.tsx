import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const { user, adminUsername } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("GLOBAL");

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, admin:profiles!announcements_admin_id_fkey(username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async () => {
    if (!title || !content || !user) return;
    const { error } = await supabase.from("announcements").insert({
      admin_id: user.id,
      title,
      content,
      target_location: target,
    });
    if (error) {
      toast.error("Failed to create announcement");
    } else {
      toast.success("Announcement published");
      setTitle("");
      setContent("");
      setTarget("GLOBAL");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("announcements").update({ is_active: false }).eq("id", id);
    if (error) toast.error("Failed");
    else {
      toast.success("Announcement revoked");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="BROADCASTS" description="// SYSTEM ANNOUNCEMENTS CONSOLE">
        <button onClick={() => setShowForm(!showForm)} className="text-xs admin-text border border-admin-border px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">
          [NEW BROADCAST]
        </button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {showForm && (
          <div className="admin-box p-5">
            <div className="text-xs uppercase tracking-[0.3em] admin-text mb-3 pb-2 border-b border-admin-border">
              COMPOSE BROADCAST — BY: {adminUsername || "ADMIN"} <span className="admin-badge ml-1">ADMIN</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] admin-text mb-1">&gt; TITLE:</p>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input border-admin-border text-foreground text-xs" />
              </div>
              <div>
                <p className="text-[10px] admin-text mb-1">&gt; MESSAGE:</p>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="bg-input border-admin-border text-foreground text-xs min-h-20 resize-none" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] admin-text mb-1">&gt; TARGET SECTOR:</p>
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} className="bg-input border-admin-border text-foreground text-xs w-40" />
                </div>
                <div className="space-x-2">
                  <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">[CANCEL]</button>
                  <button onClick={handleSubmit} className="text-xs admin-text border border-admin-border px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">[TRANSMIT]</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="terminal-box">
          <div className="terminal-header">BROADCAST HISTORY</div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : announcements && announcements.length > 0 ? (
            announcements.map((ann: any) => (
              <div key={ann.id} className={`admin-box p-4 my-2 ${!ann.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2 text-[10px] mb-2">
                  <span className="text-muted-foreground">{ann.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="admin-text glow-admin font-bold">{ann.admin?.username || "ADMIN"}</span>
                  <span className="admin-badge">ADMIN</span>
                  <span className="text-muted-foreground">|</span>
                  <span className={ann.is_active ? "admin-text" : "text-muted-foreground"}>{ann.is_active ? "ACTIVE" : "REVOKED"}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">TARGET:{ann.target_location}</span>
                  <span className="ml-auto text-muted-foreground">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[10px] admin-text tracking-[0.3em] uppercase mb-1">SYSTEM ANNOUNCEMENT</p>
                <p className="text-xs admin-text font-bold mb-0.5">{ann.title}</p>
                <p className="text-xs text-secondary-foreground pl-2 border-l border-admin-border">{ann.content}</p>
                {ann.is_active && (
                  <div className="text-right mt-2">
                    <button onClick={() => handleRevoke(ann.id)} className="text-[10px] text-destructive hover:underline">[REVOKE]</button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO ANNOUNCEMENTS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
