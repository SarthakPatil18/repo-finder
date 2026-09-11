"use client";

import React, { useState } from "react";
import {
  Check,
  Minus,
  Table2,
  SlidersHorizontal,
  ExternalLink,
  Sparkles,
  ArrowRightLeft,
  Search,
} from "lucide-react";
import { FeatureLandscape, RepoAnalysisResult } from "@/lib/types";

interface ComparisonMatrixViewProps {
  landscape: FeatureLandscape | null;
  analyzedRepos: RepoAnalysisResult[];
  onOpenRepoModal: (repo: RepoAnalysisResult) => void;
}

export function ComparisonMatrixView({
  landscape,
  analyzedRepos,
  onOpenRepoModal,
}: ComparisonMatrixViewProps) {
  const [filterMode, setFilterMode] = useState<"all" | "unique_rare" | "common">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Side-by-side comparison state
  const [selectedRepoA, setSelectedRepoA] = useState<string>("");
  const [selectedRepoB, setSelectedRepoB] = useState<string>("");

  if (!landscape || landscape.matrix.repos.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-zinc-500">
        <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 mb-3 mx-auto shadow-xs">
          <Table2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-zinc-800">
          No comparison data available
        </p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Start a search scan to generate a cross-repository feature matrix and compare capabilities side by side.
        </p>
      </div>
    );
  }

  // Filter features based on mode and search
  const uniqueRareSet = new Set([
    ...landscape.uniqueFeatures.map((u) => u.featureName),
    ...landscape.rareFeatures.map((r) => r.featureName),
  ]);
  const commonSet = new Set(landscape.commonFeatures.map((c) => c.featureName));

  const filteredFeatures = landscape.matrix.features.filter((feat) => {
    if (filterMode === "unique_rare" && !uniqueRareSet.has(feat)) return false;
    if (filterMode === "common" && !commonSet.has(feat)) return false;
    if (searchTerm.trim() && !feat.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Repos for side by side compare
  const repoAObj = analyzedRepos.find((r) => r.repoUrl === selectedRepoA);
  const repoBObj = analyzedRepos.find((r) => r.repoUrl === selectedRepoB);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Cross-Repository Feature Matrix */}
      <section className="border border-zinc-200 rounded-xl bg-white shadow-xs overflow-hidden">
        {/* Matrix Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-zinc-700" />
              Cross-Repository Feature Matrix
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Comparative landscape of confirmed and detected capabilities across projects
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs bg-white border border-zinc-300 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterMode === "all"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                All Features
              </button>
              <button
                onClick={() => setFilterMode("unique_rare")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === "unique_rare"
                    ? "bg-blue-600 text-white"
                    : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Unique & Rare Only
              </button>
              <button
                onClick={() => setFilterMode("common")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterMode === "common"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Table-Stakes Only
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search matrix..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-zinc-100/95 backdrop-blur-xs shadow-2xs">
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-4 min-w-[240px] font-bold text-zinc-900 uppercase tracking-wider bg-zinc-100">
                  Feature
                </th>
                {landscape.matrix.repos.map((repo, i) => {
                  const rObj = analyzedRepos.find((r) => r.repoUrl === repo.repoUrl);
                  return (
                    <th
                      key={i}
                      className="py-3 px-3 min-w-[150px] font-semibold text-zinc-800 text-center border-l border-zinc-200"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className="font-mono text-xs truncate max-w-[140px] block"
                          title={repo.repoName}
                        >
                          {repo.repoName.split("/")[1] || repo.repoName}
                        </span>
                        {rObj && (
                          <button
                            onClick={() => onOpenRepoModal(rObj)}
                            className="text-[10px] text-blue-600 hover:underline cursor-pointer mt-0.5"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td
                    colSpan={landscape.matrix.repos.length + 1}
                    className="p-8 text-center text-xs text-zinc-500"
                  >
                    No features match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((featName, fIdx) => {
                  const isUnique = landscape.uniqueFeatures.some(
                    (u) => u.featureName === featName
                  );
                  const isRare = landscape.rareFeatures.some(
                    (r) => r.featureName === featName
                  );
                  return (
                    <tr
                      key={fIdx}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      {/* Feature Column */}
                      <td className="py-2.5 px-4 font-medium text-zinc-900 bg-white sticky left-0 z-10 shadow-2xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{featName}</span>
                          {isUnique && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                              UNIQUE
                            </span>
                          )}
                          {isRare && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                              RARE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Repositories columns */}
                      {landscape.matrix.repos.map((repo, rIdx) => {
                        const has = repo.hasFeature[featName];
                        return (
                          <td
                            key={rIdx}
                            className="py-2.5 px-3 text-center border-l border-zinc-200"
                          >
                            {has ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center text-zinc-300">
                                <Minus className="w-4 h-4" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Side-by-Side Direct Project Comparison */}
      <section className="border border-zinc-200 rounded-xl bg-white shadow-xs p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-zinc-700" />
            Side-by-Side Project Comparator
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Select any two analyzed repositories to inspect their differences directly
          </p>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Project A:
            </label>
            <select
              value={selectedRepoA}
              onChange={(e) => setSelectedRepoA(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-black cursor-pointer font-mono"
            >
              <option value="">Select Project A...</option>
              {analyzedRepos.map((r, i) => (
                <option key={i} value={r.repoUrl}>
                  {r.repoName} ({r.features.length} features)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Project B:
            </label>
            <select
              value={selectedRepoB}
              onChange={(e) => setSelectedRepoB(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-black cursor-pointer font-mono"
            >
              <option value="">Select Project B...</option>
              {analyzedRepos.map((r, i) => (
                <option key={i} value={r.repoUrl}>
                  {r.repoName} ({r.features.length} features)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side comparison output */}
        {repoAObj && repoBObj ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
            {/* Project A Details */}
            <div className="space-y-4">
              <div className="border-b border-zinc-200 pb-3">
                <h4 className="font-bold text-sm text-zinc-950">{repoAObj.projectName}</h4>
                <a
                  href={repoAObj.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-600 hover:text-black inline-flex items-center gap-1"
                >
                  <span>{repoAObj.repoName}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Purpose
                </span>
                <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                  {repoAObj.purpose}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Features ({repoAObj.features.length})
                </span>
                <div className="space-y-1">
                  {repoAObj.features.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs flex items-center justify-between p-1.5 bg-white border border-zinc-200 rounded"
                    >
                      <span>{f.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Tech Stack
                </span>
                <p className="text-xs text-zinc-700">
                  {repoAObj.techStack.frontend.concat(repoAObj.techStack.backend).join(", ") || "Standard"}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Database Entities ({repoAObj.databaseEntities.length})
                </span>
                <p className="text-xs font-mono text-zinc-700">
                  {repoAObj.databaseEntities.map((e) => e.name).join(", ") || "None"}
                </p>
              </div>
            </div>

            {/* Project B Details */}
            <div className="space-y-4 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="border-b border-zinc-200 pb-3">
                <h4 className="font-bold text-sm text-zinc-950">{repoBObj.projectName}</h4>
                <a
                  href={repoBObj.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-600 hover:text-black inline-flex items-center gap-1"
                >
                  <span>{repoBObj.repoName}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Purpose
                </span>
                <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                  {repoBObj.purpose}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Features ({repoBObj.features.length})
                </span>
                <div className="space-y-1">
                  {repoBObj.features.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs flex items-center justify-between p-1.5 bg-white border border-zinc-200 rounded"
                    >
                      <span>{f.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Tech Stack
                </span>
                <p className="text-xs text-zinc-700">
                  {repoBObj.techStack.frontend.concat(repoBObj.techStack.backend).join(", ") || "Standard"}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Database Entities ({repoBObj.databaseEntities.length})
                </span>
                <p className="text-xs font-mono text-zinc-700">
                  {repoBObj.databaseEntities.map((e) => e.name).join(", ") || "None"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            Select both Project A and Project B above to generate a side-by-side comparison.
          </div>
        )}
      </section>
    </div>
  );
}
