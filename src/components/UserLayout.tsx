import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useCallback } from "react";

interface UserLayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
}

export function UserLayout({ children, showBack = true }: UserLayoutProps) {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX < 30) {
      touchStartX.current = e.touches[0].clientX;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (diff > 80) navigate("/dashboard");
      touchStartX.current = null;
    }
  }, [navigate]);

  return (
    <div
      className="min-h-screen bg-background relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="fixed inset-0 scanline z-[1] pointer-events-none" />

      {showBack && (
        <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-none p-1 -ml-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 sm:p-0 sm:ml-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">BACK TO HUB</span>
            </button>
            <div className="h-3 w-px bg-border" />
            <p className="text-foreground text-sm glow-text tracking-widest">NEARVOX</p>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto">
        {children}
      </main>
    </div>
  );
}
