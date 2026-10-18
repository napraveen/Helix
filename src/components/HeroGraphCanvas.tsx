"use client";

import { useEffect, useRef, useState } from "react";

type HeroNode = {
  id: string;
  name: string;
  type: "Person" | "System" | "Decision" | "Project";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  subtitle: string;
};

type HeroEdge = {
  from: string;
  to: string;
  label: string;
};

const NODES_DATA: Omit<HeroNode, "x" | "y" | "vx" | "vy">[] = [
  { id: "maya", name: "Maya Chen", type: "Person", radius: 20, color: "#6366f1", subtitle: "Chief Executive Officer" },
  { id: "owen", name: "Owen Park", type: "Person", radius: 18, color: "#6366f1", subtitle: "Chief Technology Officer" },
  { id: "leo", name: "Leo Kim", type: "Person", radius: 17, color: "#6366f1", subtitle: "Staff Engineer (Perception)" },
  { id: "aisha", name: "Aisha Rahman", type: "Person", radius: 17, color: "#6366f1", subtitle: "Staff Engineer (Control Plane)" },
  { id: "jade", name: "Jade Okoye", type: "Person", radius: 16, color: "#6366f1", subtitle: "Staff SRE & Incident Lead" },
  { id: "vision", name: "vision-pipeline", type: "System", radius: 18, color: "#38bdf8", subtitle: "Tier-1 Perception Engine" },
  { id: "fleet", name: "fleet-orchestrator", type: "System", radius: 19, color: "#38bdf8", subtitle: "Warehouse Mission Router" },
  { id: "bus", name: "event-bus", type: "System", radius: 16, color: "#38bdf8", subtitle: "NATS Event Fabric" },
  { id: "billing", name: "billing-ledger", type: "System", radius: 16, color: "#38bdf8", subtitle: "Revenue Invoicing Core" },
  { id: "adr014", name: "ADR-014", type: "Decision", radius: 18, color: "#a855f7", subtitle: "Freeze Copperline Vendor" },
  { id: "adr021", name: "ADR-021", type: "Decision", radius: 16, color: "#a855f7", subtitle: "Signed OTA Firmware Rings" },
  { id: "meridian", name: "Meridian Vision", type: "Project", radius: 17, color: "#10b981", subtitle: "Warehouse Geometry SLAM" },
  { id: "pulse", name: "Pulse Fleet OS", type: "Project", radius: 17, color: "#10b981", subtitle: "Teleops & Mission Control" },
];

const EDGES_DATA: HeroEdge[] = [
  { from: "leo", to: "vision", label: "OWNS" },
  { from: "vision", to: "meridian", label: "POWERS" },
  { from: "aisha", to: "fleet", label: "OWNS" },
  { from: "fleet", to: "bus", label: "DEPENDS_ON" },
  { from: "fleet", to: "pulse", label: "FEEDS" },
  { from: "jade", to: "bus", label: "MONITORS" },
  { from: "owen", to: "adr014", label: "DECIDED_BY" },
  { from: "adr014", to: "billing", label: "SUPERSEDES" },
  { from: "owen", to: "adr021", label: "APPROVED" },
  { from: "leo", to: "owen", label: "REPORTS_TO" },
  { from: "owen", to: "maya", label: "REPORTS_TO" },
  { from: "aisha", to: "owen", label: "REPORTS_TO" },
  { from: "jade", to: "owen", label: "ESCALATES_TO" },
];

