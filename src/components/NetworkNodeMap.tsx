import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──

type NodeType = "topic" | "user" | "reply";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  detail: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  pulsePhase: number;
  targetId?: string; // for navigation
  repliesCount?: number;
  postsCount?: number;
  sector?: string;
  distance?: "near" | "mid" | "far";
}

interface GraphEdge {
  source: string;
  target: string;
}

interface TooltipData {
  x: number;
  y: number;
  node: GraphNode;
}

// ── Distance coloring ──

const COLORS = {
  near: { node: "#00ff88", glow: "rgba(0,255,136,0.4)", line: "rgba(0,255,136,0.15)" },
  mid: { node: "#4488ff", glow: "rgba(68,136,255,0.3)", line: "rgba(68,136,255,0.1)" },
  far: { node: "#555555", glow: "rgba(85,85,85,0.2)", line: "rgba(85,85,85,0.08)" },
};

const NODE_RADIUS = { topic: 18, user: 12, reply: 6 };

// ── Helpers ──

function estimateDistance(userLoc: string, itemLoc: string | null): "near" | "mid" | "far" {
  if (!itemLoc || !userLoc) return "far";
  const norm = (s: string) => s.toLowerCase().trim();
  const uParts = norm(userLoc).split(/[,\s]+/);
  const iParts = norm(itemLoc).split(/[,\s]+/);
  const exactMatch = uParts.some((p) => iParts.some((ip) => ip === p));
  if (exactMatch) return "near";
  const partialMatch = uParts.some((p) => iParts.some((ip) => ip.includes(p) || p.includes(ip)));
  if (partialMatch) return "mid";
  return "far";
}

// ── Component ──

