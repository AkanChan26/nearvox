import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import {
  Send, Users, User, X, Plus, Search, ArrowLeft,
  MessageSquare, Hash, UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Conversation = {
  id: string;
  type: string;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type MemberProfile = {
  user_id: string;
  username: string;
  anonymous_name: string | null;
  is_admin: boolean;
  avatar: string | null;
};

export default function UserMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [showNewDm, setShowNewDm] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [groupMembers, setGroupMembers] = useState<MemberProfile[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  // ── QUERIES ──

  // My conversations
  const { data: conversations, isLoading: convosLoading } = useQuery({
    queryKey: ["my-conversations", user?.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      if (!memberRows || memberRows.length === 0) return [];
      const convoIds = memberRows.map((m: any) => m.conversation_id);
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convoIds)
        .order("updated_at", { ascending: false });
      return (data || []) as Conversation[];
    },
    enabled: !!user,
  });

  // Members of all my conversations (for display names)
  const convoIds = conversations?.map((c) => c.id) || [];
  const { data: allMembers } = useQuery({
    queryKey: ["convo-members", convoIds],
    queryFn: async () => {
      if (convoIds.length === 0) return [];
      const { data } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convoIds);
      return data || [];
    },
    enabled: convoIds.length > 0,
  });

  // Profiles for members
  const allMemberUserIds = [...new Set(allMembers?.map((m: any) => m.user_id) || [])];
  const { data: memberProfiles } = useQuery({
    queryKey: ["member-profiles", allMemberUserIds],
    queryFn: async () => {
      if (allMemberUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin, avatar")
        .in("user_id", allMemberUserIds);
      return (data || []) as MemberProfile[];
    },
    enabled: allMemberUserIds.length > 0,
  });

  // Active conversation messages
  const { data: chatMessages } = useQuery({
    queryKey: ["chat-messages", activeConvo],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConvo!)
        .order("created_at", { ascending: true });
      return (data || []) as ChatMessage[];
    },
    enabled: !!activeConvo,
  });

  // Active conversation members
  const { data: activeMembers } = useQuery({
    queryKey: ["active-convo-members", activeConvo],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", activeConvo!);
      return data?.map((m: any) => m.user_id) || [];
    },
    enabled: !!activeConvo,
  });

  // Search users for DM / group
  const searchTerm = showNewDm ? dmSearch : showNewGroup ? groupMemberSearch : showAddMember ? addMemberSearch : "";
  const { data: searchResults } = useQuery({
    queryKey: ["search-users-chat", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin, avatar")
        .neq("user_id", user!.id)
        .or(`username.ilike.%${searchTerm}%,anonymous_name.ilike.%${searchTerm}%`)
        .limit(8);
      return (data || []) as MemberProfile[];
    },
    enabled: searchTerm.length >= 2,
  });

  // Last message per conversation (for preview)
  const { data: lastMessages } = useQuery({
    queryKey: ["last-messages", convoIds],
    queryFn: async () => {
      if (convoIds.length === 0) return {};
      // Fetch last message for each conversation
      const results: Record<string, ChatMessage> = {};
      for (const cid of convoIds) {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", cid)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) results[cid] = data[0] as ChatMessage;
      }
      return results;
    },
    enabled: convoIds.length > 0,
  });

  // ── REALTIME ──
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`chat-${activeConvo}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${activeConvo}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConvo] });
        queryClient.invalidateQueries({ queryKey: ["last-messages"] });
        queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── HELPERS ──

  const getProfile = (userId: string): MemberProfile | undefined =>
    memberProfiles?.find((p) => p.user_id === userId);

  const getDisplayName = (userId: string) => {
    if (userId === user?.id) return "YOU";
    const p = getProfile(userId);
    if (!p) return "Unknown";
    return p.is_admin ? `${p.username} [ADMIN]` : p.anonymous_name || p.username;
  };

  const getConvoDisplayName = (convo: Conversation) => {
    if (convo.type === "group") return convo.name || "Unnamed Group";
    // For DM, show the other person's name
    const members = allMembers?.filter((m: any) => m.conversation_id === convo.id) || [];
    const otherMember = members.find((m: any) => m.user_id !== user?.id);
    if (otherMember) return getDisplayName(otherMember.user_id);
    return "Direct Message";
  };

  const getConvoMemberCount = (convoId: string) => {
    return allMembers?.filter((m: any) => m.conversation_id === convoId).length || 0;
  };

  // ── ACTIONS ──

  const startDm = async (targetUser: MemberProfile) => {
    if (!user) return;
    // Check if DM already exists between these two users
    const myConvoIds = conversations?.map((c) => c.id) || [];
    for (const c of conversations || []) {
      if (c.type !== "direct") continue;
      const members = allMembers?.filter((m: any) => m.conversation_id === c.id) || [];
      const memberIds = members.map((m: any) => m.user_id);
      if (memberIds.includes(targetUser.user_id) && memberIds.includes(user.id) && memberIds.length === 2) {
        setActiveConvo(c.id);
        setShowNewDm(false);
        setDmSearch("");
        return;
      }
    }
    // Create new DM
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: user.id })
      .select()
      .single();
    if (convoErr || !convo) { toast.error("Failed to start chat"); return; }
    // Add both members
    const { error: memErr } = await supabase.from("conversation_members").insert([
      { conversation_id: convo.id, user_id: user.id },
      { conversation_id: convo.id, user_id: targetUser.user_id },
    ]);
    if (memErr) { toast.error("Failed to add members"); return; }
    await queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
    await queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    await queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
    setActiveConvo(convo.id);
    setShowNewDm(false);
    setDmSearch("");
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || groupMembers.length === 0) return;
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ type: "group", name: groupName.trim(), created_by: user.id })
      .select()
      .single();
    if (convoErr || !convo) { toast.error("Failed to create group"); return; }
    const membersToAdd = [
      { conversation_id: convo.id, user_id: user.id },
      ...groupMembers.map((m) => ({ conversation_id: convo.id, user_id: m.user_id })),
    ];
    await supabase.from("conversation_members").insert(membersToAdd);
    await queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
    await queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    await queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
    setActiveConvo(convo.id);
    setShowNewGroup(false);
    setGroupName("");
    setGroupMembers([]);
    toast.success("Group created!");
  };

  const addMemberToGroup = async (targetUser: MemberProfile) => {
    if (!activeConvo) return;
    const { error } = await supabase.from("conversation_members").insert({
      conversation_id: activeConvo,
      user_id: targetUser.user_id,
    });
    if (error) { toast.error("Failed to add member"); return; }
    toast.success(`${targetUser.anonymous_name || targetUser.username} added`);
    setShowAddMember(false);
    setAddMemberSearch("");
    queryClient.invalidateQueries({ queryKey: ["active-convo-members"] });
    queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || !msgText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: activeConvo,
      sender_id: user.id,
      content: msgText.trim(),
    });
    if (error) toast.error("Failed to send");
    else setMsgText("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConversation = conversations?.find((c) => c.id === activeConvo);

  // ── RENDER ──

  return (
    <UserLayout>
      <PageHeader title="MESSAGES" description="DIRECT & GROUP CHATS" />

      <div className="px-4 py-4">
        <div className="border border-border flex flex-col md:flex-row" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
          {/* ── LEFT: Conversation List ── */}
          <div className={`w-full md:w-80 border-r border-border flex flex-col shrink-0 ${activeConvo ? "hidden md:flex" : "flex"}`}>
            {/* Actions */}
            <div className="p-2 border-b border-border flex gap-1.5">
              <button
                onClick={() => { setShowNewDm(true); setShowNewGroup(false); }}
                className="flex items-center gap-1 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none flex-1 justify-center"
              >
                <User className="h-3 w-3" /> NEW DM
              </button>
              <button
                onClick={() => { setShowNewGroup(true); setShowNewDm(false); }}
                className="flex items-center gap-1 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none flex-1 justify-center"
              >
                <Users className="h-3 w-3" /> NEW GROUP
              </button>
            </div>

            {/* New DM Search */}
            {showNewDm && (
              <div className="p-2 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-muted-foreground">&gt; FIND USER:</p>
                  <button onClick={() => { setShowNewDm(false); setDmSearch(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Type anonymous name..."
                    className="w-full bg-input border border-border text-foreground text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-1 border border-border bg-card max-h-32 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.user_id}
                        onClick={() => startDm(r)}
                        className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-foreground/5 text-foreground transition-none flex items-center gap-2"
                      >
                        <User className="h-3 w-3 text-muted-foreground" />
                        {r.anonymous_name || r.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Group */}
            {showNewGroup && (
              <div className="p-2 border-b border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">&gt; CREATE GROUP:</p>
                  <button onClick={() => { setShowNewGroup(false); setGroupMembers([]); setGroupName(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full bg-input border border-border text-foreground text-[11px] px-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                />
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    value={groupMemberSearch}
                    onChange={(e) => setGroupMemberSearch(e.target.value)}
                    placeholder="Add members..."
                    className="w-full bg-input border border-border text-foreground text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                  />
                </div>
                {searchResults && searchResults.length > 0 && groupMemberSearch.length >= 2 && (
                  <div className="border border-border bg-card max-h-24 overflow-y-auto">
                    {searchResults
                      .filter((r) => !groupMembers.some((gm) => gm.user_id === r.user_id))
                      .map((r) => (
                        <button
                          key={r.user_id}
                          onClick={() => { setGroupMembers((prev) => [...prev, r]); setGroupMemberSearch(""); }}
                          className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-foreground/5 text-foreground transition-none flex items-center gap-2"
                        >
                          <UserPlus className="h-3 w-3 text-muted-foreground" />
                          {r.anonymous_name || r.username}
                        </button>
                      ))}
                  </div>
                )}
                {groupMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {groupMembers.map((m) => (
                      <span key={m.user_id} className="text-[10px] border border-foreground/30 px-1.5 py-0.5 flex items-center gap-1 text-foreground">
                        {m.anonymous_name || m.username}
                        <button onClick={() => setGroupMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))} className="hover:text-destructive">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={createGroup}
                  disabled={!groupName.trim() || groupMembers.length === 0}
                  className="w-full text-[10px] text-foreground border border-foreground px-2 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-40"
                >
                  [CREATE GROUP — {groupMembers.length + 1} MEMBERS]
                </button>
              </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {convosLoading ? (
                <p className="text-[10px] text-muted-foreground p-3 cursor-blink">LOADING CHATS</p>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((convo) => {
                  const isActive = activeConvo === convo.id;
                  const isGroup = convo.type === "group";
                  const lastMsg = lastMessages?.[convo.id];
                  return (
                    <button
                      key={convo.id}
                      onClick={() => setActiveConvo(convo.id)}
                      className={`w-full text-left p-2.5 border-b border-border transition-none ${
                        isActive ? "bg-foreground/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isGroup ? (
                          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[11px] text-foreground font-mono truncate">
                          {getConvoDisplayName(convo)}
                        </span>
                        {isGroup && (
                          <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                            {getConvoMemberCount(convo.id)}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-5.5">
                          {getDisplayName(lastMsg.sender_id)}: {lastMsg.content.slice(0, 40)}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground/60 ml-5.5 mt-0.5">
                        {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-[10px] text-muted-foreground">NO CONVERSATIONS YET</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Start a DM or create a group</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Chat View ── */}
          <div className={`flex-1 flex flex-col ${!activeConvo ? "hidden md:flex" : "flex"}`}>
            {activeConvo && activeConversation ? (
              <>
                {/* Chat header */}
                <div className="p-2.5 border-b border-border flex items-center gap-2">
                  <button
                    onClick={() => setActiveConvo(null)}
                    className="md:hidden text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {activeConversation.type === "group" ? (
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] text-foreground font-mono">
                    {getConvoDisplayName(activeConversation)}
                  </span>
                  {activeConversation.type === "group" && (
                    <>
                      <span className="text-[9px] text-muted-foreground">
                        {activeMembers?.length || 0} members
                      </span>
                      {activeConversation.created_by === user?.id && (
                        <button
                          onClick={() => { setShowAddMember(!showAddMember); setAddMemberSearch(""); }}
                          className="ml-auto text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 hover:text-foreground hover:border-foreground transition-none"
                        >
                          <UserPlus className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Add member panel */}
                {showAddMember && activeConversation.type === "group" && (
                  <div className="p-2 border-b border-border bg-muted/20">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        value={addMemberSearch}
                        onChange={(e) => setAddMemberSearch(e.target.value)}
                        placeholder="Search user to add..."
                        className="w-full bg-input border border-border text-foreground text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                    {searchResults && searchResults.length > 0 && addMemberSearch.length >= 2 && (
                      <div className="mt-1 border border-border bg-card max-h-24 overflow-y-auto">
                        {searchResults
                          .filter((r) => !activeMembers?.includes(r.user_id))
                          .map((r) => (
                            <button
                              key={r.user_id}
                              onClick={() => addMemberToGroup(r)}
                              className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-foreground/5 text-foreground transition-none"
                            >
                              + {r.anonymous_name || r.username}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages && chatMessages.length > 0 ? (
                    chatMessages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isMine ? "bg-foreground/10 border-foreground/20" : "bg-muted/30 border-border"} border px-2.5 py-1.5`}>
                            {!isMine && (
                              <p className="text-[9px] text-muted-foreground mb-0.5 font-mono">
                                {getDisplayName(msg.sender_id)}
                              </p>
                            )}
                            <p className="text-[11px] text-foreground break-words">{msg.content}</p>
                            <p className="text-[8px] text-muted-foreground/60 mt-0.5 text-right">
                              {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[10px] text-muted-foreground/40">NO MESSAGES YET — START THE CONVERSATION</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-2 border-t border-border flex gap-2">
                  <input
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-input border border-border text-foreground text-[11px] px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !msgText.trim()}
                    className="text-foreground border border-foreground px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-[11px] text-muted-foreground">SELECT A CONVERSATION</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">or start a new DM / group</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
