import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users, FileText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function UserBoardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myMemberships } = useQuery({
    queryKey: ["my-board-memberships", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("board_members")
        .select("board_id")
        .eq("user_id", user!.id);
      return new Set((data || []).map((m: any) => m.board_id));
    },
    enabled: !!user,
  });

  const createBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boards").insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;
      // Auto-join the board
      const { data: board } = await supabase
        .from("boards")
        .select("id")
        .eq("name", name.trim())
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (board) {
        await supabase.from("board_members").insert({
          board_id: board.id,
          user_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Board created!");
      setShowCreate(false);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["my-board-memberships"] });
    },
    onError: () => toast.error("Failed to create board"),
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const deleteBoard = useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase.from("boards").delete().eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Board deleted");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: () => toast.error("Failed to delete board"),
  });

  const filtered = boards?.filter((b: any) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <UserLayout>
      <PageHeader title="BOARDS" description="Community boards for specific topics">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground border border-border px-3 py-2 hover:bg-foreground/5 tracking-wider"
        >
          <Plus className="h-3.5 w-3.5" />
          CREATE
        </button>
      </PageHeader>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
          />
        </div>

        {/* Boards Grid */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((board: any) => {
              const isMember = myMemberships?.has(board.id);
              return (
                <button
                  key={board.id}
                  onClick={() => navigate(`/user/boards/${board.id}`)}
                  className="text-left border border-border bg-card p-4 hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                >
                  <h3 className="text-sm sm:text-base text-foreground group-hover:glow-text tracking-wider font-bold mb-1">
                    {board.name}
                  </h3>
                  {board.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {board.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {board.members_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {board.posts_count} posts
                    </span>
                    {isMember && (
                      <span className="text-foreground text-[10px] tracking-wider ml-auto">JOINED</span>
                    )}
                    {(board.created_by === user?.id || profile?.is_admin) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this board and all its posts?")) deleteBoard.mutate(board.id);
                        }}
                        className="ml-auto text-muted-foreground hover:text-destructive p-1"
                        title="Delete board"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No boards yet. Create the first one!</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="border border-border bg-card p-5 sm:p-6 w-full max-w-md">
            <h2 className="text-base sm:text-lg text-foreground glow-text tracking-wider mb-4">CREATE BOARD</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground tracking-wider block mb-1">BOARD NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bharuch News"
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-wider block mb-1">DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this board about?"
                  rows={3}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 text-xs text-muted-foreground border border-border py-2.5 hover:text-foreground tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => createBoard.mutate()}
                  disabled={!name.trim() || createBoard.isPending}
                  className="flex-1 text-xs text-background bg-foreground py-2.5 hover:bg-foreground/90 tracking-wider disabled:opacity-50"
                >
                  {createBoard.isPending ? "CREATING..." : "CREATE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
