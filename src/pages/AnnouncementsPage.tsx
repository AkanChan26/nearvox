import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const announcements = [
  { id: "ANN-003", title: "COMMUNITY GUIDELINES UPDATE", content: "We've updated our community guidelines. Review new rules regarding marketplace conduct.", target: "GLOBAL", date: "2026-03-07", status: "ACTIVE" },
  { id: "ANN-002", title: "MAINTENANCE WINDOW", content: "Platform maintenance scheduled for March 10, 2026 from 02:00 to 04:00 IST.", target: "GLOBAL", date: "2026-03-06", status: "ACTIVE" },
  { id: "ANN-001", title: "MUMBAI MEETUP EVENT", content: "Join the first NearVox community meetup in Mumbai! Details coming soon.", target: "MUMBAI", date: "2026-03-05", status: "EXPIRED" },
];

export default function AnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="BROADCASTS" description="// SYSTEM ANNOUNCEMENTS CONSOLE">
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-foreground border border-border px-3 py-1 hover:bg-foreground hover:text-primary-foreground transition-none">
          [NEW BROADCAST]
        </button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {showForm && (
          <div className="terminal-box border-foreground/30">
            <div className="terminal-header">COMPOSE BROADCAST</div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">&gt; TITLE:</p>
                <Input className="bg-input border-border text-foreground text-xs" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">&gt; MESSAGE:</p>
                <Textarea className="bg-input border-border text-foreground text-xs min-h-20 resize-none" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">&gt; TARGET SECTOR:</p>
                  <Input defaultValue="GLOBAL" className="bg-input border-border text-foreground text-xs w-40" />
                </div>
                <div className="space-x-2">
                  <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">[CANCEL]</button>
                  <button className="text-xs text-foreground border border-border px-3 py-1 hover:bg-foreground hover:text-primary-foreground transition-none">[TRANSMIT]</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="terminal-box">
          <div className="terminal-header">BROADCAST HISTORY</div>
          {announcements.map((ann) => (
            <div key={ann.id} className="py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-2 text-[10px] mb-1">
                <span className="text-muted-foreground">{ann.id}</span>
                <span className="text-muted-foreground">|</span>
                <span className={ann.status === "ACTIVE" ? "text-foreground" : "text-muted-foreground"}>{ann.status}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">TARGET:{ann.target}</span>
                <span className="ml-auto text-muted-foreground">{ann.date}</span>
              </div>
              <p className="text-xs text-foreground mb-0.5">{ann.title}</p>
              <p className="text-xs text-secondary-foreground pl-2 border-l border-border">{ann.content}</p>
              <div className="text-right mt-1">
                <button className="text-[10px] text-destructive hover:underline">[REVOKE]</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
