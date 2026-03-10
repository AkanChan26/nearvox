import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { Megaphone } from "lucide-react";

export default function UserAnnouncementsPage() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["user-all-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <UserLayout>
      <PageHeader title="ANNOUNCEMENTS" description="SYSTEM BROADCASTS" />

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-2 sm:space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING</p>
        ) : announcements && announcements.length > 0 ? (
          announcements.map((ann: any) => (
            <div key={ann.id} className="admin-box p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                <Megaphone className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[hsl(var(--admin))]" />
                <span className="text-[8px] sm:text-[10px] admin-text tracking-[0.2em] sm:tracking-[0.3em]">BROADCAST</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground ml-auto">
                  {new Date(ann.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[8px] sm:text-[10px] admin-text tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1">TARGET: {ann.target_location}</p>
              <p className="text-[10px] sm:text-xs admin-text font-bold mb-0.5 sm:mb-1">{ann.title}</p>
              <p className="text-[10px] sm:text-xs text-secondary-foreground pl-2 border-l border-admin-border">{ann.content}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">NO ANNOUNCEMENTS</p>
        )}
      </div>
    </UserLayout>
  );
}
