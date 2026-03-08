import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, Clock, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UserMarketplacePage() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["user-marketplace"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const creatorIds = [...new Set(listings?.map((l) => l.user_id) || [])];
  const { data: creators } = useQuery({
    queryKey: ["listing-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, anonymous_name")
        .in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const getCreatorName = (userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    return creator?.anonymous_name || "Anonymous";
  };

  return (
    <UserLayout>
      <PageHeader title="MARKETPLACE" description="LOCAL LISTINGS & DEALS" />

      <div className="px-4 py-6">
        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {listings?.length ?? 0} ACTIVE LISTINGS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">SCANNING LISTINGS</p>
        ) : listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-3 border border-border hover:border-foreground/30 transition-none"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm text-foreground">{listing.title}</p>
                  <span className="text-xs text-foreground glow-text shrink-0 flex items-center gap-0.5">
                    <DollarSign className="h-3 w-3" />
                    {listing.price}
                  </span>
                </div>
                {listing.description && (
                  <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{listing.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{getCreatorName(listing.user_id)}</span>
                  {listing.location && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{listing.location}</span>
                  )}
                  <span className="flex items-center gap-0.5 ml-auto">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <p className="text-xs text-muted-foreground mb-2">NO LISTINGS FOUND</p>
            <p className="text-[10px] text-muted-foreground">The marketplace is empty for now</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
