import { useState, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip, X, Image, FileText, Eye, Pencil, Check, Trash2 } from "lucide-react";

export default function AnnouncementsPage() {
  const { user, adminUsername } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("GLOBAL");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async () => {
    if (!title || !content || !user) return;
    setUploading(true);
    let attachmentPaths: string[] = [];
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop();
        const path = `announcements/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("post-attachments").upload(path, file);
        if (!error) attachmentPaths.push(path);
      }
    }
    const { error } = await supabase.from("announcements").insert({
      admin_id: user.id, title, content, target_location: target, attachments: attachmentPaths,
    });
    if (error) toast.error("Failed to create announcement");
    else {
      toast.success("Announcement published");
      setTitle(""); setContent(""); setTarget("GLOBAL"); setSelectedFiles([]); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
    setUploading(false);
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("announcements").update({ is_active: false }).eq("id", id);
    if (error) toast.error("Failed");
    else { toast.success("Announcement revoked"); queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement permanently?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Announcement deleted"); queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }); }
  };

  const handleEdit = (ann: any) => {
    setEditingId(ann.id); setEditTitle(ann.title); setEditContent(ann.content); setEditTarget(ann.target_location);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    const { error } = await supabase.from("announcements").update({
      title: editTitle.trim(), content: editContent.trim(), target_location: editTarget.trim() || "GLOBAL",
    }).eq("id", editingId);
    if (error) toast.error("Failed to update");
    else { toast.success("Announcement updated"); setEditingId(null); queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }); }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

  return (
    <AdminLayout>
      <PageHeader title="BROADCASTS" description="// SYSTEM ANNOUNCEMENTS">
        <button onClick={() => setShowForm(!showForm)} className="text-[9px] sm:text-xs admin-text border border-admin-border px-2 sm:px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">
          [NEW]
        </button>
      </PageHeader>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {showForm && (
          <div className="admin-box p-3 sm:p-5">
            <div className="text-[9px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] admin-text mb-3 pb-2 border-b border-admin-border">
              COMPOSE — BY: {adminUsername || "ADMIN"} <span className="admin-badge ml-1">ADMIN</span>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; TITLE:</p>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input border-admin-border text-foreground text-xs" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; MESSAGE:</p>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="bg-input border-admin-border text-foreground text-xs min-h-20 resize-none" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; ATTACHMENTS:</p>
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1">
                    <Paperclip className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> ATTACH
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden"
                    onChange={(e) => { const files = Array.from(e.target.files || []); setSelectedFiles((prev) => [...prev, ...files]); }} />
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} file(s)` : "Images, PDFs, docs"}
                  </span>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground border border-border px-1.5 py-0.5">
                        {f.type.startsWith("image/") ? <Image className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                        <span className="max-w-[80px] sm:max-w-[100px] truncate">{f.name}</span>
                        <button onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive"><X className="h-2.5 w-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; TARGET:</p>
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} className="bg-input border-admin-border text-foreground text-xs w-28 sm:w-40" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowForm(false); setSelectedFiles([]); }} className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground">[CANCEL]</button>
                  <button onClick={handleSubmit} disabled={uploading} className="text-[10px] sm:text-xs admin-text border border-admin-border px-2 sm:px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none disabled:opacity-50">
                    {uploading ? "[UPLOADING...]" : "[TRANSMIT]"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="terminal-box">
          <div className="terminal-header text-[9px] sm:text-[10px]">BROADCAST HISTORY</div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : announcements && announcements.length > 0 ? (
            announcements.map((ann: any) => {
              const attachments = (ann.attachments as string[]) || [];
              const isEditing = editingId === ann.id;
              return (
                <div key={ann.id} className={`admin-box p-2.5 sm:p-4 my-2 ${!ann.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] mb-2 flex-wrap">
                    <span className="text-muted-foreground hidden sm:inline">{ann.id.slice(0, 8)}</span>
                    <span className="admin-text glow-admin font-bold">{adminUsername || "ADMIN"}</span>
                    <span className="admin-badge text-[7px] sm:text-[8px]">ADMIN</span>
                    <span className={ann.is_active ? "admin-text" : "text-muted-foreground"}>{ann.is_active ? "ACTIVE" : "REVOKED"}</span>
                    <span className="text-muted-foreground hidden sm:inline">TARGET:{ann.target_location}</span>
                    <span className="ml-auto text-muted-foreground">{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-2">
                      <div>
                        <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; TITLE:</p>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-input border-admin-border text-foreground text-xs" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; MESSAGE:</p>
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-input border-admin-border text-foreground text-xs min-h-16 resize-none" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] admin-text mb-1">&gt; TARGET:</p>
                        <Input value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="bg-input border-admin-border text-foreground text-xs w-28 sm:w-40" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-[9px] sm:text-[10px] text-muted-foreground hover:text-foreground">[CANCEL]</button>
                        <button onClick={handleSaveEdit} className="text-[9px] sm:text-[10px] admin-text border border-admin-border px-2 sm:px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">[SAVE]</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[9px] sm:text-[10px] admin-text tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-1">SYSTEM ANNOUNCEMENT</p>
                      <p className="text-[10px] sm:text-xs admin-text font-bold mb-0.5">{ann.title}</p>
                      <p className="text-[10px] sm:text-xs text-secondary-foreground pl-2 border-l border-admin-border">{ann.content}</p>
                    </>
                  )}

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {attachments.map((path, i) => {
                        const url = getPublicUrl(path);
                        if (isImage(path)) {
                          return (
                            <button key={i} onClick={() => setPreviewUrl(url)} className="relative group border border-border overflow-hidden w-12 h-12 sm:w-16 sm:h-16">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                <Eye className="h-3 w-3 text-foreground" />
                              </div>
                            </button>
                          );
                        }
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground border border-border px-1.5 sm:px-2 py-1 hover:bg-foreground/5">
                            <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="max-w-[60px] sm:max-w-[100px] truncate">{path.split("/").pop()}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                      <button onClick={() => handleEdit(ann)} className="text-[9px] sm:text-[10px] admin-text hover:underline flex items-center gap-0.5 sm:gap-1">
                        <Pencil className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> EDIT
                      </button>
                      {ann.is_active && (
                        <button onClick={() => handleRevoke(ann.id)} className="text-[9px] sm:text-[10px] text-muted-foreground hover:underline">REVOKE</button>
                      )}
                      <button onClick={() => handleDelete(ann.id)} className="text-[9px] sm:text-[10px] text-destructive hover:underline flex items-center gap-0.5 sm:gap-1 ml-auto">
                        <Trash2 className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> DEL
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO ANNOUNCEMENTS FOUND</p>
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain border border-border" />
        </div>
      )}
    </AdminLayout>
  );
}
