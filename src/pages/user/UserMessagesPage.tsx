import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import {
  Send, Users, User, X, Search, ArrowLeft,
  MessageSquare, Hash, UserPlus, MoreVertical,
  Pencil, Trash2, Ban, SmilePlus, Check, Shield,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { OnlineIndicator } from "@/components/OnlineIndicator";

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
  is_edited: boolean;
  deleted_at: string | null;
};

type MemberProfile = {
  user_id: string;
  username: string;
  anonymous_name: string | null;
  is_admin: boolean;
  avatar: string | null;
};

type ConvoMember = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

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
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showConvoMenu, setShowConvoMenu] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const { isOnline } = useOnlinePresence();

  // ── QUERIES ──
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

  const convoIds = conversations?.map((c) => c.id) || [];

  const { data: allMembers } = useQuery({
    queryKey: ["convo-members", convoIds],
    queryFn: async () => {
      if (convoIds.length === 0) return [];
      const { data } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", convoIds);
      return (data || []) as ConvoMember[];
    },
    enabled: convoIds.length > 0,
  });

  const allMemberUserIds = [...new Set(allMembers?.map((m) => m.user_id) || [])];
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

  const { data: chatMessages } = useQuery({
    queryKey: ["chat-messages", activeConvo],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConvo!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      return (data || []) as ChatMessage[];
    },
    enabled: !!activeConvo,
  });

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

  const { data: lastMessages } = useQuery({
    queryKey: ["last-messages", convoIds],
    queryFn: async () => {
      if (convoIds.length === 0) return {};
      const results: Record<string, ChatMessage> = {};
      for (const cid of convoIds) {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", cid)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) results[cid] = data[0] as ChatMessage;
      }
      return results;
    },
    enabled: convoIds.length > 0,
  });

  // Reactions for active conversation messages
  const msgIds = chatMessages?.map((m) => m.id) || [];
  const { data: reactions } = useQuery({
    queryKey: ["msg-reactions", activeConvo, msgIds.length],
    queryFn: async () => {
      if (msgIds.length === 0) return [];
      const { data } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", msgIds);
      return (data || []) as Reaction[];
    },
    enabled: msgIds.length > 0,
  });

  // Blocked users
  const { data: blockedUsers } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      return data?.map((b: any) => b.blocked_id) || [];
    },
    enabled: !!user,
  });

  // ── UNREAD CHECK ──
  const hasUnread = (convoId: string): boolean => {
    if (!user || !allMembers || !lastMessages) return false;
    const myMembership = allMembers.find(
      (m) => m.conversation_id === convoId && m.user_id === user.id
    );
    const lastMsg = lastMessages[convoId];
    if (!myMembership || !lastMsg) return false;
    if (lastMsg.sender_id === user.id) return false;
    const readAt = myMembership.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
    const msgAt = new Date(lastMsg.created_at).getTime();
    return msgAt > readAt;
  };

  const markAsRead = async (convoId: string) => {
    if (!user) return;
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", convoId)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["convo-members"] });
  };

  // ── REALTIME ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["last-messages"] });
        queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["convo-members"] });
        if (payload.new?.conversation_id === activeConvo || payload.old?.conversation_id === activeConvo) {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConvo] });
          if (payload.new?.sender_id !== user.id && activeConvo) markAsRead(activeConvo);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["msg-reactions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvo]);

  // ── TYPING PRESENCE ──
  useEffect(() => {
    if (!user || !activeConvo) {
      setTypingUsers([]);
      return;
    }
    const channel = supabase.channel(`typing:${activeConvo}`, {
      config: { presence: { key: user.id } },
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const typers: string[] = [];
      for (const [uid, entries] of Object.entries(state)) {
        if (uid !== user.id && Array.isArray(entries) && entries.some((e: any) => e.is_typing)) {
          typers.push(uid);
        }
      }
      setTypingUsers(typers);
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ is_typing: false });
      }
    });
    presenceChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [user, activeConvo]);

  const broadcastTyping = useCallback(() => {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    ch.track({ is_typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      ch.track({ is_typing: false });
    }, 2000);
  }, []);

  // ── READ RECEIPT HELPERS ──
  const getReadStatus = (msg: ChatMessage): "sent" | "delivered" | "read" => {
    if (msg.sender_id !== user?.id) return "sent";
    if (!allMembers || !activeConvo) return "sent";
    const otherMembers = allMembers.filter(
      (m) => m.conversation_id === activeConvo && m.user_id !== user?.id
    );
    if (otherMembers.length === 0) return "sent";
    const allRead = otherMembers.every((m) => {
      const readAt = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
      return readAt >= new Date(msg.created_at).getTime();
    });
    if (allRead) return "read";
    return "delivered";
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { if (activeConvo && user) markAsRead(activeConvo); }, [activeConvo, user]);

  // Close menus on click outside
  useEffect(() => {
    const handler = () => { setContextMenu(null); setShowReactions(null); setShowConvoMenu(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
    const members = allMembers?.filter((m) => m.conversation_id === convo.id) || [];
    const otherMember = members.find((m) => m.user_id !== user?.id);
    if (otherMember) return getDisplayName(otherMember.user_id);
    return "Direct Message";
  };

  const getConvoMemberCount = (convoId: string) =>
    allMembers?.filter((m) => m.conversation_id === convoId).length || 0;

  const getOtherUserId = (convo: Conversation): string | null => {
    if (convo.type !== "direct") return null;
    const members = allMembers?.filter((m) => m.conversation_id === convo.id) || [];
    const other = members.find((m) => m.user_id !== user?.id);
    return other?.user_id || null;
  };

  const isBlocked = (userId: string) => blockedUsers?.includes(userId) || false;

  // ── ACTIONS ──
  const startDm = async (targetUser: MemberProfile) => {
    if (!user) return;
    for (const c of conversations || []) {
      if (c.type !== "direct") continue;
      const members = allMembers?.filter((m) => m.conversation_id === c.id) || [];
      const memberIds = members.map((m) => m.user_id);
      if (memberIds.includes(targetUser.user_id) && memberIds.includes(user.id) && memberIds.length === 2) {
        setActiveConvo(c.id);
        setShowNewDm(false);
        setDmSearch("");
        return;
      }
    }
    const convoId = crypto.randomUUID();
    const { error: convoErr } = await supabase
      .from("conversations")
      .insert({ id: convoId, type: "direct", created_by: user.id });
    if (convoErr) { toast.error("Failed to start chat"); return; }
    const { error: memErr } = await supabase.from("conversation_members").insert([
      { conversation_id: convoId, user_id: user.id },
      { conversation_id: convoId, user_id: targetUser.user_id },
    ]);
    if (memErr) { toast.error("Failed to add members"); return; }
    await queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
    await queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    await queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
    setActiveConvo(convoId);
    setShowNewDm(false);
    setDmSearch("");
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || groupMembers.length === 0) return;
    const convoId = crypto.randomUUID();
    const { error: convoErr } = await supabase
      .from("conversations")
      .insert({ id: convoId, type: "group", name: groupName.trim(), created_by: user.id });
    if (convoErr) { toast.error("Failed to create group"); return; }
    await supabase.from("conversation_members").insert([
      { conversation_id: convoId, user_id: user.id },
      ...groupMembers.map((m) => ({ conversation_id: convoId, user_id: m.user_id })),
    ]);
    await queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
    await queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    await queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
    setActiveConvo(convoId);
    setShowNewGroup(false);
    setGroupName("");
    setGroupMembers([]);
    toast.success("Group created!");
  };

  const addMemberToGroup = async (targetUser: MemberProfile) => {
    if (!activeConvo) return;
    const { error } = await supabase.from("conversation_members").insert({
      conversation_id: activeConvo, user_id: targetUser.user_id,
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
      conversation_id: activeConvo, sender_id: user.id, content: msgText.trim(),
    });
    if (error) toast.error("Failed to send");
    else {
      setMsgText("");
      markAsRead(activeConvo);
      presenceChannelRef.current?.track({ is_typing: false });
    }
    setSending(false);
  };

  const editMessage = async (msgId: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase
      .from("chat_messages")
      .update({ content: editText.trim(), is_edited: true })
      .eq("id", msgId);
    if (error) toast.error("Failed to edit");
    else { setEditingMsg(null); setEditText(""); }
    queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConvo] });
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString(), content: "This message was deleted" })
      .eq("id", msgId);
    if (error) toast.error("Failed to delete");
    queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConvo] });
    queryClient.invalidateQueries({ queryKey: ["last-messages"] });
    setContextMenu(null);
  };

  const deleteConversation = async () => {
    if (!activeConvo || !user) return;
    // Remove self from conversation
    await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", activeConvo)
      .eq("user_id", user.id);
    setActiveConvo(null);
    setShowConvoMenu(false);
    queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["convo-members"] });
    toast.success("Conversation deleted");
  };

  const blockUser = async (userId: string) => {
    if (!user) return;
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id, blocked_id: userId,
    });
    if (error) toast.error("Failed to block");
    else toast.success("User blocked");
    queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    setShowConvoMenu(false);
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;
    await supabase.from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
    toast.success("User unblocked");
    queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    setShowConvoMenu(false);
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions?.find(
      (r) => r.message_id === msgId && r.user_id === user.id && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: msgId, user_id: user.id, emoji,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["msg-reactions"] });
    setShowReactions(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleMsgAction = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ msgId, x: e.clientX, y: e.clientY });
  };

  const activeConversation = conversations?.find((c) => c.id === activeConvo);
  const totalUnread = conversations?.filter((c) => hasUnread(c.id)).length || 0;
  const otherUserId = activeConversation ? getOtherUserId(activeConversation) : null;
  const otherIsBlocked = otherUserId ? isBlocked(otherUserId) : false;

  const getReactionsForMsg = (msgId: string) => {
    if (!reactions) return [];
    const msgReactions = reactions.filter((r) => r.message_id === msgId);
    const grouped: Record<string, { emoji: string; count: number; myReaction: boolean }> = {};
    for (const r of msgReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, myReaction: false };
      grouped[r.emoji].count++;
      if (r.user_id === user?.id) grouped[r.emoji].myReaction = true;
    }
    return Object.values(grouped);
  };

  return (
    <UserLayout>
      <PageHeader title="MESSAGES" description={`DIRECT & GROUP CHATS${totalUnread > 0 ? ` • ${totalUnread} UNREAD` : ""}`} />

      <div className="px-4 sm:px-6 py-4">
        <div className="border border-border flex flex-col md:flex-row" style={{ height: "min(78vh, 620px)", minHeight: "400px" }}>
          {/* ── LEFT: Conversation List ── */}
          <div className={`w-full md:w-80 border-r border-border flex flex-col shrink-0 ${activeConvo ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border flex gap-2">
              <button onClick={() => { setShowNewDm(true); setShowNewGroup(false); }}
                className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-none flex-1 justify-center">
                <User className="h-3.5 w-3.5" /> NEW DM
              </button>
              <button onClick={() => { setShowNewGroup(true); setShowNewDm(false); }}
                className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-none flex-1 justify-center">
                <Users className="h-3.5 w-3.5" /> NEW GROUP
              </button>
            </div>

            {/* New DM Search */}
            {showNewDm && (
              <div className="p-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground">&gt; FIND USER:</p>
                  <button onClick={() => { setShowNewDm(false); setDmSearch(""); }} className="text-muted-foreground hover:text-foreground p-1"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Type anonymous name..."
                    className="w-full bg-input border border-border text-foreground text-[11px] pl-8 pr-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground" autoFocus />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-1 border border-border bg-card max-h-32 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button key={r.user_id} onClick={() => startDm(r)}
                        className="w-full text-left text-[11px] px-3 py-2 hover:bg-foreground/5 text-foreground transition-none flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.anonymous_name || r.username}
                        {isBlocked(r.user_id) && <span className="text-[8px] text-destructive ml-auto">BLOCKED</span>}
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
                  <button onClick={() => { setShowNewGroup(false); setGroupMembers([]); setGroupName(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..."
                  className="w-full bg-input border border-border text-foreground text-[11px] px-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground" />
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input value={groupMemberSearch} onChange={(e) => setGroupMemberSearch(e.target.value)} placeholder="Add members..."
                    className="w-full bg-input border border-border text-foreground text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground" />
                </div>
                {searchResults && searchResults.length > 0 && groupMemberSearch.length >= 2 && (
                  <div className="border border-border bg-card max-h-24 overflow-y-auto">
                    {searchResults.filter((r) => !groupMembers.some((gm) => gm.user_id === r.user_id)).map((r) => (
                      <button key={r.user_id} onClick={() => { setGroupMembers((prev) => [...prev, r]); setGroupMemberSearch(""); }}
                        className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-foreground/5 text-foreground transition-none flex items-center gap-2">
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
                        <button onClick={() => setGroupMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0}
                  className="w-full text-[10px] text-foreground border border-foreground px-2 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-40">
                  [CREATE GROUP — {groupMembers.length + 1} MEMBERS]
                </button>
              </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {convosLoading ? (
                <p className="text-[10px] text-muted-foreground p-3">LOADING CHATS...</p>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((convo) => {
                  const isActive = activeConvo === convo.id;
                  const isGroup = convo.type === "group";
                  const dmOtherId = !isGroup ? getOtherUserId(convo) : null;
                  const lastMsg = lastMessages?.[convo.id];
                  const unread = hasUnread(convo.id);
                  return (
                    <button key={convo.id} onClick={() => setActiveConvo(convo.id)}
                      className={`w-full text-left p-3 border-b border-border transition-none ${isActive ? "bg-foreground/10" : unread ? "bg-foreground/5" : "hover:bg-muted/30"}`}>
                      <div className="flex items-center gap-2.5">
                        {unread && <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
                        {!unread && (isGroup ? <Hash className="h-4 w-4 text-muted-foreground shrink-0" /> : 
                          <div className="relative shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {dmOtherId && <OnlineIndicator isOnline={isOnline(dmOtherId)} size="sm" className="absolute -bottom-0.5 -right-0.5" />}
                          </div>
                        )}
                        <span className={`text-[11px] truncate ${unread ? "text-foreground font-bold" : "text-foreground"}`}>
                          {getConvoDisplayName(convo)}
                        </span>
                        {!isGroup && dmOtherId && isOnline(dmOtherId) && (
                          <span className="text-[9px] text-foreground/60 shrink-0">online</span>
                        )}
                        {isGroup && (() => {
                          const memberIds = allMembers?.filter((m) => m.conversation_id === convo.id).map((m) => m.user_id) || [];
                          const onlineCount = memberIds.filter((uid) => isOnline(uid)).length;
                          return (
                            <span className="text-[9px] text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                              {onlineCount > 0 && <><span className="h-1.5 w-1.5 rounded-full bg-foreground inline-block" />{onlineCount}<span className="text-muted-foreground/60">/</span></>}
                              {getConvoMemberCount(convo.id)}
                            </span>
                          );
                        })()}
                      </div>
                      {lastMsg && (
                        <p className={`text-[10px] truncate mt-1 ml-6 ${unread ? "text-foreground/80" : "text-muted-foreground"}`}>
                          {getDisplayName(lastMsg.sender_id)}: {lastMsg.content.slice(0, 40)}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground/60 ml-6 mt-0.5">
                        {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-[10px] text-muted-foreground">NO CONVERSATIONS YET</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-1">Start a DM or create a group above</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Chat View ── */}
          <div className={`flex-1 flex flex-col min-w-0 ${!activeConvo ? "hidden md:flex" : "flex"}`}>
            {activeConvo && activeConversation ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border flex items-center gap-2.5">
                  <button onClick={() => { setActiveConvo(null); setShowConvoMenu(false); }} className="md:hidden text-muted-foreground hover:text-foreground p-1">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {activeConversation.type === "group" ? <Hash className="h-4 w-4 text-muted-foreground" /> : 
                    <div className="relative">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {otherUserId && <OnlineIndicator isOnline={isOnline(otherUserId)} size="sm" className="absolute -bottom-0.5 -right-0.5" />}
                    </div>
                  }
                  <span className="text-[11px] text-foreground truncate">{getConvoDisplayName(activeConversation)}</span>
                  {activeConversation.type === "direct" && otherUserId && (
                    <span className={`text-[9px] ${isOnline(otherUserId) ? "text-foreground" : "text-muted-foreground"}`}>
                      {isOnline(otherUserId) ? "online" : "offline"}
                    </span>
                  )}
                  {activeConversation.type === "group" && (() => {
                    const onlineCount = activeMembers?.filter((uid: string) => isOnline(uid)).length || 0;
                    return (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                        {activeMembers?.length || 0} members
                        {onlineCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            • <span className="h-1.5 w-1.5 rounded-full bg-foreground inline-block" /> {onlineCount} online
                          </span>
                        )}
                      </span>
                    );
                  })()}
                  <div className="ml-auto flex items-center gap-1 relative">
                    {activeConversation.type === "group" && activeConversation.created_by === user?.id && (
                      <button onClick={(e) => { e.stopPropagation(); setShowAddMember(!showAddMember); setAddMemberSearch(""); }}
                        className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 hover:text-foreground hover:border-foreground transition-none">
                        <UserPlus className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setShowConvoMenu(!showConvoMenu); }}
                      className="text-muted-foreground hover:text-foreground p-0.5">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {showConvoMenu && (
                      <div className="absolute top-full right-0 mt-1 border border-border bg-card z-50 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                        {activeConversation.type === "direct" && otherUserId && (
                          <button onClick={() => otherIsBlocked ? unblockUser(otherUserId) : blockUser(otherUserId)}
                            className="w-full text-left text-[10px] px-3 py-1.5 hover:bg-foreground/5 text-foreground flex items-center gap-2">
                            {otherIsBlocked ? <Shield className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                            {otherIsBlocked ? "UNBLOCK" : "BLOCK USER"}
                          </button>
                        )}
                        <button onClick={deleteConversation}
                          className="w-full text-left text-[10px] px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2">
                          <Trash2 className="h-3 w-3" /> DELETE CHAT
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add member panel */}
                {showAddMember && activeConversation.type === "group" && (
                  <div className="p-2 border-b border-border bg-muted/20">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input value={addMemberSearch} onChange={(e) => setAddMemberSearch(e.target.value)} placeholder="Search user to add..."
                        className="w-full bg-input border border-border text-foreground text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground" autoFocus />
                    </div>
                    {searchResults && searchResults.length > 0 && addMemberSearch.length >= 2 && (
                      <div className="mt-1 border border-border bg-card max-h-24 overflow-y-auto">
                        {searchResults.filter((r) => !activeMembers?.includes(r.user_id)).map((r) => (
                          <button key={r.user_id} onClick={() => addMemberToGroup(r)}
                            className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-foreground/5 text-foreground transition-none">
                            + {r.anonymous_name || r.username}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {otherIsBlocked && (
                    <div className="text-center py-2">
                      <p className="text-[9px] text-destructive/70 border border-destructive/20 inline-block px-3 py-1">⚠ YOU HAVE BLOCKED THIS USER</p>
                    </div>
                  )}
                  {chatMessages && chatMessages.length > 0 ? (
                    chatMessages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      const msgReactions = getReactionsForMsg(msg.id);
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group relative`}>
                          <div className="relative max-w-[70%]">
                            {/* Hover actions */}
                            <div className={`absolute top-0 ${isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1`}>
                              <button onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg.id ? null : msg.id); }}
                                className="text-muted-foreground hover:text-foreground p-0.5">
                                <SmilePlus className="h-3 w-3" />
                              </button>
                              {isMine && (
                                <button onClick={(e) => handleMsgAction(e, msg.id)}
                                  className="text-muted-foreground hover:text-foreground p-0.5">
                                  <MoreVertical className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Reaction picker */}
                            {showReactions === msg.id && (
                              <div className={`absolute bottom-full ${isMine ? "right-0" : "left-0"} mb-1 border border-border bg-card flex gap-0.5 p-1 z-50`}
                                onClick={(e) => e.stopPropagation()}>
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                    className="hover:bg-foreground/10 px-1 py-0.5 text-sm">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Message bubble */}
                            <div className={`${isMine ? "bg-foreground/10 border-foreground/20" : "bg-muted/30 border-border"} border px-2 py-1`}>
                              {!isMine && (
                                <p className="text-[9px] text-muted-foreground mb-0.5 font-mono">{getDisplayName(msg.sender_id)}</p>
                              )}
                              {editingMsg === msg.id ? (
                                <div className="flex items-center gap-1">
                                  <input value={editText} onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") editMessage(msg.id); if (e.key === "Escape") { setEditingMsg(null); setEditText(""); } }}
                                    className="flex-1 bg-transparent text-[11px] text-foreground focus:outline-none border-b border-foreground/30" autoFocus />
                                  <button onClick={() => editMessage(msg.id)} className="text-foreground"><Check className="h-3 w-3" /></button>
                                  <button onClick={() => { setEditingMsg(null); setEditText(""); }} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <p className="text-[11px] text-foreground break-words leading-tight">{msg.content}</p>
                              )}
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                {msg.is_edited && <span className="text-[7px] text-muted-foreground/50 italic">edited</span>}
                                <p className="text-[8px] text-muted-foreground/60">
                                  {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                </p>
                                {msg.sender_id === user?.id && (() => {
                                  const status = getReadStatus(msg);
                                  return status === "read" ? (
                                    <CheckCheck className="h-3 w-3 text-primary" />
                                  ) : status === "delivered" ? (
                                    <CheckCheck className="h-3 w-3 text-muted-foreground/60" />
                                  ) : (
                                    <Check className="h-3 w-3 text-muted-foreground/60" />
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Reactions display */}
                            {msgReactions.length > 0 && (
                              <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                {msgReactions.map((r) => (
                                  <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)}
                                    className={`text-[10px] px-1 py-0 border ${r.myReaction ? "border-foreground/40 bg-foreground/10" : "border-border bg-muted/20"} hover:bg-foreground/10`}>
                                    {r.emoji} {r.count > 1 && <span className="text-[8px]">{r.count}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
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

                {/* Context menu */}
                {contextMenu && (
                  <div className="fixed border border-border bg-card z-50 min-w-[120px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => {
                      const msg = chatMessages?.find((m) => m.id === contextMenu.msgId);
                      if (msg) { setEditingMsg(msg.id); setEditText(msg.content); }
                      setContextMenu(null);
                    }} className="w-full text-left text-[10px] px-3 py-1.5 hover:bg-foreground/5 text-foreground flex items-center gap-2">
                      <Pencil className="h-3 w-3" /> EDIT
                    </button>
                    <button onClick={() => deleteMessage(contextMenu.msgId)}
                      className="w-full text-left text-[10px] px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2">
                      <Trash2 className="h-3 w-3" /> DELETE
                    </button>
                  </div>
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="px-3 py-1 border-t border-border">
                    <p className="text-[9px] text-muted-foreground animate-pulse">
                      {typingUsers.map(getDisplayName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                    </p>
                  </div>
                )}

                {/* Input */}
                <div className="p-2 border-t border-border flex gap-2">
                  {otherIsBlocked ? (
                    <p className="flex-1 text-[10px] text-muted-foreground text-center py-1.5">UNBLOCK USER TO SEND MESSAGES</p>
                  ) : (
                    <>
                      <input value={msgText} onChange={(e) => { setMsgText(e.target.value); broadcastTyping(); }} onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-input border border-border text-foreground text-[11px] px-3 py-1.5 focus:outline-none focus:border-foreground placeholder:text-muted-foreground" />
                      <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                        className="text-foreground border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-40">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
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