export function HeroGraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<HeroNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<HeroNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 480);

    // Initialize nodes around a balanced, contained central orbit
    const nodes: HeroNode[] = NODES_DATA.map((d, i) => {
      const angle = (i / NODES_DATA.length) * Math.PI * 2;
      const dist = 90 + (i % 3) * 42;
      return {
        ...d,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      };
    });

    let mouseX = -1000;
    let mouseY = -1000;
    let isHoveringCanvas = false;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isHoveringCanvas = true;

      // Find hovered node
      let found: HeroNode | null = null;
      for (const n of nodes) {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        if (dx * dx + dy * dy < (n.radius + 12) * (n.radius + 12)) {
          found = n;
          break;
        }
      }
      setHoveredNode(found);
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
      isHoveringCanvas = false;
      setHoveredNode(null);
    };

    const handleClick = () => {
      if (hoveredNode) {
        setSelectedNode(hoveredNode);
      } else {
        setSelectedNode(null);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("click", handleClick);

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Mild physics damping & center gravity
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        // Soft center attraction
        a.vx += (width / 2 - a.x) * 0.0006;
        a.vy += (height / 2 - a.y) * 0.0006;

        // Subtle gentle drift
        a.vx += Math.sin(t + i) * 0.03;
        a.vy += Math.cos(t + i) * 0.03;

        // Mouse repulsion
        if (isHoveringCanvas) {
          const dx = a.x - mouseX;
          const dy = a.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130 && dist > 1) {
            const force = (130 - dist) / 130;
            a.vx += (dx / dist) * force * 0.7;
            a.vy += (dy / dist) * force * 0.7;
          }
        }

        // Repulsion among nodes to avoid overlap
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius + 45;
          if (dist < minDist && dist > 1) {
            const push = ((minDist - dist) / minDist) * 0.25;
            a.vx -= (dx / dist) * push;
            a.vy -= (dy / dist) * push;
            b.vx += (dx / dist) * push;
            b.vy += (dy / dist) * push;
          }
        }

        // Velocity damping
        a.vx *= 0.94;
        a.vy *= 0.94;

        a.x += a.vx;
        a.y += a.vy;

        // Boundary containment
        const pad = a.radius + 15;
        if (a.x < pad) { a.x = pad; a.vx *= -0.5; }
        if (a.x > width - pad) { a.x = width - pad; a.vx *= -0.5; }
        if (a.y < pad) { a.y = pad; a.vy *= -0.5; }
        if (a.y > height - pad) { a.y = height - pad; a.vy *= -0.5; }
      }

      const nodeMap = new Map<string, HeroNode>(nodes.map((n) => [n.id, n]));

      // 1. Draw glowing edges
      for (let i = 0; i < EDGES_DATA.length; i++) {
        const edge = EDGES_DATA[i];
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;

        const isConnected =
          hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isConnected) {
          ctx.strokeStyle = "rgba(208, 138, 76, 0.85)";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = "rgba(239, 230, 212, 0.12)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Animated traveling light photon across each edge
        const speed = 0.0008;
        const phase = (Date.now() * speed + i * 0.2) % 1;
        const px = a.x + (b.x - a.x) * phase;
        const py = a.y + (b.y - a.y) * phase;

        ctx.beginPath();
        ctx.arc(px, py, isConnected ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isConnected ? "#f3c790" : "rgba(143, 191, 159, 0.7)";
        ctx.fill();

        // Edge label on hover
        if (isConnected) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          ctx.font = "bold 9px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "#f3c790";
          ctx.fillText(`:${edge.label}`, midX + 4, midY - 4);
        }
      }

      // 2. Draw nodes
      for (const n of nodes) {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;

        // Ambient outer aura
        if (isHovered || isSelected) {
          const glowGrad = ctx.createRadialGradient(n.x, n.y, n.radius, n.x, n.y, n.radius + 20);
          glowGrad.addColorStop(0, "rgba(208, 138, 76, 0.5)");
          glowGrad.addColorStop(1, "rgba(208, 138, 76, 0)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 20, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Node border
        ctx.strokeStyle = isHovered || isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = isHovered || isSelected ? 2.5 : 1.2;
        ctx.stroke();

        // Node label text
        ctx.font = isHovered ? "bold 12px 'IBM Plex Sans', sans-serif" : "11px 'IBM Plex Sans', sans-serif";
        ctx.fillStyle = isHovered ? "#ffffff" : "rgba(245, 238, 223, 0.85)";
        ctx.textAlign = "center";
        ctx.fillText(n.name, n.x, n.y + n.radius + 14);

        // Entity type pill
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillStyle = isHovered ? "#f3c790" : "rgba(245, 238, 223, 0.45)";
        ctx.fillText(`[${n.type}]`, n.x, n.y + n.radius + 25);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("click", handleClick);
    };
  }, [hoveredNode, selectedNode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[390px] sm:h-[440px] lg:h-[480px] rounded-3xl overflow-hidden border border-[var(--line-strong)] bg-gradient-to-b from-[#0e0c16]/95 via-[#090810]/95 to-[#060509] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] backdrop-blur-xl"
    >
      {/* Top telemetry bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10.5px] font-mono text-[var(--paper-dim)]">
          <span className="beacon-dot" />
          <span>FalkorDB Graph Physical Simulation</span>
        </div>
        <div className="hidden xl:flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10.5px] font-mono text-[var(--copper-2)]">
          <span>Move cursor · Click node</span>
        </div>
      </div>

      {/* Main interactive canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Inspector HUD for selected node */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-20 p-4 rounded-2xl bg-black/85 backdrop-blur-xl border border-[var(--copper)] shadow-2xl space-y-2 animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--copper)]/20 text-[var(--copper-2)] border border-[var(--copper)]/40 font-bold">
              {selectedNode.type}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[var(--paper-dim)] hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <h4 className="text-sm font-bold text-white">{selectedNode.name}</h4>
          <p className="text-[11px] text-[var(--paper-dim)] font-sans">{selectedNode.subtitle}</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[var(--copper-2)]">
            <span>FalkorDB Primary Index: :{selectedNode.type}(name)</span>
            <span>Weight: 1.0</span>
          </div>
        </div>
      )}
    </div>
  );
}
