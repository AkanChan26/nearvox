import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Settings" description="Platform configuration and admin preferences" />

      <div className="p-8 max-w-2xl space-y-6">
        {/* Admin Profile */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Admin Profile</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Admin Username</Label>
              <Input defaultValue="TheCaptain" className="bg-muted border-border" />
              <p className="text-[10px] text-muted-foreground mt-1">This username appears publicly when you interact with users.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Admin Email</Label>
              <Input defaultValue="admin@nearvox.app" className="bg-muted border-border" />
            </div>
          </div>
        </motion.div>

        {/* Platform Settings */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform Settings</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Auto-moderation</p>
                <p className="text-xs text-muted-foreground">Automatically flag content with profanity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Marketplace Approval</p>
                <p className="text-xs text-muted-foreground">Require admin approval for new listings</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Require 2FA for admin login</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Discovery Radius (km)</Label>
              <Input defaultValue="50" type="number" className="bg-muted border-border w-24" />
              <p className="text-[10px] text-muted-foreground mt-1">Default radius for nearby user discovery.</p>
            </div>
          </div>
        </motion.div>

        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4 mr-1" /> Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
}
