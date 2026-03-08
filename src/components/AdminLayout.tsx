import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
}

export function AdminLayout({ children, showBack = true }: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 scanline z-[1] pointer-events-none" />

      {showBack && (
        <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              BACK TO HUB
            </button>
            <div className="h-3 w-px bg-border" />
            <p className="text-foreground text-sm glow-text tracking-widest">NEARVOX</p>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em]">ADMIN TERMINAL</p>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  );
}