export function NetworkNodeMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 400 });
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Data fetching ──

  const { data: myProfile } = useQuery({
    queryKey: ["network-map-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("location").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: topics } = useQuery({
    queryKey: ["network-map-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, replies_count, location, category, user_id")
        .order("last_activity_at", { ascending: false })
        .limit(15);
      return data || [];
    },
  });

  const { data: replies } = useQuery({
    queryKey: ["network-map-replies"],
    queryFn: async () => {
      const topicIds = topics?.map((t) => t.id) || [];
      if (topicIds.length === 0) return [];
      const { data } = await supabase
        .from("replies")
        .select("id, topic_id, user_id")
        .in("topic_id", topicIds)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!topics && topics.length > 0,
  });

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    topics?.forEach((t) => ids.add(t.user_id));
    replies?.forEach((r) => ids.add(r.user_id));
    return [...ids];
  }, [topics, replies]);

  const { data: profiles } = useQuery({
    queryKey: ["network-map-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, anonymous_name, username, is_admin, location")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // ── Build graph ──

  const buildGraph = useCallback(() => {
    if (!topics) return;
    const userLoc = myProfile?.location || "";
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;
    const userPostCounts: Record<string, number> = {};

    // Count posts per user
    topics?.forEach((t) => { userPostCounts[t.user_id] = (userPostCounts[t.user_id] || 0) + 1; });
    replies?.forEach((r) => { userPostCounts[r.user_id] = (userPostCounts[r.user_id] || 0) + 1; });

    // Topic nodes – arrange in a ring
    topics.forEach((t, i) => {
      const angle = (i / topics.length) * Math.PI * 2 - Math.PI / 2;
      const spread = Math.min(dimensions.w, dimensions.h) * 0.3;
      const dist = estimateDistance(userLoc, t.location);
      const c = COLORS[dist];
      nodes.push({
        id: `topic-${t.id}`,
        type: "topic",
        label: t.title.length > 20 ? t.title.slice(0, 18) + "…" : t.title,
        detail: t.title,
        x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
        radius: NODE_RADIUS.topic,
        color: c.node,
        glowColor: c.glow,
        pulsePhase: Math.random() * Math.PI * 2,
        targetId: t.id,
        repliesCount: t.replies_count,
        sector: t.location || "Global",
        distance: dist,
      });
    });

    // User nodes
    const addedUsers = new Set<string>();
    const getProfile = (uid: string) => profiles?.find((p) => p.user_id === uid);

    const addUserNode = (uid: string, nearTopicId: string) => {
      if (addedUsers.has(uid)) {
        edges.push({ source: `user-${uid}`, target: `topic-${nearTopicId}` });
        return;
      }
      addedUsers.add(uid);
      const prof = getProfile(uid);
      const name = prof?.is_admin ? (prof.username || "ADMIN") : (prof?.anonymous_name || "Anonymous");
      const dist = estimateDistance(userLoc, prof?.location || null);
      const c = COLORS[dist];
      const topicNode = nodes.find((n) => n.id === `topic-${nearTopicId}`);
      const bx = topicNode ? topicNode.x : cx;
      const by = topicNode ? topicNode.y : cy;

      nodes.push({
        id: `user-${uid}`,
        type: "user",
        label: name,
        detail: name,
        x: bx + (Math.random() - 0.5) * 80,
        y: by + (Math.random() - 0.5) * 80,
        vx: 0, vy: 0,
        radius: NODE_RADIUS.user,
        color: c.node,
        glowColor: c.glow,
        pulsePhase: Math.random() * Math.PI * 2,
        postsCount: userPostCounts[uid] || 0,
        distance: dist,
      });
      edges.push({ source: `user-${uid}`, target: `topic-${nearTopicId}` });
    };

    // Add topic creators
    topics.forEach((t) => addUserNode(t.user_id, t.id));

    // Reply nodes + user connections
    replies?.forEach((r, i) => {
      addUserNode(r.user_id, r.topic_id);

      // Only show a sample of reply nodes to avoid clutter
      if (i < 20) {
        const topicNode = nodes.find((n) => n.id === `topic-${r.topic_id}`);
        const dist = estimateDistance(userLoc, topicNode?.sector || null);
        const c = COLORS[dist];
        nodes.push({
          id: `reply-${r.id}`,
          type: "reply",
          label: "",
          detail: "Reply",
          x: (topicNode?.x || cx) + (Math.random() - 0.5) * 60,
          y: (topicNode?.y || cy) + (Math.random() - 0.5) * 60,
          vx: 0, vy: 0,
          radius: NODE_RADIUS.reply,
          color: c.node,
          glowColor: c.glow,
          pulsePhase: Math.random() * Math.PI * 2,
          distance: dist,
        });
        edges.push({ source: `reply-${r.id}`, target: `topic-${r.topic_id}` });
        edges.push({ source: `reply-${r.id}`, target: `user-${r.user_id}` });
      }
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [topics, replies, profiles, myProfile, dimensions]);

  useEffect(() => { buildGraph(); }, [buildGraph]);

  // ── Realtime ──

  useEffect(() => {
    const channel = supabase
      .channel("network-map-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topics" }, () => {
        // Queries will auto-refresh
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Resize ──

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ w: width, h: Math.max(350, Math.min(500, width * 0.55)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Force simulation + render ──

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;

    const simulate = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const cx = dimensions.w / 2;
      const cy = dimensions.h / 2;

      // Force simulation
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        // Center gravity
        a.vx += (cx - a.x) * 0.0003;
        a.vy += (cy - a.y) * 0.0003;

        // Repulsion
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 30;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.005;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
      }

      // Edge attraction
      for (const edge of edges) {
        const a = nodes.find((n) => n.id === edge.source);
        const b = nodes.find((n) => n.id === edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealLen = 80 + a.radius + b.radius;
        const force = (dist - idealLen) * 0.0008;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Update positions
      for (const n of nodes) {
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(n.radius + 5, Math.min(dimensions.w - n.radius - 5, n.x));
        n.y = Math.max(n.radius + 5, Math.min(dimensions.h - n.radius - 5, n.y));
      }
    };

    const render = () => {
      time += 0.02;
      simulate();

      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.w * dpr;
      canvas.height = dimensions.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dimensions.w, dimensions.h);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const hovered = hoveredRef.current;

      // Draw edges
      for (const edge of edges) {
        const a = nodes.find((n) => n.id === edge.source);
        const b = nodes.find((n) => n.id === edge.target);
        if (!a || !b) continue;
        const isHighlighted = hovered === a.id || hovered === b.id;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHighlighted
          ? (a.distance === "near" || b.distance === "near" ? "rgba(0,255,136,0.4)" : "rgba(68,136,255,0.3)")
          : COLORS[a.distance || "far"].line;
        ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hovered === node.id;
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.2 + 0.8;
        const r = node.radius * (isHovered ? 1.3 : 1) * (node.type === "reply" ? pulse : 1);

        // Glow
        if (node.type !== "reply" || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + (isHovered ? 12 : 6), 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r + (isHovered ? 12 : 6));
          grad.addColorStop(0, node.glowColor);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.color : node.color + (node.type === "reply" ? "66" : "cc");
        ctx.fill();

        // Border
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isHovered ? 2 : 0.8;
        ctx.stroke();

        // Label for topic/user nodes
        if (node.type === "topic" && node.label) {
          ctx.font = `bold ${isHovered ? 10 : 8}px monospace`;
          ctx.fillStyle = node.color;
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y + r + 12);
        } else if (node.type === "user" && node.label) {
          ctx.font = `${isHovered ? 9 : 7}px monospace`;
          ctx.fillStyle = node.color + "aa";
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y + r + 10);
        }

        // Inner icon indicator for topics
        if (node.type === "topic") {
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("◆", node.x, node.y);
          ctx.textBaseline = "alphabetic";
        }
      }

      // Scanning line effect
      const scanY = (time * 40) % dimensions.h;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(dimensions.w, scanY);
      ctx.strokeStyle = "rgba(0,255,136,0.03)";
      ctx.lineWidth = 1;
      ctx.stroke();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions]);

  // ── Mouse events ──

  const getNodeAt = useCallback((mx: number, my: number): GraphNode | null => {
    const nodes = nodesRef.current;
    // Check in reverse so top-drawn nodes are checked first
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy <= (n.radius + 8) * (n.radius + 8)) return n;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    hoveredRef.current = node?.id || null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? "pointer" : "default";
    }
    if (node && node.type !== "reply") {
      setTooltip({ x: mx, y: my, node });
    } else {
      setTooltip(null);
    }
  }, [getNodeAt]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    if (node?.type === "topic" && node.targetId) {
      navigate(`/topic/${node.targetId}`);
    }
  }, [getNodeAt, navigate]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setTooltip(null);
  }, []);

  return (
    <div className="border border-border bg-card p-3 mb-6" ref={containerRef}>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
        <span className="text-[10px] text-muted-foreground tracking-[0.3em]">
          LIVE NETWORK ACTIVITY
        </span>
        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.near.node }} /> &lt;5km</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.mid.node }} /> &lt;50km</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.far.node }} /> far</span>
        </span>
      </div>

      <div className="relative overflow-hidden border border-border" style={{ height: dimensions.h }}>
        <canvas
          ref={canvasRef}
          style={{ width: dimensions.w, height: dimensions.h }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 border border-border bg-card/95 backdrop-blur-sm px-3 py-2 text-left"
            style={{
              left: Math.min(tooltip.x + 12, dimensions.w - 180),
              top: Math.max(tooltip.y - 40, 4),
            }}
          >
            {tooltip.node.type === "topic" ? (
              <>
                <p className="text-[9px] text-muted-foreground tracking-wider mb-0.5">TOPIC</p>
                <p className="text-[11px] text-foreground font-bold glow-text">{tooltip.node.detail}</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Replies: {tooltip.node.repliesCount ?? 0} · Sector: {tooltip.node.sector}
                </p>
              </>
            ) : (
              <>
                <p className="text-[9px] text-muted-foreground tracking-wider mb-0.5">USER</p>
                <p className="text-[11px] text-foreground font-bold">{tooltip.node.detail}</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Posts: {tooltip.node.postsCount ?? 0}
                </p>
              </>
            )}
          </div>
        )}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,255,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[9px] text-muted-foreground">
          {nodesRef.current.filter((n) => n.type === "topic").length} topics ·{" "}
          {nodesRef.current.filter((n) => n.type === "user").length} users ·{" "}
          {nodesRef.current.filter((n) => n.type === "reply").length} replies
        </p>
        <p className="text-[9px] text-muted-foreground">CLICK TOPIC TO OPEN THREAD</p>
      </div>
    </div>
  );
}
