import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      <AdminSidebar />
      <main className="ml-56 min-h-screen relative">
        {/* Scanline overlay */}
        <div className="fixed inset-0 scanline z-50 pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
