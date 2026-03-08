import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pin, Trash2, Flag } from "lucide-react";
import { motion } from "framer-motion";

const posts = [
  { id: 1, author: "SilentFalcon", content: "Anyone know a good café near Marine Drive? Looking for a quiet workspace.", location: "Mumbai", likes: 24, comments: 8, time: "10 min ago", pinned: false, reported: false },
  { id: 2, author: "ADMIN", content: "🔔 Welcome to NearVox! Please read the community guidelines before posting.", location: "Global", likes: 342, comments: 56, time: "2 days ago", pinned: true, reported: false },
  { id: 3, author: "UrbanGhost", content: "Traffic is insane on NH-8 today. Avoid if possible.", location: "Delhi", likes: 89, comments: 34, time: "25 min ago", pinned: false, reported: false },
  { id: 4, author: "NeonDrifter", content: "Found an amazing street food stall in Koregaon Park!", location: "Pune", likes: 56, comments: 12, time: "1 hr ago", pinned: false, reported: true },
  { id: 5, author: "CodeWalker", content: "Any developers here looking for freelance work? DM me.", location: "Ahmedabad", likes: 18, comments: 7, time: "3 hr ago", pinned: false, reported: false },
  { id: 6, author: "VoidEcho", content: "Beautiful sunset at Hussain Sagar today 🌅", location: "Hyderabad", likes: 112, comments: 23, time: "5 hr ago", pinned: false, reported: false },
];

export default function PostsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Post Moderation" description="Review, moderate, and manage all platform posts">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search posts..." className="pl-9 w-64 bg-muted border-border" />
        </div>
      </PageHeader>

      <div className="p-8 space-y-3">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-5 ${post.pinned ? "glow-border" : ""} ${post.reported ? "border-warning/30" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${post.author === "ADMIN" ? "text-primary" : "text-foreground"}`}>
                    {post.author}
                  </span>
                  {post.author === "ADMIN" && (
                    <span className="text-[9px] uppercase tracking-wider font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">Admin</span>
                  )}
                  {post.pinned && (
                    <span className="text-[9px] uppercase tracking-wider font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">Pinned</span>
                  )}
                  {post.reported && (
                    <span className="text-[9px] uppercase tracking-wider font-mono bg-warning/10 text-warning px-1.5 py-0.5 rounded">Reported</span>
                  )}
                  <span className="text-xs text-muted-foreground">• {post.location} • {post.time}</span>
                </div>
                <p className="text-sm text-secondary-foreground">{post.content}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-muted-foreground">{post.likes} likes</span>
                  <span className="text-xs text-muted-foreground">{post.comments} comments</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Pin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning">
                  <Flag className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </AdminLayout>
  );
}
