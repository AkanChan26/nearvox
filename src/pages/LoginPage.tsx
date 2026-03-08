import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
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
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-foreground" />
            <span className="text-xl text-foreground glow-text tracking-widest">NEARVOX</span>
          </div>
          <p className="text-[10px] text-muted-foreground tracking-[0.4em]">ADMIN TERMINAL v1.0</p>
        </div>

        {/* Login Box */}
        <div className="terminal-box">
          <div className="terminal-header">AUTHENTICATION REQUIRED</div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; ADMIN EMAIL:</p>
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
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">ERROR: {error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm text-foreground border border-border px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
            >
              {loading ? "[AUTHENTICATING...]" : "[LOGIN]"}
            </button>
          </form>

          <p className="text-[10px] text-muted-foreground mt-4">// Unauthorized access is prohibited</p>
        </div>
      </div>
    </div>
  );
}
