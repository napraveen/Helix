"use client";

import { useState } from "react";
import { SAMPLE_INGEST_TEMPLATES, type IngestResult } from "@/lib/graph/universal-ingest-types";

export function UniversalIngestStudio({ onIngestSuccess }: { onIngestSuccess?: () => void }) {
  const [sourceType, setSourceType] = useState<"markdown" | "github" | "slack">("markdown");
  const [markdownText, setMarkdownText] = useState<string>(SAMPLE_INGEST_TEMPLATES.stripeRfc);
  const [githubManifest, setGithubManifest] = useState<string>(
    JSON.stringify(SAMPLE_INGEST_TEMPLATES.githubWarehouseManifest, null, 2),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [copiedCypher, setCopiedCypher] = useState(false);

  const loadTemplate = (key: "stripe" | "perception") => {
    if (key === "stripe") setMarkdownText(SAMPLE_INGEST_TEMPLATES.stripeRfc);
    if (key === "perception") setMarkdownText(SAMPLE_INGEST_TEMPLATES.perceptionIncident);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIngestResult(null);

    try {
      let payload: any = { type: sourceType };
      if (sourceType === "github") {
        try {
          payload.repoData = JSON.parse(githubManifest);
        } catch {
          alert("Invalid JSON in GitHub manifest");
          setIsSubmitting(false);
          return;
        }
      } else {
        payload.text = markdownText;
      }

      const res = await fetch("/api/graph/ingest-universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok && data.result) {
        setIngestResult(data.result);
        if (onIngestSuccess) onIngestSuccess();
      } else {
        alert(data.error || "Ingestion failed");
      }
    } catch (err) {
      alert("Error submitting ingestion: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCypher = () => {
    if (!ingestResult) return;
    navigator.clipboard.writeText(ingestResult.cypherStatements.join("\n\n"));
    setCopiedCypher(true);
    setTimeout(() => setCopiedCypher(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel rounded-2xl p-6 border border-[var(--copper)]/30 bg-gradient-to-r from-black via-black/80 to-[var(--copper)]/10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--copper)]/40 bg-[var(--copper)]/10 px-3 py-0.5 text-xs font-mono text-[var(--copper-2)] mb-2">
          <span>📥 UNIVERSAL INGESTION PIPELINE</span>
          <span>·</span>
          <span>FALKORDB KNOWLEDGE ENGINE</span>
        </div>
        <h2 className="serif text-2xl sm:text-3xl text-white">
          Ingest Real Corporate Documents, RFCs & Repositories
        </h2>
        <p className="text-xs sm:text-sm text-[var(--paper-dim)] mt-1 max-w-2xl">
          Bring any real architectural decision, incident postmortem, or GitHub codebase structure. 
          The ingestion engine extracts entities, resolves dependencies, and dynamically synthesizes Cypher <code className="text-white">MERGE</code> statements into FalkorDB.
        </p>

        {/* Source Type Selector */}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={() => setSourceType("markdown")}
            className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              sourceType === "markdown"
                ? "bg-[var(--copper)] text-[var(--ink)] font-bold border-[var(--copper)]"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            📄 Markdown RFC / ADR
          </button>
          <button
            type="button"
            onClick={() => setSourceType("github")}
            className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              sourceType === "github"
                ? "bg-[var(--copper)] text-[var(--ink)] font-bold border-[var(--copper)]"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            🐙 GitHub Monorepo Manifest
          </button>
        </div>
      </div>

      {/* Main Ingest Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Input Editor */}
        <div className="panel rounded-2xl p-5 border border-[var(--line)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <h3 className="font-mono text-sm font-semibold text-white">
              {sourceType === "markdown" ? "Markdown Document Source" : "GitHub Repo Manifest (JSON)"}
            </h3>
            {sourceType === "markdown" && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[var(--paper-dim)]">Templates:</span>
                <button
                  type="button"
                  onClick={() => loadTemplate("stripe")}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[var(--copper-2)] cursor-pointer"
                >
                  Stripe RFC
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("perception")}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-400 cursor-pointer"
                >
                  Perception Incident
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleIngest} className="space-y-4">
            {sourceType === "markdown" ? (
              <div>
                <textarea
                  rows={14}
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  placeholder="Paste Markdown document, RFC, or incident postmortem..."
                  className="w-full rounded-xl border border-[var(--line)] bg-black/60 p-3.5 font-mono text-xs text-[var(--paper)] leading-relaxed focus:border-[var(--copper)] focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <textarea
                  rows={14}
                  value={githubManifest}
                  onChange={(e) => setGithubManifest(e.target.value)}
                  placeholder="Paste GitHub services manifest JSON..."
                  className="w-full rounded-xl border border-[var(--line)] bg-black/60 p-3.5 font-mono text-xs text-emerald-300 leading-relaxed focus:border-[var(--copper)] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary rounded-xl py-3 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--copper)]/20 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Ingesting & Linking Graph..." : "⚡ Execute Ingest to FalkorDB Graph"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Entity Extraction & Cypher Preview */}
        <div className="panel rounded-2xl p-5 border border-[var(--line)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <h3 className="font-mono text-sm font-semibold text-white">
              FalkorDB Graph Mutation Preview
            </h3>
            {ingestResult && (
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                Executed in {ingestResult.executionMs}ms
              </span>
            )}
          </div>

          {!ingestResult ? (
            <div className="p-8 text-center text-xs text-[var(--paper-dim)] space-y-2 border border-dashed border-white/10 rounded-xl">
              <span className="text-3xl">✨</span>
              <p>Click "Execute Ingest" to extract entities and generate OpenCypher mutations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Provenance Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                <span className="text-[var(--paper-dim)]">Provenance Fingerprint:</span>
                <span className="text-[var(--copper-2)] font-bold">{ingestResult.provenanceHash}</span>
              </div>

              {/* Detected Entities */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-[var(--copper)]">
                  Entities Resolved from Text:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--paper-dim)] block">PEOPLE ({ingestResult.entitiesDetected.people.length})</span>
                    <span className="text-white font-semibold">
                      {ingestResult.entitiesDetected.people.join(", ") || "None"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--paper-dim)] block">SYSTEMS ({ingestResult.entitiesDetected.systems.length})</span>
                    <span className="text-emerald-400 font-semibold">
                      {ingestResult.entitiesDetected.systems.join(", ") || "None"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--paper-dim)] block">DECISIONS / ADRS</span>
                    <span className="text-purple-400 font-semibold">
                      {ingestResult.entitiesDetected.decisions.join(", ") || "None"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] text-[var(--paper-dim)] block">TOPICS</span>
                    <span className="text-cyan-400 font-semibold">
                      {ingestResult.entitiesDetected.topics.join(", ") || "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Cypher */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--paper-dim)]">
                  <span>Generated OpenCypher Statements ({ingestResult.cypherStatements.length}):</span>
                  <button
                    onClick={handleCopyCypher}
                    className="text-[var(--copper-2)] hover:underline cursor-pointer"
                  >
                    {copiedCypher ? "✓ Copied" : "Copy Cypher"}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-56 leading-tight">
                  {ingestResult.cypherStatements.join("\n\n")}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                ✓ Successfully merged {ingestResult.nodesCreated.length} nodes and {ingestResult.edgesCreated.length} relationships into the FalkorDB Company Graph.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
