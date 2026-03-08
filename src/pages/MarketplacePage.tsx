import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Star } from "lucide-react";
import { motion } from "framer-motion";

const listings = [
  { id: 1, title: "iPhone 14 Pro - Like New", seller: "CodeWalker", price: "₹52,000", location: "Ahmedabad", status: "active", verified: true },
  { id: 2, title: "Vintage Record Player", seller: "NeonDrifter", price: "₹8,500", location: "Pune", status: "pending", verified: false },
  { id: 3, title: "Mountain Bike - Barely Used", seller: "VoidEcho", price: "₹15,000", location: "Hyderabad", status: "active", verified: true },
  { id: 4, title: "Web Development Services", seller: "GlitchNode", price: "₹500/hr", location: "Jaipur", status: "active", verified: false },
  { id: 5, title: "Handmade Pottery Set", seller: "SilentFalcon", price: "₹3,200", location: "Mumbai", status: "flagged", verified: false },
  { id: 6, title: "Guitar Lessons - Beginner", seller: "MidnightVoice", price: "₹800/session", location: "Bangalore", status: "active", verified: true },
];

export default function MarketplacePage() {
  return (
    <AdminLayout>
      <PageHeader title="Marketplace" description="Review listings and manage marketplace activity">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search listings..." className="pl-9 w-64 bg-muted border-border" />
        </div>
      </PageHeader>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-5 hover:glow-border transition-all duration-300 ${listing.status === "flagged" ? "border-warning/30" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded ${
                  listing.status === "active" ? "bg-success/10 text-success" :
                  listing.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>{listing.status}</span>
                {listing.verified && <Star className="h-4 w-4 text-primary fill-primary/20" />}
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">{listing.title}</h3>
              <p className="text-lg font-mono font-semibold text-primary mb-2">{listing.price}</p>
              <p className="text-xs text-muted-foreground">by {listing.seller} • {listing.location}</p>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-success hover:text-success hover:bg-success/10 flex-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 flex-1">
                  <XCircle className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
