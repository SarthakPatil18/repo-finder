"use client";

import React from "react";
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
} from "lucide-react";
import { RepoAnalysisResult } from "@/lib/types";

interface RepoDetailModalProps {
  repo: RepoAnalysisResult | null;
  onClose: () => void;
}

export function RepoDetailModal({ repo, onClose }: RepoDetailModalProps) {
  if (!repo) return null;

  const primaryDeployment = repo.deployments?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50/70">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                {repo.projectName}
              </h2>
              {repo.uniqueFeatures && repo.uniqueFeatures.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  {repo.uniqueFeatures.length} Unique Feature{repo.uniqueFeatures.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-zinc-500 mt-1">{repo.repoName}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Link Bar */}
        <div className="px-6 py-3 bg-zinc-100/60 border-b border-zinc-200 flex flex-wrap items-center gap-3">
          <a
            href={repo.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-xs"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-600" />
            <span>Open GitHub Repository</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          {primaryDeployment ? (
            <a
              href={primaryDeployment}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Live Deployment</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-500 bg-zinc-200/50">
              No live deployment detected
            </span>
          )}

          {repo.deployments && repo.deployments.length > 1 && (
            <span className="text-xs text-zinc-500">
              +{repo.deployments.length - 1} alternative link{repo.deployments.length - 1 > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-800">
          {/* Purpose Section */}
          <section className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              Purpose & Problem Solved
            </h3>
            <p className="text-sm text-zinc-900 leading-relaxed font-medium">
              {repo.purpose}
            </p>
          </section>

          {/* Unique Features Highlight */}
          {repo.uniqueFeatures && repo.uniqueFeatures.length > 0 && (
            <section className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Unique Features Discovered in this Project
              </h3>
              <div className="space-y-2.5">
                {repo.uniqueFeatures.map((u, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white border border-blue-100 rounded-lg shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-blue-950">
                        {u.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 font-medium">
                        {u.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      <strong className="text-zinc-700">Evidence: </strong>
                      {u.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Features List */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-700" />
              Product & Application Features ({repo.features.length})
            </h3>
            {repo.features.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No specific features extracted.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {repo.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-colors shadow-2xs flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-zinc-900 leading-snug">
                        {feat.name}
                      </span>
                      {feat.status === "confirmed" ? (
                        <span
                          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="Verified with concrete source code / route / schema implementation"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Confirmed
                        </span>
                      ) : (
                        <span
                          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                          title="Documented in README / implementation not verified in codebase"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Claimed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {feat.evidence}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Technology Stack */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-700" />
              Technology Stack
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-semibold text-zinc-700 block mb-1">Frontend</span>
                {repo.techStack.frontend.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {repo.techStack.frontend.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400 italic">None detected</span>
                )}
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-semibold text-zinc-700 block mb-1">Backend</span>
                {repo.techStack.backend.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {repo.techStack.backend.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400 italic">None detected</span>
                )}
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-semibold text-zinc-700 block mb-1">Database</span>
                {repo.techStack.database.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {repo.techStack.database.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400 italic">None detected</span>
                )}
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-semibold text-zinc-700 block mb-1">AI / ML</span>
                {repo.techStack.aiMl.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {repo.techStack.aiMl.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400 italic">No AI dependencies detected</span>
                )}
              </div>
            </div>
          </section>

          {/* Database Entities & API Capabilities (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Database Entities */}
            <section className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-700" />
                Database Entities ({repo.databaseEntities.length})
              </h3>
              {repo.databaseEntities.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No schema models detected.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {repo.databaseEntities.map((ent, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-white border border-zinc-200 rounded"
                    >
                      <span className="font-mono font-medium text-zinc-900">{ent.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{ent.source}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* API Capabilities */}
            <section className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-zinc-700" />
                APIs & Capabilities ({repo.apiCapabilities.length})
              </h3>
              {repo.apiCapabilities.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No backend endpoints detected.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {repo.apiCapabilities.map((api, i) => (
                    <div key={i} className="text-xs p-2 bg-white border border-zinc-200 rounded">
                      <span className="font-semibold text-zinc-900 block">{api.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px] text-zinc-600">
                        {api.routes.map((r, ri) => (
                          <span key={ri} className="bg-zinc-100 px-1.5 py-0.5 rounded">
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
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Analyzed {repo.features.length} product features and {repo.databaseEntities.length} schema entities
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
