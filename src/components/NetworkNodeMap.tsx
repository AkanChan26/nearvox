import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Activity } from "lucide-react";

/* ── types ─────────────────────────────────────────────────────── */
interface GNode {
  id: string;
  type: "topic" | "user" | "reply";
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  meta: Record<string, string | number>;
  linkedId?: string; // topic id for navigation
}

interface GEdge {
  source: string;
  target: string;
}

/* ── proximity color helper ────────────────────────────────────── */
const proximityColor = (
  itemLocation: string | null,
  userLocation: string | null
): string => {
  if (!itemLocation || !userLocation) return "hsl(145 25% 30%)"; // dim grey
  const a = itemLocation.toLowerCase().trim();
  const b = userLocation.toLowerCase().trim();
  if (a === b) return "hsl(145 80% 56%)"; // bright green – same region
  // simple word overlap for "nearby"
  const aWords = a.split(/[\s,]+/);
  const bWords = b.split(/[\s,]+/);
  const overlap = aWords.some((w) => w.length > 2 && bWords.includes(w));
  if (overlap) return "hsl(199 80% 56%)"; // soft blue – nearby
  return "hsl(145 25% 30%)"; // dim grey
};

/* ── component ─────────────────────────────────────────────────── */
export default function NetworkNodeMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GNode[]>([]);
  const edgesRef = useRef<GEdge[]>([]);
  const hoveredRef = useRef<GNode | null>(null);
  const [hovered, setHovered] = useState<GNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["net-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  /* fetch graph data */
  const { data: graphData } = useQuery({
    queryKey: ["network-graph", profile?.location],
    queryFn: async () => {
      const [topicsRes, repliesRes, profilesRes] = await Promise.all([
        supabase
          .from("topics")
          .select("id, title, replies_count, location, user_id, category")
          .order("last_activity_at", { ascending: false })
          .limit(20),
        supabase
          .from("replies")
          .select("id, topic_id, user_id")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("profiles").select("user_id, anonymous_name, username, location"),
      ]);
      return {
        topics: topicsRes.data || [],
        replies: repliesRes.data || [],
        profiles: profilesRes.data || [],
      };
    },
    enabled: !!profile,
    refetchInterval: 15000, // live-ish refresh
  });

  /* build graph */
  const buildGraph = useCallback(() => {
    if (!graphData) return;
    const { topics, replies, profiles } = graphData;
    const userLoc = profile?.location || null;
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
    const seenUsers = new Set<string>();
    const W = containerRef.current?.clientWidth || 600;
    const H = 380;
    const cx = W / 2;
    const cy = H / 2;

    // topic nodes
    topics.forEach((t: any, i: number) => {
      const angle = (i / topics.length) * Math.PI * 2;
      const r = 80 + Math.random() * 60;
      nodes.push({
        id: `t-${t.id}`,
        type: "topic",
        label: t.title.length > 18 ? t.title.slice(0, 18) + "…" : t.title,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 6 + Math.min(t.replies_count, 10),
        color: proximityColor(t.location, userLoc),
        meta: { replies: t.replies_count, sector: t.location || "Unknown", category: t.category || "" },
        linkedId: t.id,
      });

      // topic author
      if (!seenUsers.has(t.user_id)) {
        seenUsers.add(t.user_id);
        const p = profileMap.get(t.user_id);
        const uAngle = angle + (Math.random() - 0.5) * 0.5;
        const uR = r + 40 + Math.random() * 30;
        nodes.push({
          id: `u-${t.user_id}`,
          type: "user",
          label: p?.anonymous_name || p?.username || "Anon",
          x: cx + Math.cos(uAngle) * uR,
          y: cy + Math.sin(uAngle) * uR,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: 4,
          color: proximityColor(p?.location, userLoc),
          meta: { posts: topics.filter((tt: any) => tt.user_id === t.user_id).length },
        });
      }
      edges.push({ source: `u-${t.user_id}`, target: `t-${t.id}` });
    });

    // reply nodes + edges
    replies.forEach((r: any) => {
      const topicNode = nodes.find((n) => n.id === `t-${r.topic_id}`);
      if (!topicNode) return;

      nodes.push({
        id: `r-${r.id}`,
        type: "reply",
        label: "",
        x: topicNode.x + (Math.random() - 0.5) * 40,
        y: topicNode.y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 2.5,
        color: "hsl(145 50% 20%)",
        meta: {},
        linkedId: r.topic_id,
      });
      edges.push({ source: `r-${r.id}`, target: `t-${r.topic_id}` });

      // reply author
      if (!seenUsers.has(r.user_id)) {
        seenUsers.add(r.user_id);
        const p = profileMap.get(r.user_id);
        nodes.push({
          id: `u-${r.user_id}`,
          type: "user",
          label: p?.anonymous_name || p?.username || "Anon",
          x: topicNode.x + (Math.random() - 0.5) * 60,
          y: topicNode.y + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: 4,
          color: proximityColor(p?.location, userLoc),
          meta: {},
        });
      }
      edges.push({ source: `u-${r.user_id}`, target: `t-${r.topic_id}` });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [graphData, profile]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  /* realtime subscriptions */
  useEffect(() => {
    const channel = supabase
      .channel("network-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topics" }, () => {})
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, () => {})
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* physics + render loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // simple force sim
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 20;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.02;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
      }

      // attraction along edges
      edges.forEach((e) => {
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
        if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 60;
        const force = (dist - idealDist) * 0.003;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });

      // center gravity + damping + bounds
      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.0005;
        n.vy += (H / 2 - n.y) * 0.0005;
        n.vx *= 0.95; n.vy *= 0.95;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y));
      });

      // draw
      ctx.clearRect(0, 0, W, H);

      // edges
      ctx.lineWidth = 0.5;
      edges.forEach((e) => {
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
        if (!a || !b) return;
        ctx.strokeStyle = "hsla(145, 50%, 20%, 0.3)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      // nodes
      const hNode = hoveredRef.current;
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        const isHovered = hNode && hNode.id === n.id;

        if (n.type === "topic") {
          ctx.fillStyle = isHovered ? "hsl(145 80% 70%)" : n.color;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = isHovered ? 16 : 8;
        } else if (n.type === "user") {
          ctx.fillStyle = isHovered ? "hsl(199 80% 70%)" : n.color;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = isHovered ? 10 : 4;
        } else {
          ctx.fillStyle = n.color;
          ctx.shadowBlur = 2;
          ctx.shadowColor = n.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // label for topics
        if (n.type === "topic" && n.label) {
          ctx.font = "11px 'VT323', monospace";
          ctx.fillStyle = isHovered ? "hsl(145 80% 80%)" : "hsl(145 50% 40%)";
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y - n.radius - 4);
        }
        // label for users
        if (n.type === "user" && n.label) {
          ctx.font = "10px 'VT323', monospace";
          ctx.fillStyle = isHovered ? "hsl(199 80% 70%)" : "hsl(145 25% 30%)";
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y + n.radius + 12);
        }
      });

      animRef.current = requestAnimationFrame(tick);
    };

    const resize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = 380;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* mouse interaction */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nodes = nodesRef.current;
      let found: GNode | null = null;
      for (const n of nodes) {
        const dx = n.x - mx, dy = n.y - my;
        if (dx * dx + dy * dy < (n.radius + 6) ** 2) {
          found = n;
          break;
        }
      }
      hoveredRef.current = found;
      setHovered(found);
      if (found) {
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      if (canvas) canvas.style.cursor = found ? "pointer" : "default";
    },
    []
  );

  const handleClick = useCallback(() => {
    const node = hoveredRef.current;
    if (!node) return;
    if (node.type === "topic" && node.linkedId) {
      navigate(`/topic/${node.linkedId}`);
    } else if (node.type === "reply" && node.linkedId) {
      navigate(`/topic/${node.linkedId}`);
    }
  }, [navigate]);

  return (
    <div className="border border-border bg-card p-3 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3 w-3 text-foreground" />
        <span className="text-[10px] text-muted-foreground tracking-[0.3em]">
          LIVE NETWORK ACTIVITY
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(145 80% 56%)" }} />
            <span className="text-[8px] text-muted-foreground">&lt;5km</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(199 80% 56%)" }} />
            <span className="text-[8px] text-muted-foreground">&lt;50km</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(145 25% 30%)" }} />
            <span className="text-[8px] text-muted-foreground">&gt;50km</span>
          </span>
        </span>
      </div>

      <div ref={containerRef} className="relative w-full" style={{ height: 380 }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseLeave={() => { hoveredRef.current = null; setHovered(null); }}
          className="w-full"
        />

        {/* Tooltip */}
        {hovered && (
          <div
            className="absolute pointer-events-none border border-border bg-card px-2 py-1.5 z-10"
            style={{
              left: Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 400) - 160),
              top: tooltipPos.y - 40,
            }}
          >
            {hovered.type === "topic" && (
              <>
                <p className="text-[10px] text-muted-foreground">TOPIC</p>
                <p className="text-[11px] text-foreground glow-text">{hovered.label}</p>
                <p className="text-[9px] text-muted-foreground">
                  Replies: {hovered.meta.replies} · Sector: {hovered.meta.sector}
                </p>
              </>
            )}
            {hovered.type === "user" && (
              <>
                <p className="text-[10px] text-muted-foreground">USER</p>
                <p className="text-[11px] text-foreground glow-text">{hovered.label}</p>
                {hovered.meta.posts !== undefined && (
                  <p className="text-[9px] text-muted-foreground">Posts: {hovered.meta.posts}</p>
                )}
              </>
            )}
            {hovered.type === "reply" && (
              <>
                <p className="text-[10px] text-muted-foreground">REPLY NODE</p>
                <p className="text-[9px] text-muted-foreground">Click to view thread</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
