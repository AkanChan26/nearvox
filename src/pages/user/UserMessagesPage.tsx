import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Send, Users, User, X, Search, ArrowLeft,
  MessageSquare, Hash, UserPlus, MoreVertical,
  Pencil, Trash2, Ban, SmilePlus, Check, Shield,
  CheckCheck, Reply, CornerDownRight, Smile,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
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

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];
const ALL_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉", "💯", "🤔", "😍", "👎", "😡", "🙏", "💀", "✨", "🥺", "😤", "🤣", "😘", "🥰", "😎", "🤩", "😭", "🫡"];


export default function UserMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showConvoMenu, setShowConvoMenu] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const { isOnline } = useAuth();

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

  useEffect(() => {
    const handler = () => { setContextMenu(null); setShowReactions(null); setShowConvoMenu(false); setShowEmojiPicker(false); };
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
    const content = replyTo
      ? `[reply:${replyTo.id}:${replyTo.content.slice(0, 50)}] ${msgText.trim()}`
      : msgText.trim();
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: activeConvo, sender_id: user.id, content,
    });
    if (error) toast.error("Failed to send");
    else {
      setMsgText("");
      setReplyTo(null);
      markAsRead(activeConvo);
      presenceChannelRef.current?.track({ is_typing: false });
    }
    setSending(false);
  };

  const parseReply = (content: string): { replyText: string; mainText: string } | null => {
    const match = content.match(/^\[reply:([^:]+):([^\]]*)\] (.*)$/s);
    if (match) return { replyText: match[2], mainText: match[3] };
    return null;
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return "TODAY";
    if (isYesterday(date)) return "YESTERDAY";
    return format(date, "MMM dd, yyyy").toUpperCase();
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

  const insertEmoji = (emoji: string) => {
    setMsgText((prev) => prev + emoji);
    setShowEmojiPicker(false);
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
    <div className="fixed inset-0 z-30 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,8px)] pb-2.5 border-b border-border bg-card/95 backdrop-blur-sm shrink-0" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}>
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted/30 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <p className="text-xs font-semibold text-foreground tracking-[0.15em]">NEARVOX</p>
        <span className="text-[10px] text-muted-foreground tracking-wider">
          MESSAGES{totalUnread > 0 && <span className="ml-1.5 text-primary font-bold">({totalUnread})</span>}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Conversation List ── */}
        <div className={`w-full md:w-[320px] lg:w-[340px] border-r border-border flex flex-col shrink-0 bg-card/50 ${activeConvo ? "hidden md:flex" : "flex"}`}>
          {/* Action buttons */}
          <div className="p-3 border-b border-border space-y-3">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">CONVERSATIONS</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowNewDm(true); setShowNewGroup(false); }}
                className="flex items-center gap-1.5 text-[10px] text-foreground border border-border px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-colors flex-1 justify-center rounded-md">
                <User className="h-3 w-3" /> NEW DM
              </button>
              <button onClick={() => { setShowNewGroup(true); setShowNewDm(false); }}
                className="flex items-center gap-1.5 text-[10px] text-foreground border border-border px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-colors flex-1 justify-center rounded-md">
                <Users className="h-3 w-3" /> GROUP
              </button>
            </div>
          </div>

          {/* New DM Search */}
          {showNewDm && (
            <div className="px-3 py-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground tracking-wider">FIND USER</p>
                <button onClick={() => { setShowNewDm(false); setDmSearch(""); }} className="text-muted-foreground hover:text-foreground p-1"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Search by name..."
                  className="w-full bg-input border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" autoFocus />
              </div>
              {searchResults && searchResults.length > 0 && (
                <div className="mt-2 border border-border bg-card rounded-md overflow-hidden max-h-36 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button key={r.user_id} onClick={() => startDm(r)}
                      className="w-full text-left text-xs px-3 py-2.5 hover:bg-muted/40 text-foreground flex items-center gap-2.5 border-b border-border/50 last:border-0 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>{r.anonymous_name || r.username}</span>
                      {isBlocked(r.user_id) && <span className="text-[8px] text-destructive ml-auto">BLOCKED</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Group */}
          {showNewGroup && (
            <div className="px-3 py-3 border-b border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground tracking-wider">CREATE GROUP</p>
                <button onClick={() => { setShowNewGroup(false); setGroupMembers([]); setGroupName(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..."
                className="w-full bg-input border border-border text-foreground text-xs px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={groupMemberSearch} onChange={(e) => setGroupMemberSearch(e.target.value)} placeholder="Add members..."
                  className="w-full bg-input border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
              </div>
              {searchResults && searchResults.length > 0 && groupMemberSearch.length >= 2 && (
                <div className="border border-border bg-card rounded-md overflow-hidden max-h-28 overflow-y-auto">
                  {searchResults.filter((r) => !groupMembers.some((gm) => gm.user_id === r.user_id)).map((r) => (
                    <button key={r.user_id} onClick={() => { setGroupMembers((prev) => [...prev, r]); setGroupMemberSearch(""); }}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-muted/40 text-foreground flex items-center gap-2 border-b border-border/50 last:border-0">
                      <UserPlus className="h-3 w-3 text-muted-foreground" />
                      {r.anonymous_name || r.username}
                    </button>
                  ))}
                </div>
              )}
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {groupMembers.map((m) => (
                    <span key={m.user_id} className="text-[10px] bg-muted/40 border border-border rounded-full px-2.5 py-1 flex items-center gap-1.5 text-foreground">
                      {m.anonymous_name || m.username}
                      <button onClick={() => setGroupMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
              <button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0}
                className="w-full text-[10px] text-primary-foreground bg-primary px-3 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 tracking-wider font-medium">
                CREATE GROUP ({groupMembers.length + 1} members)
              </button>
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convosLoading ? (
              <p className="text-xs text-muted-foreground p-5 tracking-wider animate-pulse">Loading chats...</p>
            ) : conversations && conversations.length > 0 ? (
              conversations.map((convo) => {
                const isActive = activeConvo === convo.id;
                const isGroup = convo.type === "group";
                const dmOtherId = !isGroup ? getOtherUserId(convo) : null;
                const lastMsg = lastMessages?.[convo.id];
                const unread = hasUnread(convo.id);
                return (
                  <button key={convo.id} onClick={() => setActiveConvo(convo.id)}
                    className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors ${isActive ? "bg-primary/10 border-l-2 border-l-primary" : unread ? "bg-muted/20" : "hover:bg-muted/10"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-muted/30"}`}>
                          {isGroup ? <Hash className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        {!isGroup && dmOtherId && (
                          <OnlineIndicator isOnline={isOnline(dmOtherId)} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs truncate ${unread ? "text-foreground font-semibold" : "text-foreground"}`}>
                            {getConvoDisplayName(convo)}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 shrink-0 ml-2">
                            {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: false })}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className={`text-[11px] truncate mt-0.5 ${unread ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
                            {lastMsg.sender_id === user?.id ? "You: " : ""}{lastMsg.content.slice(0, 45)}
                          </p>
                        )}
                      </div>
                      {unread && <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />}
                      {isGroup && (
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {getConvoMemberCount(convo.id)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="h-14 w-14 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground opacity-30" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">No conversations yet</p>
                <p className="text-[10px] text-muted-foreground/50">Start a DM or create a group</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat View ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeConvo ? "hidden md:flex" : "flex"}`}>
          {activeConvo && activeConversation ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/90 backdrop-blur-sm shrink-0">
                <button onClick={() => { setActiveConvo(null); setShowConvoMenu(false); }} className="md:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/30">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-muted/30 flex items-center justify-center">
                    {activeConversation.type === "group" ? <Hash className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {activeConversation.type === "direct" && otherUserId && (
                    <OnlineIndicator isOnline={isOnline(otherUserId)} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{getConvoDisplayName(activeConversation)}</p>
                  {activeConversation.type === "direct" && otherUserId && (
                    <p className={`text-[10px] ${isOnline(otherUserId) ? "text-primary" : "text-muted-foreground"}`}>
                      {isOnline(otherUserId) ? "Online" : "Offline"}
                    </p>
                  )}
                  {activeConversation.type === "group" && (
                    <p className="text-[10px] text-muted-foreground">
                      {activeMembers?.length || 0} members
                      {(() => {
                        const onlineCount = activeMembers?.filter((uid: string) => isOnline(uid)).length || 0;
                        return onlineCount > 0 ? ` · ${onlineCount} online` : "";
                      })()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 relative">
                  {activeConversation.type === "group" && activeConversation.created_by === user?.id && (
                    <button onClick={(e) => { e.stopPropagation(); setShowAddMember(!showAddMember); setAddMemberSearch(""); }}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setShowConvoMenu(!showConvoMenu); }}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showConvoMenu && (
                    <div className="absolute top-full right-0 mt-1 border border-border bg-card z-50 min-w-[160px] rounded-lg shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      {activeConversation.type === "direct" && otherUserId && (
                        <button onClick={() => otherIsBlocked ? unblockUser(otherUserId) : blockUser(otherUserId)}
                          className="w-full text-left text-xs px-4 py-2.5 hover:bg-muted/30 text-foreground flex items-center gap-2.5 transition-colors">
                          {otherIsBlocked ? <Shield className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          {otherIsBlocked ? "Unblock" : "Block User"}
                        </button>
                      )}
                      <button onClick={deleteConversation}
                        className="w-full text-left text-xs px-4 py-2.5 hover:bg-destructive/10 text-destructive flex items-center gap-2.5 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Delete Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add member panel */}
              {showAddMember && activeConversation.type === "group" && (
                <div className="p-3 border-b border-border bg-muted/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input value={addMemberSearch} onChange={(e) => setAddMemberSearch(e.target.value)} placeholder="Search user to add..."
                      className="w-full bg-input border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" autoFocus />
                  </div>
                  {searchResults && searchResults.length > 0 && addMemberSearch.length >= 2 && (
                    <div className="mt-2 border border-border bg-card rounded-md overflow-hidden max-h-28 overflow-y-auto">
                      {searchResults.filter((r) => !activeMembers?.includes(r.user_id)).map((r) => (
                        <button key={r.user_id} onClick={() => addMemberToGroup(r)}
                          className="w-full text-left text-xs px-3 py-2 hover:bg-muted/30 text-foreground transition-colors flex items-center gap-2">
                          <UserPlus className="h-3 w-3 text-muted-foreground" />
                          {r.anonymous_name || r.username}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 space-y-1">
                {otherIsBlocked && (
                  <div className="text-center py-3">
                    <p className="text-[10px] text-destructive bg-destructive/10 inline-block px-4 py-1.5 rounded-full">⚠ You have blocked this user</p>
                  </div>
                )}
                {chatMessages && chatMessages.length > 0 ? (
                  chatMessages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const msgReactions = getReactionsForMsg(msg.id);
                    const isGroup = activeConversation?.type === "group";
                    const reply = parseReply(msg.content);
                    const displayContent = reply ? reply.mainText : msg.content;
                    const msgDate = new Date(msg.created_at);
                    const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
                    const showDateSep = !prevMsg || !isSameDay(msgDate, new Date(prevMsg.created_at));
                    const showSender = isGroup && !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id || showDateSep);
                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 border-t border-border/30" />
                            <span className="text-[10px] text-muted-foreground/60 tracking-wider bg-background px-3 py-1 rounded-full border border-border/20">
                              {formatDateSeparator(msgDate)}
                            </span>
                            <div className="flex-1 border-t border-border/30" />
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-[6px] group/msg relative`}>
                          <div className="relative" style={{ maxWidth: "45%" }}>
                            {/* Hover actions */}
                            <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover/msg:opacity-100 flex items-center gap-0.5 px-1 z-20 transition-opacity`}>
                              <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }}
                                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30">
                                <Reply className="h-3 w-3" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg.id ? null : msg.id); }}
                                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30">
                                <SmilePlus className="h-3 w-3" />
                              </button>
                              {isMine && (
                                <button onClick={(e) => handleMsgAction(e, msg.id)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30">
                                  <MoreVertical className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Reaction picker */}
                            {showReactions === msg.id && (
                              <div className={`absolute bottom-full ${isMine ? "right-0" : "left-0"} mb-2 border border-border bg-card grid grid-cols-8 gap-1 p-2 z-50 shadow-xl rounded-xl`}
                                onClick={(e) => e.stopPropagation()}>
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                    className="hover:bg-muted/40 p-1.5 text-base leading-none rounded-md transition-colors">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Sender name */}
                            {showSender && (
                              <p className="text-[10px] text-primary/70 font-medium mb-1 ml-1">{getDisplayName(msg.sender_id)}</p>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`inline-block rounded-[18px] ${
                                isMine
                                  ? "bg-primary/15 border border-primary/20 rounded-br-[4px]"
                                  : "bg-muted/30 border border-border/50 rounded-bl-[4px]"
                              }`}
                            >
                              {/* Reply preview */}
                              {reply && (
                                <div className="px-2.5 pt-2 pb-0">
                                  <div className="border-l-2 border-primary/40 pl-2 py-0.5 rounded-sm bg-muted/20">
                                    <p className="text-[10px] text-muted-foreground truncate">{reply.replyText}</p>
                                  </div>
                                </div>
                              )}
                              <div className="px-2.5 py-1.5">
                                {editingMsg === msg.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input value={editText} onChange={(e) => setEditText(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") editMessage(msg.id); if (e.key === "Escape") { setEditingMsg(null); setEditText(""); } }}
                                      className="flex-1 bg-transparent text-xs text-foreground focus:outline-none border-b border-primary/40" autoFocus />
                                    <button onClick={() => editMessage(msg.id)} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => { setEditingMsg(null); setEditText(""); }} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-end gap-x-2">
                                    <span className="text-[12px] text-foreground break-words leading-snug whitespace-pre-wrap">{displayContent}</span>
                                    <span className="flex items-center gap-1 ml-auto shrink-0">
                                      {msg.is_edited && <span className="text-[8px] text-muted-foreground/40 italic">edited</span>}
                                      <span className="text-[8px] text-muted-foreground/50">{format(msgDate, "hh:mm a")}</span>
                                      {msg.sender_id === user?.id && (() => {
                                        const status = getReadStatus(msg);
                                        return status === "read" ? (
                                          <CheckCheck className="h-2.5 w-2.5 text-primary" />
                                        ) : status === "delivered" ? (
                                          <CheckCheck className="h-2.5 w-2.5 text-muted-foreground/50" />
                                        ) : (
                                          <Check className="h-2.5 w-2.5 text-muted-foreground/50" />
                                        );
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reactions display */}
                            {msgReactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                {msgReactions.map((r) => (
                                  <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)}
                                    className={`text-xs px-2 py-0.5 border rounded-full transition-colors ${r.myReaction ? "border-primary/40 bg-primary/10" : "border-border/40 bg-muted/20"} hover:bg-primary/15`}>
                                    {r.emoji}{r.count > 1 && <span className="text-[9px] ml-0.5 text-muted-foreground">{r.count}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <div className="h-16 w-16 rounded-full bg-muted/15 flex items-center justify-center mx-auto">
                        <MessageSquare className="h-7 w-7 text-muted-foreground opacity-20" />
                      </div>
                      <p className="text-xs text-muted-foreground/50">No messages yet</p>
                      <p className="text-[10px] text-muted-foreground/30">Send a message to start the conversation</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Context menu */}
              {contextMenu && (
                <div className="fixed border border-border bg-card z-50 min-w-[150px] rounded-lg shadow-xl overflow-hidden"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => {
                    const msg = chatMessages?.find((m) => m.id === contextMenu.msgId);
                    if (msg) { setReplyTo(msg); }
                    setContextMenu(null);
                  }} className="w-full text-left text-xs px-4 py-2.5 hover:bg-muted/30 text-foreground flex items-center gap-2.5 transition-colors">
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </button>
                  <button onClick={() => {
                    const msg = chatMessages?.find((m) => m.id === contextMenu.msgId);
                    if (msg) { setEditingMsg(msg.id); setEditText(msg.content); }
                    setContextMenu(null);
                  }} className="w-full text-left text-xs px-4 py-2.5 hover:bg-muted/30 text-foreground flex items-center gap-2.5 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => deleteMessage(contextMenu.msgId)}
                    className="w-full text-left text-xs px-4 py-2.5 hover:bg-destructive/10 text-destructive flex items-center gap-2.5 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="px-5 py-2 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground animate-pulse">
                    {typingUsers.map(getDisplayName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                  </p>
                </div>
              )}

              {/* Reply preview bar */}
              {replyTo && (
                <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center gap-3">
                  <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary/70 font-medium">{getDisplayName(replyTo.sender_id)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{replyTo.content.slice(0, 60)}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded hover:bg-muted/30">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="px-3 sm:px-4 py-3 border-t border-border flex items-center gap-2 bg-card/90 backdrop-blur-sm shrink-0">
                {otherIsBlocked ? (
                  <p className="flex-1 text-xs text-muted-foreground text-center py-2">Unblock user to send messages</p>
                ) : (
                  <>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted/30 transition-colors">
                        <Smile className="h-5 w-5" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 border border-border bg-card grid grid-cols-8 gap-1 p-2.5 z-50 shadow-xl rounded-xl w-[280px]">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button key={emoji} onClick={() => insertEmoji(emoji)}
                              className="hover:bg-muted/40 p-2 text-lg leading-none rounded-md transition-colors text-center">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={msgText} onChange={(e) => { setMsgText(e.target.value); broadcastTyping(); }} onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 bg-muted/20 border border-border text-foreground text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground rounded-full" />
                    <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                      className="bg-primary text-primary-foreground p-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40">
                      <Send className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/5">
              <div className="text-center space-y-4 px-6">
                <div className="h-20 w-20 rounded-full bg-muted/15 flex items-center justify-center mx-auto">
                  <MessageSquare className="h-9 w-9 text-muted-foreground opacity-20" />
                </div>
                <p className="text-sm text-muted-foreground">Select a conversation</p>
                <p className="text-xs text-muted-foreground/40">or start a new DM / group</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
