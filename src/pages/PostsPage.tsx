import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const posts = [
  { id: "PST-89204", author: "SilentFalcon", content: "Anyone know a good café near Marine Drive?", location: "MUMBAI", likes: 24, comments: 8, time: "00:10:22", pinned: false, reported: false, admin: false },
  { id: "PST-89200", author: "TheCaptain", content: "🔔 Welcome to NearVox! Read the community guidelines before posting. Any violations will result in immediate action.", location: "GLOBAL", likes: 342, comments: 56, time: "48:00:00", pinned: true, reported: false, admin: true },
  { id: "PST-89198", author: "UrbanGhost", content: "Traffic is insane on NH-8 today. Avoid if possible.", location: "DELHI", likes: 89, comments: 34, time: "00:25:11", pinned: false, reported: false, admin: false },
  { id: "PST-89195", author: "NeonDrifter", content: "Found an amazing street food stall in Koregaon Park!", location: "PUNE", likes: 56, comments: 12, time: "01:12:45", pinned: false, reported: true, admin: false },
  { id: "PST-89192", author: "TheCaptain", content: "⚠ Reminder: Selling counterfeit items on the marketplace is strictly prohibited. Accounts will be permanently banned.", location: "GLOBAL", likes: 198, comments: 22, time: "72:00:00", pinned: true, reported: false, admin: true },
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
            <div
              key={post.id}
              className={`py-3 border-b last:border-0 ${
                post.admin
                  ? "admin-box my-2 px-3 py-4 border-b-0"
                  : post.reported ? "bg-warning/5 border-border" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                <span>{post.id}</span>
                <span>|</span>
                <span className={post.admin ? "admin-text glow-admin font-bold" : "text-foreground"}>
                  {post.author}
                </span>
                {post.admin && <span className="admin-badge">ADMIN</span>}
                {post.pinned && !post.admin && <span className="text-foreground">[PINNED]</span>}
                {post.admin && <span className="admin-text text-[9px]">[PINNED]</span>}
                {post.reported && <span className="text-warning">[REPORTED]</span>}
                <span>|</span>
                <span>{post.location}</span>
                <span className="ml-auto">T-{post.time}</span>
              </div>

              {post.admin && (
                <p className="text-[10px] admin-text tracking-[0.3em] uppercase mb-1.5">SYSTEM ANNOUNCEMENT</p>
              )}

              <p className={`text-xs mb-1.5 pl-2 border-l ${
                post.admin ? "border-admin-border admin-text/80" : "border-border text-secondary-foreground"
              }`}>
                {post.content}
              </p>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-muted-foreground">LIKES:{post.likes}</span>
                <span className="text-muted-foreground">COMMENTS:{post.comments}</span>
                <span className="ml-auto space-x-2">
                  <button className={`hover:underline ${post.admin ? "admin-text" : "text-foreground"}`}>[PIN]</button>
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
