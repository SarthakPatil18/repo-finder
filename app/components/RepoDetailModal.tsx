"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ExternalLink,
  Sparkles,
  Database,
  Network,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Globe,
  Tag,
  Check,
  Copy,
  Info,
  Server,
  Terminal,
  ShieldCheck,
  FileCode,
  ArrowUpRight,
  Boxes,
} from "lucide-react";
import { RepoAnalysisResult, FeatureLandscape, FeatureItem } from "@/lib/types";

interface RepoDetailModalProps {
  repo: RepoAnalysisResult | null;
  landscape?: FeatureLandscape | null;
  onClose: () => void;
}

export function RepoDetailModal({ repo, landscape, onClose }: RepoDetailModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [featureFilter, setFeatureFilter] = useState<"all" | "confirmed" | "claimed">("all");

  // Close modal on Escape key press
  useEffect(() => {
    if (!repo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [repo, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!repo) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [repo]);

  // Derive unique features for this repo (from repo object or landscape)
  const uniqueFeatures: FeatureItem[] = useMemo(() => {
    if (!repo) return [];
    if (repo.uniqueFeatures && repo.uniqueFeatures.length > 0) {
      return repo.uniqueFeatures;
    }
    if (landscape?.uniqueFeatures) {
      const cleanRepoUrl = repo.repoUrl.replace(/\/+$/, "").toLowerCase();
      const matchLandscape = landscape.uniqueFeatures.filter(
        (u) => u.repoUrl.replace(/\/+$/, "").toLowerCase() === cleanRepoUrl
      );
      if (matchLandscape.length > 0) {
        return matchLandscape.map((u) => {
          const existing = repo.features.find(
            (f) => f.name.toLowerCase() === u.featureName.toLowerCase()
          );
          return (
            existing || {
              name: u.featureName,
              originalName: u.featureName,
              category: u.category,
              status: "confirmed" as const,
              evidence: u.evidence,
              evidenceType: "code" as const,
            }
          );
        });
      }
    }
    return [];
  }, [repo, landscape]);

  if (!repo) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // ignore
    }
  };

  const primaryDeployment = repo.deployments?.[0];
  const additionalDeployments = repo.deployments ? repo.deployments.slice(1) : [];

  const confirmedFeatures = repo.features.filter((f) => f.status === "confirmed");
  const claimedFeatures = repo.features.filter((f) => f.status === "claimed");

  const filteredFeatures = repo.features.filter((f) => {
    if (featureFilter === "confirmed") return f.status === "confirmed";
    if (featureFilter === "claimed") return f.status === "claimed";
    return true;
  });

  const exportRepoJson = () => {
    const dataStr = JSON.stringify(repo, null, 2);
    handleCopy(dataStr, "json");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50/80 gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                {repo.projectName || repo.repoName.split("/")[1] || repo.repoName}
              </h2>
              {uniqueFeatures.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  {uniqueFeatures.length} Unique Feature{uniqueFeatures.length > 1 ? "s" : ""}
                </span>
              )}
              {repo.analysisStatus === "partial" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Scanning in progress...
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-mono">
              <span>{repo.repoName}</span>
              {repo.homepage && (
                <>
                  <span>•</span>
                  <a
                    href={repo.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-sans"
                  >
                    <span>Homepage</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>

            {repo.description && (
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed line-clamp-2">
                {repo.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Link Bar (Section 16: GitHub Repository & Live Deployment) */}
        <div className="px-6 py-3.5 bg-zinc-100/70 border-b border-zinc-200 flex flex-wrap items-center gap-3">
          {/* GitHub Repository */}
          <a
            href={repo.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-2xs"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-700" />
            <span>Open GitHub Repository</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          {/* Live Deployment */}
          {primaryDeployment ? (
            <a
              href={primaryDeployment}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Live Deployment</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 bg-zinc-200/60 border border-zinc-300/60">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>No live deployment detected</span>
            </span>
          )}

          {/* Additional Deployments List */}
          {additionalDeployments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500 font-medium">Alternative deployments:</span>
              {additionalDeployments.map((url, i) => (
                <div key={i} className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-0.5 text-xs">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-emerald-700 hover:underline max-w-[180px] truncate"
                  >
                    {url.replace(/^https?:\/\//, "")}
                  </a>
                  <button
                    onClick={() => handleCopy(url, `dep-${i}`)}
                    className="p-0.5 text-zinc-400 hover:text-black cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedText === `dep-${i}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-800">
          {/* 1. Purpose Section (Section 16) */}
          <section className="bg-zinc-50 border border-zinc-200 rounded-xl p-4.5">
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              Purpose & Problem Solved
            </h3>
            <p className="text-sm text-zinc-900 leading-relaxed font-medium">
              {repo.purpose || "No stated purpose extracted from repository README or manifests."}
            </p>
          </section>

          {/* 2. Features Section (Section 16 & Rule 19) */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-700" />
                Product & Application Features ({repo.features.length})
              </h3>

              {repo.features.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs">
                  <button
                    onClick={() => setFeatureFilter("all")}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      featureFilter === "all"
                        ? "bg-white text-zinc-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    All ({repo.features.length})
                  </button>
                  <button
                    onClick={() => setFeatureFilter("confirmed")}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      featureFilter === "confirmed"
                        ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Confirmed ({confirmedFeatures.length})
                  </button>
                  <button
                    onClick={() => setFeatureFilter("claimed")}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      featureFilter === "claimed"
                        ? "bg-white text-amber-800 shadow-2xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Claimed ({claimedFeatures.length})
                  </button>
                </div>
              )}
            </div>

            {repo.features.length === 0 ? (
              <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                No specific application features were identified in the codebase or documentation.
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                No features match the selected filter ({featureFilter}).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFeatures.map((feat, idx) => {
                  const isConfirmed = feat.status === "confirmed";

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2 shadow-2xs ${
                        isConfirmed
                          ? "bg-white border-zinc-200 hover:border-zinc-300"
                          : "bg-amber-50/40 border-amber-200/70 hover:border-amber-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-zinc-950 leading-snug">
                            {feat.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium shrink-0">
                            {feat.category}
                          </span>
                        </div>

                        {/* Status Badge (Rule 19) */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              Claimed / implementation not verified
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-zinc-400 capitalize">
                            via {feat.evidenceType || "code"}
                          </span>
                        </div>
                      </div>

                      {/* Evidence Details */}
                      <div className="text-xs text-zinc-600 bg-zinc-50/70 p-2 rounded-lg border border-zinc-100 leading-relaxed">
                        <strong className="text-zinc-700 font-medium">Evidence: </strong>
                        <span>{feat.evidence}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Technology Stack (Section 16: Frontend, Backend, Database, AI/ML, APIs) */}
          <section>
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-700" />
              Technology Stack
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Frontend */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-1.5">
                    <FileCode className="w-3 h-3 text-blue-600" />
                    Frontend
                  </span>
                  {repo.techStack.frontend.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {repo.techStack.frontend.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Backend */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-1.5">
                    <Server className="w-3 h-3 text-emerald-600" />
                    Backend
                  </span>
                  {repo.techStack.backend.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {repo.techStack.backend.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Database */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-1.5">
                    <Database className="w-3 h-3 text-amber-600" />
                    Database
                  </span>
                  {repo.techStack.database.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {repo.techStack.database.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* AI / ML */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 sm:col-span-2 md:col-span-2 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    AI / Machine Learning
                  </span>
                  {repo.techStack.aiMl.length > 0 || repo.aiMl?.hasAi ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {repo.techStack.aiMl.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {repo.aiMl?.features && repo.aiMl.features.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-zinc-200">
                          {repo.aiMl.features.map((aiFeat, aiIdx) => (
                            <div
                              key={aiIdx}
                              className="text-[11px] p-2 bg-white rounded border border-purple-100 flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between font-semibold text-purple-950">
                                <span>{aiFeat.name}</span>
                                {aiFeat.verified && (
                                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                                    <ShieldCheck className="w-3 h-3" /> Verified
                                  </span>
                                )}
                              </div>
                              <span className="text-zinc-500 font-sans">{aiFeat.evidence}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic">No AI dependencies detected</span>
                  )}
                </div>
              </div>

              {/* APIs & Integration Libraries */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-zinc-700 flex items-center gap-1 mb-1.5">
                    <Terminal className="w-3 h-3 text-zinc-600" />
                    APIs & SDKs
                  </span>
                  {repo.techStack.apis && repo.techStack.apis.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {repo.techStack.apis.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic">Standard API dependencies</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Database Entities & APIs / Capabilities (Section 16) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Database Entities */}
            <section className="p-4.5 rounded-xl border border-zinc-200 bg-zinc-50/70 flex flex-col">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-700" />
                Database Entities ({repo.databaseEntities.length})
              </h3>
              {repo.databaseEntities.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No schema models detected.</p>
              ) : (
                <div className="space-y-1.5 flex-1">
                  {repo.databaseEntities.map((ent, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-3 py-2 bg-white border border-zinc-200 rounded-lg shadow-2xs"
                    >
                      <span className="font-mono font-semibold text-zinc-900">{ent.name}</span>
                      <span className="text-[11px] text-zinc-500 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">
                        {ent.source}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* APIs & Capabilities */}
            <section className="p-4.5 rounded-xl border border-zinc-200 bg-zinc-50/70 flex flex-col">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-zinc-700" />
                APIs / Capabilities ({repo.apiCapabilities.length})
              </h3>
              {repo.apiCapabilities.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No backend endpoints detected.</p>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {repo.apiCapabilities.map((api, i) => (
                    <div
                      key={i}
                      className="text-xs p-3 bg-white border border-zinc-200 rounded-lg shadow-2xs space-y-1.5"
                    >
                      <span className="font-semibold text-zinc-950 block">{api.name}</span>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px] text-zinc-600">
                        {api.routes.map((r, ri) => (
                          <span
                            key={ri}
                            className="bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 5. Unique Features (Section 16: "Then: Unique Features • ...") */}
          <section className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200 rounded-xl p-4.5">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Unique Features Discovered in this Project ({uniqueFeatures.length})
            </h3>

            {uniqueFeatures.length === 0 ? (
              <div className="p-3 bg-white/80 border border-blue-100 rounded-lg text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">
                  No features unique to only this project.
                </p>
                <p className="text-zinc-500 mt-0.5">
                  All features identified in this repository are shared with at least one other project in this domain landscape.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {uniqueFeatures.map((u, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-white border border-blue-200/80 rounded-xl shadow-2xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-blue-950">
                        {u.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                        {u.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed">
                      <strong className="text-zinc-900 font-medium">Verified Evidence: </strong>
                      {u.evidence}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between flex-wrap gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>
              Analyzed <strong className="text-zinc-800">{repo.features.length}</strong> features,{" "}
              <strong className="text-zinc-800">{repo.databaseEntities.length}</strong> schema entities, and{" "}
              <strong className="text-zinc-800">{repo.apiCapabilities.length}</strong> APIs
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportRepoJson}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copy repository analysis data as JSON"
            >
              {copiedText === "json" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
