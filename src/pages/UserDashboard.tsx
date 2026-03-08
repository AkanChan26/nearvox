import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, LogOut, ChevronRight,
  Terminal, User, TrendingUp, Hash, Plus,
} from "lucide-react";
import { CreateTopicDialog } from "@/components/CreateTopicDialog";
import { TOPIC_CATEGORIES } from "@/lib/categories";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
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

  // Trending topics (most replies in user's region or globally)
  const { data: trendingTopics } = useQuery({
    queryKey: ["trending-topics", profile?.location],
    queryFn: async () => {
      let query = supabase
        .from("topics")
        .select("id, title, replies_count, views_count, category, location")
        .order("replies_count", { ascending: false })
        .limit(5);
      if (profile?.location) {
        query = query.ilike("location", `%${profile.location}%`);
      }
      const { data } = await query;
      if (!data || data.length === 0) {
        const { data: globalData } = await supabase
          .from("topics")
          .select("id, title, replies_count, views_count, category, location")
          .order("replies_count", { ascending: false })
          .limit(5);
        return globalData || [];
      }
      return data;
    },
    enabled: !!profile,
  });

  const { data: recentTopics } = useQuery({
    queryKey: ["user-recent-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, created_at, is_announcement, replies_count, category")
        .order("last_activity_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background relative terminal-grid terminal-flicker">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Terminal Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="h-5 w-5 text-foreground" />
              <p className="text-2xl text-foreground glow-text tracking-[0.3em]">NEARVOX</p>
            </div>
            <p className="text-[10px] text-muted-foreground tracking-[0.5em] ml-7">ANONYMOUS NETWORK</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <User className="h-3 w-3 text-foreground" />
                <p className="text-sm text-foreground glow-text font-bold tracking-wider">
                  {profile?.anonymous_name || "..."}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground tracking-wider">
                {profile?.location || "UNKNOWN"} SECTOR
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 border border-border hover:border-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Category Grid - 10 categories */}
        <div className="mb-6">
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-3">
            &gt; NAVIGATE — SELECT MODULE
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
            {TOPIC_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => navigate(`/user/topics?category=${cat.value}`)}
                  className="text-left p-3 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] text-muted-foreground font-mono">[{cat.cmd}]</span>
                    <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <p className="text-[10px] text-foreground group-hover:glow-text tracking-wider leading-tight">
                    {cat.label.toUpperCase()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trending Section */}
        <div className="border border-border bg-card p-3 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-muted-foreground tracking-[0.3em]">
              TRENDING IN {(profile?.location || "GLOBAL").toUpperCase()}
            </span>
          </div>
          {trendingTopics && trendingTopics.length > 0 ? (
            <div className="space-y-0.5">
              {trendingTopics.map((topic: any) => (
                <button
                  key={topic.id}
                  onClick={() => navigate(`/topic/${topic.id}`)}
                  className="w-full text-left text-[11px] flex items-center gap-2 hover:bg-foreground/5 px-1 py-1 transition-none group"
                >
                  <Hash className="h-2.5 w-2.5 text-foreground shrink-0" />
                  <span className="text-foreground/80 group-hover:text-foreground truncate">{topic.title}</span>
                  <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {topic.replies_count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">NO TRENDING TOPICS YET</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-muted-foreground tracking-[0.3em]">RECENT ACTIVITY</span>
            <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
          </div>
          {recentTopics && recentTopics.length > 0 ? (
            <div className="space-y-0.5">
              {recentTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => navigate(`/topic/${topic.id}`)}
                  className="w-full text-left text-[11px] flex items-center gap-2 hover:bg-foreground/5 px-1 py-0.5 transition-none"
                >
                  <span className="text-muted-foreground shrink-0">
                    [{new Date(topic.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                  </span>
                  <span className={topic.is_announcement ? "admin-text" : "text-foreground/70"}>
                    {topic.is_announcement ? "📢 " : ""}{topic.title}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {topic.replies_count}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground cursor-blink">NO RECENT ACTIVITY</p>
          )}
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground cursor-blink">user@nearvox:~$</p>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground mt-4 tracking-wider text-center">
          // NEARVOX — ANONYMOUS COMMUNITY NETWORK
        </p>
      </div>

      {/* Floating + Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 z-40 h-12 w-12 flex items-center justify-center border border-foreground bg-background hover:bg-foreground hover:text-background transition-none glow-text"
      >
        <Plus className="h-5 w-5" />
      </button>

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
