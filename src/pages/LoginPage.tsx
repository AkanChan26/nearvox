import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justJoined = searchParams.get("joined") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    }
    // Navigation is handled by AuthContext/ProtectedRoute
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-foreground" />
            <span className="text-xl text-foreground glow-text tracking-widest">NEARVOX</span>
          </div>
          <p className="text-[10px] text-muted-foreground tracking-[0.4em]">SECURE ACCESS TERMINAL</p>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">AUTHENTICATION REQUIRED</div>

          {justJoined && (
            <div className="border border-foreground/30 p-2 mb-4">
              <p className="text-xs text-foreground glow-text">
                ✓ ACCOUNT CREATED. VERIFY YOUR EMAIL THEN LOGIN.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; EMAIL:</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground"
                required
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; PASSWORD:</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-xs text-destructive">ERROR: {error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
            >
              {loading ? "[PROCESSING...]" : "[LOGIN]"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/join")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              &gt; HAVE AN INVITE CODE? JOIN HERE
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">// Access by invitation only</p>
        </div>
      </div>
    </div>
  );
}
