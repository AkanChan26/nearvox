import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  adminUsername: string | null;
  loading: boolean;
  onlineUsers: Set<string>;
  isOnline: (userId: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const navigate = useNavigate();

  // ── GLOBAL ONLINE PRESENCE ──
  useEffect(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineUsers(new Set());
      return;
    }

    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineUsers(ids);
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineUsers(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(async () => {
      if (channelRef.current) {
        await channelRef.current.track({ online_at: new Date().toISOString() });
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id]);

  const isOnline = (userId: string) => onlineUsers.has(userId);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      console.error("Failed to check admin role", error);
    }

    const admin = !!data;
    setIsAdmin(admin);

    if (admin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .single();
      setAdminUsername(profile?.username || "ADMIN");
    } else {
      setAdminUsername(null);
    }

    return admin;
  };

  const syncAuthState = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setIsAdmin(false);
      setAdminUsername(null);
      setLoading(false);
      return;
    }

    await checkAdminRole(nextSession.user.id);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void syncAuthState(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error };

    if (data.user) {
      const admin = await checkAdminRole(data.user.id);
      navigate(admin ? "/" : "/dashboard", { replace: true });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminUsername(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, adminUsername, loading, onlineUsers, isOnline, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
