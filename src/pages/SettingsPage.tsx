import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export default function SettingsPage() {
  const [autoMod, setAutoMod] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <AdminLayout>
      <PageHeader title="CONFIGURATION" description="// SYSTEM SETTINGS AND ADMIN PROFILE" />

      <div className="p-6 max-w-2xl space-y-6">
        {/* Admin Profile */}
        <div className="terminal-box">
          <div className="terminal-header">ADMIN IDENTITY</div>
          <div className="space-y-3">
            <div className="terminal-row">
              <span className="terminal-label w-40">ADMIN HANDLE</span>
              <Input defaultValue="TheCaptain" className="flex-1 bg-input border-border text-foreground text-xs" />
            </div>
            <div className="terminal-row">
              <span className="terminal-label w-40">ADMIN EMAIL</span>
              <Input defaultValue="admin@nearvox.app" className="flex-1 bg-input border-border text-foreground text-xs" />
            </div>
            <p className="text-[10px] text-muted-foreground">// This handle appears publicly on all admin interactions</p>
          </div>
        </div>

        {/* System Config */}
        <div className="terminal-box">
          <div className="terminal-header">SYSTEM CONFIGURATION</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs text-foreground">AUTO-MODERATION</p>
                <p className="text-[10px] text-muted-foreground">// Auto-flag content with profanity</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{autoMod ? "ENABLED" : "DISABLED"}</span>
                <Switch checked={autoMod} onCheckedChange={setAutoMod} />
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-border">
              <div>
                <p className="text-xs text-foreground">MARKETPLACE APPROVAL</p>
                <p className="text-[10px] text-muted-foreground">// Require admin approval for listings</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{approvalRequired ? "ENABLED" : "DISABLED"}</span>
                <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-border">
              <div>
                <p className="text-xs text-foreground">TWO-FACTOR AUTH</p>
                <p className="text-[10px] text-muted-foreground">// Require 2FA for admin login</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{twoFactor ? "ENABLED" : "DISABLED"}</span>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
            </div>
            <div className="flex items-center gap-4 py-1 border-t border-border">
              <span className="text-xs text-foreground">DISCOVERY RADIUS</span>
              <Input defaultValue="50" type="number" className="w-20 bg-input border-border text-foreground text-xs" />
              <span className="text-[10px] text-muted-foreground">KM</span>
            </div>
          </div>
        </div>

        <button className="text-xs text-foreground border border-border px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none">
          [SAVE CONFIGURATION]
        </button>
      </div>
    </AdminLayout>
  );
}
