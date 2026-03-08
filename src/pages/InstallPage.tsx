import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Smartphone, CheckCircle, Terminal } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installed
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <Terminal className="h-10 w-10 text-foreground mx-auto mb-3" />
          <h1 className="text-2xl text-foreground glow-text tracking-[0.3em] font-bold">NEARVOX</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] mt-1">ANONYMOUS COMMUNITY NETWORK</p>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">INSTALL APP</div>

          {isInstalled ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-12 w-12 text-foreground mx-auto" />
              <p className="text-sm text-foreground glow-text">APP INSTALLED SUCCESSFULLY</p>
              <p className="text-[10px] text-muted-foreground">NEARVOX is on your home screen</p>
              <button
                onClick={() => navigate("/login")}
                className="text-[10px] text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none mt-2"
              >
                [LAUNCH APP]
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-foreground mb-1">Install NEARVOX on your device</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Get the full app experience — works offline, launches instantly from your home screen.
                  </p>
                </div>
              </div>

              {/* Android/Chrome install */}
              {deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2 text-sm text-foreground border border-foreground px-4 py-3 hover:bg-foreground hover:text-primary-foreground transition-none"
                >
                  <Download className="h-4 w-4" />
                  [INSTALL NEARVOX]
                </button>
              )}

              {/* iOS instructions */}
              {isIOS && !deferredPrompt && (
                <div className="border border-border p-3 space-y-2">
                  <p className="text-[10px] text-foreground tracking-wider">iOS INSTALL STEPS:</p>
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    <p>1. Tap the <span className="text-foreground">Share</span> button (square with arrow)</p>
                    <p>2. Scroll down and tap <span className="text-foreground">"Add to Home Screen"</span></p>
                    <p>3. Tap <span className="text-foreground">"Add"</span> to confirm</p>
                  </div>
                </div>
              )}

              {/* Generic fallback */}
              {!isIOS && !deferredPrompt && (
                <div className="border border-border p-3 space-y-2">
                  <p className="text-[10px] text-foreground tracking-wider">HOW TO INSTALL:</p>
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    <p>1. Open browser menu (three dots)</p>
                    <p>2. Select <span className="text-foreground">"Install App"</span> or <span className="text-foreground">"Add to Home Screen"</span></p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[9px] text-muted-foreground border-t border-border pt-3">
                <CheckCircle className="h-3 w-3" />
                <span>Works offline • Fast launch • No app store needed</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-none"
          >
            SKIP → GO TO LOGIN
          </button>
        </div>
      </div>
    </div>
  );
}
