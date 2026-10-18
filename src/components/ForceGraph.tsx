"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type TraversalStep = {
  nodeId: string;
  name: string;
  label: string;
  edgeRel?: string;
  explanation: string;
};

type Node = { id: string; label: string; name: string };
type Edge = { from: string; to: string; rel: string };

const COLORS: Record<string, string> = {
  Person: "#6366f1",
  Team: "#8b5cf6",
  Project: "#06b6d4",
  System: "#3b82f6",
  Decision: "#c084fc",
  Document: "#38bdf8",
  Ticket: "#ec4899",
  Topic: "#10b981",
  Chat: "#a855f7",
  Meeting: "#0ea5e9",
  Memory: "#14b8a6",
  Agent: "#f43f5e",
  ChangeEvent: "#ef4444",
};

export function ForceGraph({
  nodes,
  edges,
  activePath,
  currentStepIndex: controlledStepIndex,
  onStepChange,
  isPlaying: controlledIsPlaying,
  onPlayPauseToggle,
}: {
  nodes: Node[];
  edges: Edge[];
  activePath?: TraversalStep[];
  currentStepIndex?: number;
  onStepChange?: (stepIndex: number) => void;
  isPlaying?: boolean;
  onPlayPauseToggle?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [viewMode, setViewMode] = useState<"path" | "constellation">("path");

  // Fallback internal state if parent does not provide controlled state
  const [internalStepIndex, setInternalStepIndex] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(true);

  const isControlledStep = controlledStepIndex !== undefined;
  const currentStepIndex = isControlledStep ? controlledStepIndex : internalStepIndex;

  const isControlledPlay = controlledIsPlaying !== undefined;
  const isPlaying = isControlledPlay ? controlledIsPlaying : internalIsPlaying;

  const handleStepChange = (newIndex: number) => {
    if (!isControlledStep) {
      setInternalStepIndex(newIndex);
    }
    onStepChange?.(newIndex);
  };

  const handlePlayPause = () => {
    if (!isControlledPlay) {
      setInternalIsPlaying((p) => !p);
    }
    onPlayPauseToggle?.();
  };

  // Step state reference for the animation loop
  const stepIndexRef = useRef(currentStepIndex);
  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || !activePath || activePath.length <= 1) return;
    const interval = setInterval(() => {
      const next = (stepIndexRef.current + 1) % activePath.length;
      handleStepChange(next);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying, activePath]);

  // Reset step if activePath changes
  useEffect(() => {
    if (!isControlledStep) {
      setInternalStepIndex(0);
    }
  }, [activePath]);

  // Compute layout positions for Path Mode and Constellation Mode
  const { pathPoints, constellationPoints, links } = useMemo(() => {
    // 1. Path Points: Arranged in a beautiful, structured flow across the canvas
    const pPoints: Array<{ id: string; name: string; label: string; x: number; y: number; hopIndex: number }> = [];
    if (activePath && activePath.length > 0) {
      const total = activePath.length;
      activePath.forEach((step, idx) => {
        // Curve layout across the 900x560 canvas
        const t = idx / Math.max(1, total - 1);
        const x = 110 + t * 680;
        const y = 260 + Math.sin(t * Math.PI) * -110 + (idx % 2 === 1 ? 40 : -30);
        pPoints.push({
          id: step.nodeId,
          name: step.name,
          label: step.label,
          x,
          y,
          hopIndex: idx,
        });
      });
    }

    // 2. Constellation Points (Force-directed galaxy layout)
    const sliced = nodes.slice(0, 110);
    const ids = new Set(sliced.map((n) => n.id));
    const cPoints = sliced.map((n, i) => {
      const angle = (i / Math.max(sliced.length, 1)) * Math.PI * 2;
      const radius = 140 + (i % 3) * 60;
      return {
        ...n,
        x: 450 + Math.cos(angle) * radius,
        y: 280 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
    const cLinks = edges.filter((e) => ids.has(e.from) && ids.has(e.to)).slice(0, 220);

    return { pathPoints: pPoints, constellationPoints: cPoints, links: cLinks };
  }, [nodes, edges, activePath]);

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let mouseX = -1;
    let mouseY = -1;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseX = (e.clientX - rect.left) * scaleX;
      mouseY = (e.clientY - rect.top) * scaleY;

      const activePoints = viewMode === "path" && pathPoints.length > 0 ? pathPoints : constellationPoints;
      let found: Node | null = null;
      for (const p of activePoints) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const threshold = viewMode === "path" ? 625 : 144;
        if (dx * dx + dy * dy < threshold) {
          found = p;
          break;
        }
      }
      setHoveredNode(found);
    };

    const handleMouseLeave = () => {
      mouseX = -1;
      mouseY = -1;
      setHoveredNode(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const tick = () => {
      const activeHop = stepIndexRef.current;
      const hasPath = activePath && activePath.length > 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (viewMode === "path" && hasPath && pathPoints.length > 0) {
        // ========================================================
        // MODE A: STRUCTURED PATH-OF-THOUGHT FLOWCHART (CRYSTAL CLEAR)
        // ========================================================

        // 1. Draw connecting path edges with glowing energy lines
        for (let i = 0; i < pathPoints.length - 1; i++) {
          const fromP = pathPoints[i];
          const toP = pathPoints[i + 1];
          const isTraversed = i < activeHop;
          const isActiveLink = i === activeHop - 1;

          ctx.beginPath();
          ctx.moveTo(fromP.x, fromP.y);
          ctx.lineTo(toP.x, toP.y);

          if (isActiveLink) {
            // Bright pulsing beam for current edge
            const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
            ctx.strokeStyle = `rgba(208, 138, 76, ${0.85 + pulse * 0.15})`;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Animated traveling energy particle
            const t = (Date.now() % 1000) / 1000;
            const px = fromP.x + (toP.x - fromP.x) * t;
            const py = fromP.y + (toP.y - fromP.y) * t;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (isTraversed) {
            ctx.strokeStyle = "rgba(143, 191, 159, 0.6)"; // Visited green
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(239, 230, 212, 0.15)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Edge Relationship Label Badge
          const stepData = activePath[i + 1];
          if (stepData?.edgeRel) {
            const midX = (fromP.x + toP.x) / 2;
            const midY = (fromP.y + toP.y) / 2 - 12;
            ctx.font = "bold 10px 'IBM Plex Mono', monospace";
            const relText = `—[${stepData.edgeRel}]➔`;
            const w = ctx.measureText(relText).width + 8;
            ctx.fillStyle = "rgba(10, 9, 14, 0.85)";
            ctx.fillRect(midX - w / 2, midY - 9, w, 16);
            ctx.fillStyle = isActiveLink ? "#f0c38a" : isTraversed ? "#8fbf9f" : "rgba(239, 230, 212, 0.4)";
            ctx.fillText(relText, midX - w / 2 + 4, midY + 3);
          }
        }

        // 2. Draw Large, Distinct Path Nodes
        for (let i = 0; i < pathPoints.length; i++) {
          const p = pathPoints[i];
          const isCurrent = i === activeHop;
          const isVisited = i < activeHop;
          const radius = isCurrent ? 24 : 18;

          // Outer halo on active step
          if (isCurrent) {
            const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
            ctx.strokeStyle = `rgba(208, 138, 76, ${0.4 + pulse * 0.5})`;
            ctx.lineWidth = 4 + pulse * 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius + 8 + pulse * 6, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Node body
          ctx.fillStyle = isCurrent
            ? "#38bdf8"
            : isVisited
            ? "#10b981"
            : COLORS[p.label] ?? "#94a3b8";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isCurrent ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = isCurrent ? 3 : 1.5;
          ctx.stroke();

          // Step index inside circle
          ctx.fillStyle = isCurrent ? "#08070b" : "#08070b";
          ctx.font = "bold 11px 'IBM Plex Mono', monospace";
          const stepText = isVisited ? `✓${i + 1}` : `${i + 1}`;
          const tw = ctx.measureText(stepText).width;
          ctx.fillText(stepText, p.x - tw / 2, p.y + 4);

          // Node Name Label underneath
          ctx.fillStyle = isCurrent ? "#ffffff" : isVisited ? "#efe6d4" : "rgba(239, 230, 212, 0.6)";
          ctx.font = isCurrent ? "bold 12px 'IBM Plex Sans', sans-serif" : "11px 'IBM Plex Sans', sans-serif";
          const title = p.name;
          const titleWidth = ctx.measureText(title).width;
          ctx.fillText(title, p.x - titleWidth / 2, p.y + radius + 18);

          // Node Label (Entity Type) Badge
          ctx.fillStyle = isCurrent ? "rgba(240, 195, 138, 0.9)" : "rgba(239, 230, 212, 0.4)";
          ctx.font = "9px 'IBM Plex Mono', monospace";
          const labelText = `[${p.label}]`;
          const labelWidth = ctx.measureText(labelText).width;
          ctx.fillText(labelText, p.x - labelWidth / 2, p.y + radius + 31);
        }
      } else {
        // ========================================================
        // MODE B: FULL COMPANY CONSTELLATION GALAXY VIEW
        // ========================================================
        const pathNodeIds = new Set(activePath?.map((s) => s.nodeId) ?? []);
        const currentStepNodeId = activePath?.[activeHop]?.nodeId;
        const index = new Map(constellationPoints.map((p) => [p.id, p]));

        // Repulsion physics for constellation
        for (const p of constellationPoints) {
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.vx += (450 - p.x) * 0.001;
          p.vy += (280 - p.y) * 0.001;
        }

        for (const link of links) {
          const a = index.get(link.from);
          const b = index.get(link.to);
          if (!a || !b) continue;
          ctx.strokeStyle = "rgba(239,230,212,0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        for (const p of constellationPoints) {
          const isCurrent = p.id === currentStepNodeId;
          const inPath = pathNodeIds.has(p.id);
          const radius = isCurrent ? 14 : inPath ? 9 : 4.5;

          if (isCurrent) {
            ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = COLORS[p.label] ?? "#94a3b8";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();

          if (isCurrent || inPath) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "10px 'IBM Plex Mono', monospace";
            ctx.fillText(p.name, p.x + radius + 4, p.y + 4);
          }
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [pathPoints, constellationPoints, links, activePath, viewMode]);

  const currentStep = activePath?.[currentStepIndex];

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-3">
      {/* View Mode Toggle & Playback Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-[var(--line)] min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setViewMode("path")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === "path"
                ? "bg-[var(--copper)] text-[var(--ink)] shadow"
                : "bg-white/5 text-[var(--paper-dim)] hover:text-white"
            }`}
          >
            🔍 Path-of-Thought Flowchart
          </button>
          <button
            onClick={() => setViewMode("constellation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === "constellation"
                ? "bg-[var(--copper)] text-[var(--ink)] shadow"
                : "bg-white/5 text-[var(--paper-dim)] hover:text-white"
            }`}
          >
            🌐 Full Galaxy View
          </button>
        </div>

        {activePath && activePath.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isPlaying ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-[var(--paper-dim)]">
              {isPlaying ? "Playback: Auto-Playing" : "Playback: Paused"}
            </span>
          </div>
        )}
      </div>

      {/* Horizontal Step Pills Bar (Clickable) */}
      {activePath && activePath.length > 0 && (
        <div className="w-full min-w-0 max-w-full flex gap-2 overflow-x-auto p-1.5 no-scrollbar bg-black/30 rounded-xl border border-white/5">
          {activePath.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isVisited = idx < currentStepIndex;
            return (
              <button
                key={idx}
                onClick={() => handleStepChange(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? "bg-[var(--copper)] text-[var(--ink)] font-bold shadow-lg scale-105"
                    : isVisited
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/5 text-[var(--paper-dim)] border border-transparent hover:border-white/20"
                }`}
              >
                <span>{isVisited ? "✓" : idx + 1}.</span>
                <span>{step.name}</span>
                <span className="text-[10px] opacity-75">[{step.label}]</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[var(--line)]">
        <canvas
          ref={canvasRef}
          width={900}
          height={540}
          className="block h-auto w-full max-w-full bg-gradient-to-b from-[#0d0c14] to-[#07060a] cursor-crosshair shadow-inner"
        />

        {/* Hover Badge */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-black/90 backdrop-blur rounded-lg px-3 py-1.5 border border-[var(--copper)] text-xs font-mono text-[var(--paper)] shadow-lg pointer-events-none">
            <span className="text-[var(--copper-2)] font-semibold">{hoveredNode.name}</span>
            <span className="ml-2 text-[var(--paper-dim)]">[{hoveredNode.label}]</span>
          </div>
        )}
      </div>

      {/* Master Step Controller & Reasoning HUD (Always Accessible) */}
      {activePath && activePath.length > 0 && currentStep && (
        <div className="rounded-2xl border border-[var(--copper)] bg-[var(--ink-2)]/95 backdrop-blur p-4 text-xs font-mono shadow-2xl space-y-3 w-full min-w-0 max-w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)]/50 pb-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--copper)]/20 text-[var(--copper-2)] font-bold text-xs border border-[var(--copper)]/40 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--copper)] animate-pulse" />
                Active Thought Hop: {currentStepIndex + 1} of {activePath.length}
              </span>
              <span className="text-[var(--paper-dim)] font-bold truncate max-w-[200px] sm:max-w-md">
                {currentStep.name} <span className="text-[var(--copper-2)]">[{currentStep.label}]</span>
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => handleStepChange(0)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--paper-dim)] hover:text-white transition-colors cursor-pointer text-xs"
                title="Restart from Hop 1"
              >
                ⏮ Start
              </button>
              <button
                onClick={() => handleStepChange(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--paper-dim)] hover:text-white transition-colors cursor-pointer disabled:opacity-30 text-xs"
                title="Previous Hop"
              >
                ◀ Prev
              </button>
              <button
                onClick={handlePlayPause}
                className={`px-3 sm:px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer shadow text-xs ${
                  isPlaying
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-[var(--copper)] text-[var(--ink)] hover:bg-[var(--copper-2)]"
                }`}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play All"}
              </button>
              <button
                onClick={() => handleStepChange((currentStepIndex + 1) % activePath.length)}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--paper-dim)] hover:text-white transition-colors cursor-pointer text-xs"
                title="Next Hop"
              >
                Next ▶
              </button>
            </div>
          </div>

          {/* Current Hop Reasoning Narration */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-start min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--copper-2)] font-bold">Agent Thought Process:</span>
                {currentStep.edgeRel && (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                    Traversing Edge: —[:{currentStep.edgeRel}]➔
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--paper)] font-sans leading-relaxed pt-0.5 break-words">
                {currentStep.explanation}
              </p>
            </div>

            <div className="text-right text-[11px] text-[var(--paper-dim)] shrink-0 self-center">
              Tip: Click any hop above to jump directly.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
