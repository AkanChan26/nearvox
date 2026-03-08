import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.ilike("username", `%${search}%`);
      }
      // Exclude the current admin from the list
      if (user?.id) {
        query = query.neq("user_id", user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleStatusChange = async (userId: string, newStatus: "suspended" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("user_id", userId);
    if (error) {
      toast.error("Failed to update user status");
    } else {
      toast.success(`User ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="USER REGISTRY" description="// MANAGE AND MONITOR USER ACCOUNTS">
        <Input
          placeholder="> SEARCH USER..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 bg-input border-border text-foreground placeholder:text-muted-foreground text-xs"
        />
      </PageHeader>

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">REGISTERED USERS — {users?.length ?? 0} RECORDS</div>

          <div className="flex items-center text-[10px] text-muted-foreground tracking-wider pb-2 mb-2 border-b border-border">
            <span className="w-24">ID</span>
            <span className="flex-1">HANDLE</span>
            <span className="w-28">SECTOR</span>
            <span className="w-24">STATUS</span>
            <span className="w-32 text-right">ACTIONS</span>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : users && users.length > 0 ? (
            users.map((user) => (
              <div key={user.id} className="flex items-center text-xs py-2 border-b border-border last:border-0 hover:bg-muted/50 transition-none">
                <span className="w-24 text-muted-foreground">{user.id.slice(0, 8)}</span>
                <span className={`flex-1 ${user.is_admin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                  {user.username}
                  {user.is_admin && <span className="admin-badge ml-1">ADMIN</span>}
                </span>
                <span className="w-28 text-muted-foreground">{user.location || "—"}</span>
                <span className={`w-24 ${
                  user.status === "active" ? "text-foreground" :
                  user.status === "suspended" ? "text-warning" : "text-destructive"
                }`}>{user.status?.toUpperCase()}</span>
                <span className="w-32 text-right space-x-2">
                  <button className="text-foreground hover:underline">[VIEW]</button>
                  <button onClick={() => handleStatusChange(user.user_id, "suspended")} className="text-warning hover:underline">[SUS]</button>
                  <button onClick={() => handleStatusChange(user.user_id, "banned")} className="text-destructive hover:underline">[BAN]</button>
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO USERS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
