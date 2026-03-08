import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const announcements = [
  { id: "ANN-003", title: "COMMUNITY GUIDELINES UPDATE", content: "We've updated our community guidelines. Review new rules regarding marketplace conduct.", target: "GLOBAL", date: "2026-03-07", status: "ACTIVE", author: "TheCaptain" },
  { id: "ANN-002", title: "MAINTENANCE WINDOW", content: "Platform maintenance scheduled for March 10, 2026 from 02:00 to 04:00 IST.", target: "GLOBAL", date: "2026-03-06", status: "ACTIVE", author: "TheCaptain" },
  { id: "ANN-001", title: "MUMBAI MEETUP EVENT", content: "Join the first NearVox community meetup in Mumbai! Details coming soon.", target: "MUMBAI", date: "2026-03-05", status: "EXPIRED", author: "TheCaptain" },
];

export default function AnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="BROADCASTS" description="// SYSTEM ANNOUNCEMENTS CONSOLE">
        <button onClick={() => setShowForm(!showForm)} className="text-xs admin-text border border-admin-border px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">
          [NEW BROADCAST]
        </button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {showForm && (
          <div className="admin-box p-5">
            <div className="text-xs uppercase tracking-[0.3em] admin-text mb-3 pb-2 border-b border-admin-border">
              COMPOSE BROADCAST — BY: TheCaptain <span className="admin-badge ml-1">ADMIN</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] admin-text mb-1">&gt; TITLE:</p>
                <Input className="bg-input border-admin-border text-foreground text-xs focus:ring-admin" />
              </div>
              <div>
                <p className="text-[10px] admin-text mb-1">&gt; MESSAGE:</p>
                <Textarea className="bg-input border-admin-border text-foreground text-xs min-h-20 resize-none focus:ring-admin" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] admin-text mb-1">&gt; TARGET SECTOR:</p>
                  <Input defaultValue="GLOBAL" className="bg-input border-admin-border text-foreground text-xs w-40" />
                </div>
                <div className="space-x-2">
                  <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">[CANCEL]</button>
                  <button className="text-xs admin-text border border-admin-border px-3 py-1 hover:bg-admin hover:text-admin-foreground transition-none">[TRANSMIT]</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className={`admin-box p-5 ${ann.status === "EXPIRED" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] mb-2">
                <span className="text-muted-foreground">{ann.id}</span>
                <span className="text-muted-foreground">|</span>
                <span className="admin-text glow-admin font-bold">{ann.author}</span>
                <span className="admin-badge">ADMIN</span>
                <span className="text-muted-foreground">|</span>
                <span className={ann.status === "ACTIVE" ? "admin-text" : "text-muted-foreground"}>{ann.status}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">TARGET:{ann.target}</span>
                <span className="ml-auto text-muted-foreground">{ann.date}</span>
              </div>
              <p className="text-[10px] admin-text tracking-[0.3em] uppercase mb-1">SYSTEM ANNOUNCEMENT</p>
              <p className="text-xs admin-text font-bold mb-0.5">{ann.title}</p>
              <p className="text-xs text-secondary-foreground pl-2 border-l border-admin-border">{ann.content}</p>
              <div className="text-right mt-2">
                <button className="text-[10px] text-destructive hover:underline">[REVOKE]</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
