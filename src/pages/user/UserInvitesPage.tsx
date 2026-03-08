import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { InviteTicketPanel } from "@/components/InviteTicketPanel";

export default function UserInvitesPage() {
  return (
    <UserLayout>
      <PageHeader title="INVITES" description="MANAGE YOUR INVITE TICKETS" />
      <div className="px-4 py-6">
        <InviteTicketPanel onClose={() => {}} embedded />
      </div>
    </UserLayout>
  );
}
