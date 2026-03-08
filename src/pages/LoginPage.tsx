import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("ACCOUNT CREATED. SWITCHING TO LOGIN...");
        setTimeout(() => { setMode("login"); setSuccess(""); }, 1500);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate("/");
      }
    }
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
          <p className="text-[10px] text-muted-foreground tracking-[0.4em]">ADMIN TERMINAL v1.0</p>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">
            {mode === "login" ? "AUTHENTICATION REQUIRED" : "CREATE ADMIN ACCOUNT"}
          </div>

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
            {success && <p className="text-xs text-foreground glow-text">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm text-foreground border border-border px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
            >
              {loading ? "[PROCESSING...]" : mode === "login" ? "[LOGIN]" : "[CREATE ACCOUNT]"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "> FIRST TIME? CREATE ACCOUNT" : "> ALREADY HAVE ACCESS? LOGIN"}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">// Unauthorized access is prohibited</p>
        </div>
      </div>
    </div>
  );
}
