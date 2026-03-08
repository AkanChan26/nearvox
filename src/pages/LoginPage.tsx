import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Shield, Terminal, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justJoined = searchParams.get("joined") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />
      <div className="fixed inset-0 terminal-grid opacity-30" />

      {/* Decorative lines */}
      <div className="fixed top-0 left-0 right-0 h-px bg-foreground/20" />
      <div className="fixed bottom-0 left-0 right-0 h-px bg-foreground/20" />

      <div className="w-full max-w-sm relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-8 bg-foreground/30" />
            <Shield className="h-6 w-6 text-foreground glow-text" />
            <div className="h-px w-8 bg-foreground/30" />
          </div>
          <h1 className="text-2xl text-foreground glow-text tracking-[0.4em] mb-2">NEARVOX</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <p className="text-[9px] text-muted-foreground tracking-[0.5em]">SECURE ACCESS TERMINAL</p>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="terminal-box relative">
          {/* Status indicator */}
          <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-foreground/50 to-transparent" />

          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="terminal-header mb-0 pb-0 border-0">AUTHENTICATION REQUIRED</span>
          </div>

          {justJoined && (
            <div className="border border-foreground/30 bg-foreground/5 p-2.5 mb-4">
              <p className="text-xs text-foreground glow-text flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                ACCOUNT CREATED — VERIFY EMAIL TO CONTINUE
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider">&gt; EMAIL:</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 transition-none"
                required
                placeholder="agent@nearvox.net"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider">&gt; PASSWORD:</p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 pr-9 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 transition-none"
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-destructive/50 bg-destructive/10 p-2">
                <p className="text-xs text-destructive">⚠ ERROR: {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm text-foreground border border-foreground px-4 py-2.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50 tracking-widest glow-text"
            >
              {loading ? "[ AUTHENTICATING... ]" : "[ LOGIN ]"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border">
            <button
              onClick={() => navigate("/join")}
              className="w-full flex items-center justify-center gap-2 text-[10px] text-muted-foreground hover:text-foreground group transition-none"
            >
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              HAVE AN INVITE CODE? JOIN THE NETWORK
            </button>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground mt-4 text-center tracking-wider">
          // ACCESS BY INVITATION ONLY — UNAUTHORIZED ACCESS PROHIBITED
        </p>
      </div>
    </div>
  );
}
