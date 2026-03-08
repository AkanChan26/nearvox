import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MarketplacePage() {
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*, seller:profiles!marketplace_listings_user_id_fkey(username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleStatusUpdate = async (id: string, status: "active" | "removed") => {
    const { error } = await supabase.from("marketplace_listings").update({ status }).eq("id", id);
    if (error) toast.error("Failed");
    else {
      toast.success(status === "active" ? "Approved" : "Removed");
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="MARKETPLACE MONITOR" description="// LISTING MANAGEMENT CONSOLE" />

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">ACTIVE LISTINGS — {listings?.length ?? 0} ITEMS</div>

          <div className="flex items-center text-[10px] text-muted-foreground tracking-wider pb-2 mb-2 border-b border-border">
            <span className="w-20">ID</span>
            <span className="flex-1">ITEM</span>
            <span className="w-28">SELLER</span>
            <span className="w-24">PRICE</span>
            <span className="w-20">STATUS</span>
            <span className="w-28 text-right">ACTIONS</span>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : listings && listings.length > 0 ? (
            listings.map((listing: any) => (
              <div key={listing.id} className={`flex items-center text-xs py-2 border-b border-border last:border-0 ${listing.status === "flagged" ? "bg-warning/5" : ""}`}>
                <span className="w-20 text-muted-foreground">{listing.id.slice(0, 8)}</span>
                <span className="flex-1 text-foreground">
                  {listing.title}
                  {listing.is_verified && <span className="text-foreground ml-1">[✓]</span>}
                </span>
                <span className="w-28 text-muted-foreground">{listing.seller?.username || "?"}</span>
                <span className="w-24 text-foreground">{listing.price}</span>
                <span className={`w-20 ${
                  listing.status === "active" ? "text-foreground" :
                  listing.status === "pending" ? "text-warning" : "text-destructive"
                }`}>{listing.status?.toUpperCase()}</span>
                <span className="w-28 text-right space-x-1">
                  <button onClick={() => handleStatusUpdate(listing.id, "active")} className="text-foreground hover:underline">[OK]</button>
                  <button onClick={() => handleStatusUpdate(listing.id, "removed")} className="text-destructive hover:underline">[DEL]</button>
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO LISTINGS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
