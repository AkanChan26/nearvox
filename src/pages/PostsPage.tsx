import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const posts = [
  { id: "PST-89204", author: "SilentFalcon", content: "Anyone know a good café near Marine Drive?", location: "MUMBAI", likes: 24, comments: 8, time: "00:10:22", pinned: false, reported: false, admin: false },
  { id: "PST-89200", author: "ADMIN", content: "🔔 Welcome to NearVox! Read the community guidelines.", location: "GLOBAL", likes: 342, comments: 56, time: "48:00:00", pinned: true, reported: false, admin: true },
  { id: "PST-89198", author: "UrbanGhost", content: "Traffic is insane on NH-8 today. Avoid if possible.", location: "DELHI", likes: 89, comments: 34, time: "00:25:11", pinned: false, reported: false, admin: false },
  { id: "PST-89195", author: "NeonDrifter", content: "Found an amazing street food stall in Koregaon Park!", location: "PUNE", likes: 56, comments: 12, time: "01:12:45", pinned: false, reported: true, admin: false },
  { id: "PST-89190", author: "CodeWalker", content: "Any developers here looking for freelance work?", location: "AHMEDABAD", likes: 18, comments: 7, time: "03:22:08", pinned: false, reported: false, admin: false },
  { id: "PST-89185", author: "VoidEcho", content: "Beautiful sunset at Hussain Sagar today", location: "HYDERABAD", likes: 112, comments: 23, time: "05:44:30", pinned: false, reported: false, admin: false },
];

export default function PostsPage() {
  return (
    <AdminLayout>
      <PageHeader title="POST MONITOR" description="// CONTENT MODERATION CONSOLE">
        <Input placeholder="> SEARCH POSTS..." className="w-56 bg-input border-border text-foreground placeholder:text-muted-foreground text-xs" />
      </PageHeader>

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">POST FEED — LATEST ENTRIES</div>

          {posts.map((post) => (
            <div key={post.id} className={`py-3 border-b border-border last:border-0 ${post.reported ? "bg-warning/5" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                <span>{post.id}</span>
                <span>|</span>
                <span className={post.admin ? "text-foreground glow-text" : "text-foreground"}>{post.author}</span>
                {post.admin && <span className="text-foreground">[ADMIN]</span>}
                {post.pinned && <span className="text-foreground">[PINNED]</span>}
                {post.reported && <span className="text-warning">[REPORTED]</span>}
                <span>|</span>
                <span>{post.location}</span>
                <span className="ml-auto">T-{post.time}</span>
              </div>
              <p className="text-xs text-secondary-foreground mb-1.5 pl-2 border-l border-border">{post.content}</p>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-muted-foreground">LIKES:{post.likes}</span>
                <span className="text-muted-foreground">COMMENTS:{post.comments}</span>
                <span className="ml-auto space-x-2">
                  <button className="text-foreground hover:underline">[PIN]</button>
                  <button className="text-warning hover:underline">[FLAG]</button>
                  <button className="text-destructive hover:underline">[DELETE]</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
