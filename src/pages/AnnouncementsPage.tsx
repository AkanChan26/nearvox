import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const existingAnnouncements = [
  { id: 1, title: "Community Guidelines Update", content: "We've updated our community guidelines. Please review the new rules regarding marketplace conduct.", target: "Global", date: "Mar 7, 2026", status: "active" },
  { id: 2, title: "Maintenance Window", content: "Platform maintenance scheduled for March 10, 2026 from 2:00 AM to 4:00 AM IST.", target: "Global", date: "Mar 6, 2026", status: "active" },
  { id: 3, title: "Mumbai Meetup Event", content: "Join the first NearVox community meetup in Mumbai! Details coming soon.", target: "Mumbai", date: "Mar 5, 2026", status: "expired" },
];

export default function AnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="Announcements" description="Broadcast messages to the NearVox community">
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </PageHeader>

      <div className="p-8 space-y-6">
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 glow-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Create Announcement</h3>
            <div className="space-y-4">
              <Input placeholder="Announcement title" className="bg-muted border-border" />
              <Textarea placeholder="Write your announcement..." className="bg-muted border-border min-h-24 resize-none" />
              <div className="flex items-center justify-between">
                <Input placeholder="Target location (or 'Global')" className="bg-muted border-border w-48" />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowForm(false)} className="text-sm text-muted-foreground">Cancel</Button>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                    <Send className="h-4 w-4 mr-1" /> Publish
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          {existingAnnouncements.map((ann, i) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground">{ann.title}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                      ann.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>{ann.status}</span>
                  </div>
                  <p className="text-sm text-secondary-foreground mb-2">{ann.content}</p>
                  <p className="text-xs text-muted-foreground">Target: {ann.target} • {ann.date}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
