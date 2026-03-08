import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const normalizeInviteInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const maybeUrl = new URL(trimmed);
    const codeFromUrl = maybeUrl.searchParams.get("code");
    if (codeFromUrl) return codeFromUrl.trim().toLowerCase();
  } catch {
    // Not a URL, continue
  }

  const codeMatch = trimmed.match(/[?&]code=([^&]+)/i);
  if (codeMatch?.[1]) {
    return decodeURIComponent(codeMatch[1]).trim().toLowerCase();
  }

  return trimmed.toLowerCase();
};

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteCode = normalizeInviteInput(searchParams.get("code") || "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [region, setRegion] = useState("");
  const [code, setCode] = useState(inviteCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validating, setValidating] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);

  const validateCode = useCallback(async (rawValue: string) => {
    const normalizedCode = normalizeInviteInput(rawValue);
    if (!normalizedCode) return false;

    const primaryResult = await supabase.rpc("validate_invite_code", { _code: normalizedCode });
    if (!primaryResult.error) {
      return !!primaryResult.data;
    }

    // Fallback for stale generated client typings/function cache
    const fallbackResult = await supabase.rpc("validate_invite_code", { code: normalizedCode } as any);
    if (!fallbackResult.error) {
      return !!fallbackResult.data;
    }

    return false;
  }, []);

  // Validate invite code
  useEffect(() => {
    const normalizedCode = normalizeInviteInput(code);
    if (!normalizedCode || normalizedCode.length < 4) {
      setCodeValid(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setValidating(true);
      const isValid = await validateCode(normalizedCode);
      setCodeValid(isValid);
      setValidating(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [code, validateCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedCode = normalizeInviteInput(code);

    if (!normalizedCode) {
      setError("INVITE CODE IS REQUIRED");
      return;
    }

    setLoading(true);

    const isStillValid = await validateCode(normalizedCode);
    if (!isStillValid) {
      setError("INVALID OR USED INVITE CODE");
      setLoading(false);
      return;
    }

    if (!name.trim() || !username.trim() || !region.trim()) {
      setError("ALL FIELDS ARE REQUIRED");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          username: username.trim(),
          region: region.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Consume the invite code
    if (signUpData.user) {
      await supabase.rpc("consume_invite_code", {
        _code: normalizedCode,
        new_user_id: signUpData.user.id,
      });
    }

    setLoading(false);
    navigate("/login?joined=true");
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
          <p className="text-[10px] text-muted-foreground tracking-[0.4em]">INVITATION-ONLY ACCESS</p>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">JOIN THE NETWORK</div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; INVITE TICKET:</p>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(normalizeInviteInput(e.target.value))}
                  placeholder="Enter your invite code"
                  className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground font-mono tracking-wider placeholder:text-muted-foreground"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
                  {validating && <span className="text-muted-foreground">CHECKING...</span>}
                  {!validating && codeValid === true && <span className="text-foreground">✓ VALID</span>}
                  {!validating && codeValid === false && <span className="text-destructive">✗ INVALID</span>}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; NAME:</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; USERNAME:</p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a handle"
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-1">&gt; REGION:</p>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Mumbai, Pune, Ahmedabad..."
                className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

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
              <p className="text-[10px] text-muted-foreground mb-1">&gt; CREATE PASSWORD:</p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 pr-8 focus:outline-none focus:border-foreground"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">ERROR: {error}</p>}

            <button
              type="submit"
              disabled={loading || !codeValid}
              className="w-full text-sm text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30"
            >
              {loading ? "[PROCESSING...]" : "[JOIN NEARVOX]"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              &gt; ALREADY HAVE ACCESS? LOGIN
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">// Access requires a valid invitation ticket</p>
        </div>
      </div>
    </div>
  );
}
