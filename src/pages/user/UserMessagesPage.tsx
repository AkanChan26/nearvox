import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Send, Users, User, X, Mail } from "lucide-react";

export default function UserMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [msgContent, setMsgContent] = useState("");
  const [sendTo, setSendTo] = useState<"all" | "individual">("all");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{ user_id: string; anonymous_name: string | null; username: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Messages received (personal + broadcast)
  const { data: messages, isLoading } = useQuery({
    queryKey: ["user-messages", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`recipient_id.eq.${user!.id},recipient_id.is.null,sender_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Get sender profiles
  const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])];
  const { data: senderProfiles } = useQuery({
    queryKey: ["message-senders", senderIds],
    queryFn: async () => {
      if (senderIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", senderIds);
      return data || [];
    },
    enabled: senderIds.length > 0,
  });

  // Search users for individual messages
  const { data: searchResults } = useQuery({
    queryKey: ["search-users-msg", recipientSearch],
    queryFn: async () => {
      if (!recipientSearch || recipientSearch.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name")
        .neq("user_id", user!.id)
        .or(`username.ilike.%${recipientSearch}%,anonymous_name.ilike.%${recipientSearch}%`)
        .limit(5);
      return data || [];
    },
    enabled: recipientSearch.length >= 2,
  });

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return "YOU";
    const p = senderProfiles?.find((s) => s.user_id === senderId);
    if (!p) return "Unknown";
    return p.is_admin ? `${p.username} [ADMIN]` : p.anonymous_name || p.username;
  };

  const handleSend = async () => {
    if (!msgContent.trim() || !user) return;
    if (sendTo === "individual" && !selectedRecipient) {
      toast.error("Select a recipient");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: sendTo === "individual" ? selectedRecipient!.user_id : null,
      content: msgContent.trim(),
      is_system: false,
    });
    if (error) {
      toast.error("Failed to send");
    } else {
      toast.success(sendTo === "all" ? "Broadcast sent!" : "Message sent!");
      setMsgContent("");
      setSelectedRecipient(null);
      setShowCompose(false);
      queryClient.invalidateQueries({ queryKey: ["user-messages"] });
    }
    setSending(false);
  };

  return (
    <UserLayout>
      <PageHeader title="MESSAGES" description="INBOX & BROADCASTS" />

      <div className="px-4 py-6 space-y-4">
        {/* Compose Button */}
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 text-[10px] text-foreground border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none"
        >
          <Send className="h-3 w-3" />
          {showCompose ? "[CANCEL]" : "[COMPOSE MESSAGE]"}
        </button>

        {/* Compose Form */}
        {showCompose && (
          <div className="terminal-box">
            <div className="terminal-header">NEW MESSAGE</div>
            <div className="space-y-3">
              {/* Send to toggle */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">&gt; SEND TO:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSendTo("all"); setSelectedRecipient(null); }}
                    className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 border transition-none ${
                      sendTo === "all" ? "border-foreground bg-foreground/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <Users className="h-3 w-3" /> ALL USERS
                  </button>
                  <button
                    onClick={() => setSendTo("individual")}
                    className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 border transition-none ${
                      sendTo === "individual" ? "border-foreground bg-foreground/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <User className="h-3 w-3" /> INDIVIDUAL
                  </button>
                </div>
              </div>

              {/* Recipient search (individual only) */}
              {sendTo === "individual" && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">&gt; RECIPIENT:</p>
                  {selectedRecipient ? (
                    <div className="flex items-center gap-2 border border-foreground px-2 py-1.5 text-[11px] text-foreground">
                      <span>{selectedRecipient.anonymous_name || selectedRecipient.username}</span>
                      <button onClick={() => setSelectedRecipient(null)} className="text-muted-foreground hover:text-destructive ml-auto">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="Search by username or anon name..."
                        className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                      />
                      {searchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 border border-border bg-card z-10 mt-0.5">
                          {searchResults.map((r) => (
                            <button
                              key={r.user_id}
                              onClick={() => { setSelectedRecipient(r); setRecipientSearch(""); }}
                              className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-foreground/5 text-foreground transition-none"
                            >
                              {r.anonymous_name || r.username} <span className="text-muted-foreground">(@{r.username})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Message content */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">&gt; MESSAGE:</p>
                <textarea
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  rows={3}
                  className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none"
                  placeholder="Type your message..."
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !msgContent.trim()}
                className="text-sm text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
              >
                {sending ? "[SENDING...]" : sendTo === "all" ? "[BROADCAST TO ALL]" : "[SEND MESSAGE]"}
              </button>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="terminal-box">
          <div className="terminal-header">INBOX — {messages?.length ?? 0} MESSAGES</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground cursor-blink">LOADING</p>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-1.5">
              {messages.map((msg: any) => {
                const isSystem = msg.is_system;
                const isMine = msg.sender_id === user?.id;
                const isBroadcast = !msg.recipient_id;
                return (
                  <div
                    key={msg.id}
                    className={`p-2 border ${
                      isSystem ? "border-admin-border admin-box" :
                      isMine ? "border-foreground/30 bg-foreground/5" :
                      "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] mb-1">
                      {isSystem ? (
                        <span className="admin-text">SYSTEM</span>
                      ) : (
                        <span className={isMine ? "text-foreground glow-text" : "text-foreground"}>
                          {getSenderName(msg.sender_id)}
                        </span>
                      )}
                      {isBroadcast && !isSystem && (
                        <span className="text-muted-foreground flex items-center gap-0.5">
                          <Users className="h-2.5 w-2.5" /> BROADCAST
                        </span>
                      )}
                      {!isBroadcast && !isSystem && (
                        <span className="text-muted-foreground flex items-center gap-0.5">
                          <Mail className="h-2.5 w-2.5" /> DM
                        </span>
                      )}
                      <span className="text-muted-foreground ml-auto text-[9px]">
                        {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                    </div>
                    <p className={`text-[11px] ${isSystem ? "admin-text/80" : "text-secondary-foreground"}`}>
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">NO MESSAGES</p>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
