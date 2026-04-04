import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Terminal, ChevronRight, User, MapPin, Mail, Lock, Ticket, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { USER_AVATARS, ProfileAvatar } from "@/components/Avatars";

const normalizeInviteInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const maybeUrl = new URL(trimmed);
    const codeFromUrl = maybeUrl.searchParams.get("code");
    if (codeFromUrl) return codeFromUrl.trim().toLowerCase();
  } catch { /* Not a URL */ }
  const codeMatch = trimmed.match(/[?&]code=([^&]+)/i);
  if (codeMatch?.[1]) return decodeURIComponent(codeMatch[1]).trim().toLowerCase();
  return trimmed.toLowerCase();
};

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteCode = normalizeInviteInput(searchParams.get("code") || "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [anonymousName, setAnonymousName] = useState("");
  const [region, setRegion] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("user-1");
  const [code, setCode] = useState(inviteCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validating, setValidating] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [step, setStep] = useState(1);
  const [generatingName, setGeneratingName] = useState(false);

  const validateCode = useCallback(async (rawValue: string) => {
    const normalizedCode = normalizeInviteInput(rawValue);
    if (!normalizedCode) return false;
    const primaryResult = await supabase.rpc("validate_invite_code", { _code: normalizedCode });
    if (!primaryResult.error) return !!primaryResult.data;
    const fallbackResult = await supabase.rpc("validate_invite_code", { code: normalizedCode } as any);
    if (!fallbackResult.error) return !!fallbackResult.data;
    return false;
  }, []);

  useEffect(() => {
    const normalizedCode = normalizeInviteInput(code);
    if (!normalizedCode || normalizedCode.length < 4) { setCodeValid(null); return; }
    const timeout = setTimeout(async () => {
      setValidating(true);
      const isValid = await validateCode(normalizedCode);
      setCodeValid(isValid);
      setValidating(false);
      if (isValid && inviteCode) setStep(2);
    }, 350);
    return () => clearTimeout(timeout);
  }, [code, validateCode, inviteCode]);

  const generateRandomName = async () => {
    setGeneratingName(true);
    const { data, error } = await supabase.rpc("generate_anonymous_name");
    if (!error && data) {
      setAnonymousName(data);
    }
    setGeneratingName(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedCode = normalizeInviteInput(code);
    if (!normalizedCode) { setError("INVITE CODE IS REQUIRED"); return; }
    setLoading(true);
    const isStillValid = await validateCode(normalizedCode);
    if (!isStillValid) { setError("INVALID OR USED INVITE CODE"); setLoading(false); return; }
    if (!name.trim() || !anonymousName.trim() || !region.trim()) { setError("ALL FIELDS ARE REQUIRED"); setLoading(false); return; }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name.trim(), anonymous_name: anonymousName.trim(), region: region.trim(), avatar: selectedAvatar } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (signUpData.user) {
      await supabase.rpc("consume_invite_code", { _code: normalizedCode, new_user_id: signUpData.user.id });
    }
    setLoading(false);
    navigate("/login?joined=true");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />
      <div className="fixed inset-0 terminal-grid opacity-30" />
      <div className="fixed top-0 left-0 right-0 h-px bg-foreground/20" />
      <div className="fixed bottom-0 left-0 right-0 h-px bg-foreground/20" />

      <div className="w-full max-w-sm relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-8 bg-foreground/30" />
            <Shield className="h-6 w-6 text-foreground glow-text" />
            <div className="h-px w-8 bg-foreground/30" />
          </div>
          <h1 className="text-2xl text-foreground glow-text tracking-[0.4em] mb-2">NEARVOX</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <p className="text-[9px] text-muted-foreground tracking-[0.5em]">INVITATION-ONLY ACCESS</p>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="terminal-box relative">
          <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-foreground/50 to-transparent" />

          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="terminal-header mb-0 pb-0 border-0">JOIN THE NETWORK</span>
          </div>

          {/* Step indicator */}
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground tracking-wider mb-1.5">
              STEP {step} OF 2
            </p>
            <div className="flex items-center gap-2">
              <div className={`h-1 flex-1 ${step >= 1 ? "bg-foreground" : "bg-border"}`} />
              <div className={`h-1 flex-1 ${step >= 2 ? "bg-foreground" : "bg-border"}`} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Step 1: Invite Code */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                <Ticket className="h-2.5 w-2.5" /> INVITE TICKET:
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(normalizeInviteInput(e.target.value)); setStep(1); }}
                  placeholder="Enter your invite code"
                  className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 font-mono tracking-wider placeholder:text-muted-foreground transition-none"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
                  {validating && <span className="text-muted-foreground">CHECKING...</span>}
                  {!validating && codeValid === true && <span className="text-foreground glow-text">✓ VALID</span>}
                  {!validating && codeValid === false && <span className="text-destructive">✗ INVALID</span>}
                </span>
              </div>
              {codeValid === true && step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full mt-2 text-[10px] text-foreground border border-foreground/50 px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none flex items-center justify-center gap-1"
                >
                  CONTINUE <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Step 2: User Details */}
            {step === 2 && (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <User className="h-2.5 w-2.5" /> YOUR NAME:
                  </p>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your real name (private)"
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 placeholder:text-muted-foreground transition-none"
                    required
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" /> ANONYMOUS IDENTITY:
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text" value={anonymousName} onChange={(e) => setAnonymousName(e.target.value)}
                      placeholder="e.g. CipherArc, NeonDrifter..."
                      className="flex-1 bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 placeholder:text-muted-foreground transition-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateRandomName}
                      disabled={generatingName}
                      className="px-3 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/60 transition-none flex items-center gap-1 min-h-[42px]"
                      title="Generate random anonymous name"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">This is how others will see you on the network</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <User className="h-2.5 w-2.5" /> CHOOSE AVATAR:
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {USER_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.id)}
                        className={`p-1 border transition-none flex items-center justify-center ${
                          selectedAvatar === av.id
                            ? "border-foreground bg-foreground/10"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <av.Component size={28} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> REGION:
                  </p>
                  <input
                    type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Mumbai, Pune, Ahmedabad..."
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 placeholder:text-muted-foreground transition-none"
                    required
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" /> EMAIL:
                  </p>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@nearvox.net"
                    className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 placeholder:text-muted-foreground transition-none"
                    required
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> CREATE PASSWORD:
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-input border border-border text-foreground text-sm px-3 py-2.5 pr-9 focus:outline-none focus:border-foreground/60 focus:bg-foreground/5 placeholder:text-muted-foreground transition-none"
                      required minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-warning/80 mt-1">⚠ Password cannot be changed later. Choose wisely.</p>
                </div>

                {error && (
                  <div className="border border-destructive/50 bg-destructive/10 p-2">
                    <p className="text-xs text-destructive">⚠ ERROR: {error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading || !codeValid}
                  className="w-full text-sm text-foreground border border-foreground px-4 py-2.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30 tracking-widest glow-text">
                  {loading ? "[ PROCESSING... ]" : "[ JOIN NEARVOX ]"}
                </button>
              </>
            )}
          </form>

          <div className="mt-5 pt-4 border-t border-border">
            <button onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 text-[10px] text-muted-foreground hover:text-foreground group transition-none">
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              ALREADY HAVE ACCESS? LOGIN
            </button>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground mt-4 text-center tracking-wider">
          // ACCESS REQUIRES A VALID INVITATION TICKET
        </p>
      </div>
    </div>
  );
}