import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const listings = [
  { id: "MKT-001", title: "iPhone 14 Pro - Like New", seller: "CodeWalker", price: "₹52,000", location: "AHMEDABAD", status: "ACTIVE", verified: true },
  { id: "MKT-002", title: "Vintage Record Player", seller: "NeonDrifter", price: "₹8,500", location: "PUNE", status: "PENDING", verified: false },
  { id: "MKT-003", title: "Mountain Bike - Barely Used", seller: "VoidEcho", price: "₹15,000", location: "HYDERABAD", status: "ACTIVE", verified: true },
  { id: "MKT-004", title: "Web Development Services", seller: "GlitchNode", price: "₹500/hr", location: "JAIPUR", status: "ACTIVE", verified: false },
  { id: "MKT-005", title: "Handmade Pottery Set", seller: "SilentFalcon", price: "₹3,200", location: "MUMBAI", status: "FLAGGED", verified: false },
  { id: "MKT-006", title: "Guitar Lessons - Beginner", seller: "MidnightVoice", price: "₹800/ses", location: "BANGALORE", status: "ACTIVE", verified: true },
];

export default function MarketplacePage() {
  return (
    <AdminLayout>
      <PageHeader title="MARKETPLACE MONITOR" description="// LISTING MANAGEMENT CONSOLE">
        <Input placeholder="> SEARCH LISTINGS..." className="w-56 bg-input border-border text-foreground placeholder:text-muted-foreground text-xs" />
      </PageHeader>

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">ACTIVE LISTINGS — {listings.length} ITEMS</div>

          <div className="flex items-center text-[10px] text-muted-foreground tracking-wider pb-2 mb-2 border-b border-border">
            <span className="w-20">ID</span>
            <span className="flex-1">ITEM</span>
            <span className="w-28">SELLER</span>
            <span className="w-24">PRICE</span>
            <span className="w-24">SECTOR</span>
            <span className="w-20">STATUS</span>
            <span className="w-28 text-right">ACTIONS</span>
          </div>

          {listings.map((listing) => (
            <div key={listing.id} className={`flex items-center text-xs py-2 border-b border-border last:border-0 ${listing.status === "FLAGGED" ? "bg-warning/5" : ""}`}>
              <span className="w-20 text-muted-foreground">{listing.id}</span>
              <span className="flex-1 text-foreground">
                {listing.title}
                {listing.verified && <span className="text-foreground ml-1">[✓]</span>}
              </span>
              <span className="w-28 text-muted-foreground">{listing.seller}</span>
              <span className="w-24 text-foreground">{listing.price}</span>
              <span className="w-24 text-muted-foreground">{listing.location}</span>
              <span className={`w-20 ${
                listing.status === "ACTIVE" ? "text-foreground" :
                listing.status === "PENDING" ? "text-warning" : "text-destructive"
              }`}>{listing.status}</span>
              <span className="w-28 text-right space-x-1">
                <button className="text-foreground hover:underline">[OK]</button>
                <button className="text-destructive hover:underline">[DEL]</button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
