"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  ArrowDown,
} from "lucide-react";
import {
  FeatureLandscape,
  FeatureTier,
  RepoAnalysisResult,
  CanonicalFeatureSummary,
} from "@/lib/types";

interface FeaturesViewProps {
  landscape: FeatureLandscape | null;
  analyzedRepos: RepoAnalysisResult[];
  onOpenRepoModal: (repo: RepoAnalysisResult) => void;
}

export function FeaturesView({
  landscape,
  analyzedRepos,
  onOpenRepoModal,
}: FeaturesViewProps) {
  const [tierFilter, setTierFilter] = useState<FeatureTier | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  if (!landscape || landscape.totalRepos === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-zinc-500">
        <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 mb-3 mx-auto shadow-xs">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-zinc-800">
          No feature landscape data yet
        </p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Start a repository scan above to automatically extract, normalize, and compare features across projects.
        </p>
      </div>
    );
  }

  // Filter features
  const filteredFeatures = landscape.features.filter((f) => {
    if (tierFilter !== "all" && f.tier !== tierFilter) return false;
    if (
      searchTerm.trim() &&
      !f.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !f.category.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !f.variants.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  // Export Landscape as CSV
  const handleExportLandscapeCsv = () => {
    const rows = [
      "Canonical Feature,Category,Tier,Repo Count,Total Repos,Frequency %,Variants,Repositories",
    ];

    for (const f of landscape.features) {
      const reposStr = f.repos.map((r) => r.repoName).join("; ");
      const variantsStr = f.variants.join("; ");
      rows.push(
        `"${f.name.replace(/"/g, '""')}","${f.category.replace(
          /"/g,
          '""'
        )}","${f.tier}",${f.count},${landscape.totalRepos},${f.frequencyPercent}%,"${variantsStr.replace(
          /"/g,
          '""'
        )}","${reposStr.replace(/"/g, '""')}"`
      );
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `feature-landscape-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-blue-500", "ring-offset-2", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
      }, 1800);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Unique Features Card */}
        <button
          type="button"
          onClick={() => scrollToSection("unique-features-section")}
          className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between text-left cursor-pointer group"
          title="Click to jump to Unique Features section"
        >
          <div className="flex items-center justify-between text-blue-700 mb-1 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Unique Features
            </span>
            <Sparkles className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="w-full">
            <div className="text-2xl font-bold text-blue-950 flex items-center justify-between">
              <span>{landscape.uniqueFeatures.length}</span>
              <span className="text-[10px] text-blue-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Jump</span>
                <ArrowDown className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-blue-700/80 mt-0.5">
              Found in exactly 1 project
            </p>
          </div>
        </button>

        {/* Rare Features Card */}
        <button
          type="button"
          onClick={() => scrollToSection("rare-features-section")}
          className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between text-left cursor-pointer group"
          title="Click to jump to Rare Features section"
        >
          <div className="flex items-center justify-between text-purple-700 mb-1 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Rare Features
            </span>
            <TrendingUp className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="w-full">
            <div className="text-2xl font-bold text-purple-950 flex items-center justify-between">
              <span>{landscape.rareFeatures.length}</span>
              <span className="text-[10px] text-purple-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Jump</span>
                <ArrowDown className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-purple-700/80 mt-0.5">
              Uncommon (≤20% of projects)
            </p>
          </div>
        </button>

        {/* Table Stakes Card */}
        <button
          type="button"
          onClick={() => scrollToSection("common-features-section")}
          className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between text-left cursor-pointer group"
          title="Click to jump to Table Stakes (Common Features) section"
        >
          <div className="flex items-center justify-between text-zinc-700 mb-1 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Table Stakes
            </span>
            <BarChart3 className="w-4 h-4 text-zinc-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="w-full">
            <div className="text-2xl font-bold text-zinc-950 flex items-center justify-between">
              <span>{landscape.commonFeatures.length}</span>
              <span className="text-[10px] text-zinc-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Jump</span>
                <ArrowDown className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Common baseline (&gt;50%)
            </p>
          </div>
        </button>

        {/* Potential Gaps Card */}
        <button
          type="button"
          onClick={() => scrollToSection("potential-gaps-section")}
          className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between text-left cursor-pointer group"
          title="Click to jump to Potential Gaps section"
        >
          <div className="flex items-center justify-between text-amber-700 mb-1 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Potential Gaps
            </span>
            <HelpCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="w-full">
            <div className="text-2xl font-bold text-amber-950 flex items-center justify-between">
              <span>{landscape.potentialGaps.length}</span>
              <span className="text-[10px] text-amber-800 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Jump</span>
                <ArrowDown className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              Differentiation opportunities
            </p>
          </div>
        </button>
      </div>

      {/* 1. Dedicated Unique Features Summary (Section 10 & 14) */}
      <section
        id="unique-features-section"
        className="scroll-mt-6 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs"
      >
        <div className="px-5 py-4 bg-zinc-50/90 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Unique Features Discovered Across Repositories
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Standout capabilities implemented in only 1 repository in this search set
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full self-start sm:self-auto">
            {landscape.uniqueFeatures.length} Unique
          </span>
        </div>

        {landscape.uniqueFeatures.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No single-repository unique features detected among analyzed projects.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-1/3">Feature</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 w-1/4">Found In (Repository)</th>
                  <th className="py-3 px-4 w-1/4">Live Deployment</th>
                  <th className="py-3 px-4 w-1/6">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {landscape.uniqueFeatures.map((u, i) => {
                  const cleanUrl = u.repoUrl.replace(/\/+$/, "").toLowerCase();
                  const matchingRepoObj = analyzedRepos.find(
                    (r) => r.repoUrl.replace(/\/+$/, "").toLowerCase() === cleanUrl
                  );

                  return (
                    <tr
                      key={i}
                      className="hover:bg-zinc-50/80 transition-colors group"
                    >
                      {/* Feature Name */}
                      <td className="py-3.5 px-4 align-top font-semibold text-zinc-950">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{u.featureName}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {u.category}
                        </span>
                      </td>

                      {/* Repository Link */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {matchingRepoObj ? (
                            <button
                              onClick={() => onOpenRepoModal(matchingRepoObj)}
                              className="font-mono text-xs text-zinc-950 hover:text-blue-600 hover:underline font-semibold inline-flex items-center gap-1 text-left cursor-pointer break-all"
                              title="View repository details"
                            >
                              <span>{u.repoName}</span>
                            </button>
                          ) : (
                            <span className="font-mono text-xs text-zinc-950 font-semibold break-all">
                              {u.repoName}
                            </span>
                          )}

                          <a
                            href={u.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            title="Open on GitHub"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>

                          {matchingRepoObj && (
                            <button
                              onClick={() => onOpenRepoModal(matchingRepoObj)}
                              className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium cursor-pointer border border-zinc-200 shadow-2xs ml-1"
                              title="View full repository details"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Deployment Link */}
                      <td className="py-3.5 px-4 align-top">
                        {u.deploymentUrl ? (
                          <a
                            href={u.deploymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-emerald-700 hover:text-emerald-900 hover:underline font-medium inline-flex items-center gap-1 break-all"
                          >
                            <span>
                              {u.deploymentUrl.replace(/^https?:\/\//, "")}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-emerald-600" />
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic">No deployment</span>
                        )}
                      </td>

                      {/* Evidence */}
                      <td className="py-3.5 px-4 align-top text-zinc-600 text-[11px] leading-relaxed">
                        {u.evidence}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Rare Features & Common Features (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rare Features (Section 11) */}
        <section
          id="rare-features-section"
          className="scroll-mt-6 border border-purple-200/80 rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Rare Features ({landscape.rareFeatures.length})
              </h3>
              <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                2% – 20% frequency
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Implemented by a few repositories. Key areas for product differentiation.
            </p>

            {landscape.rareFeatures.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No rare features identified.</p>
            ) : (
              <div className="space-y-3">
                {landscape.rareFeatures.map((rf, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-purple-50/30 border border-purple-100 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-zinc-900">
                        {rf.featureName}
                      </span>
                      <span className="font-mono text-xs font-semibold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {rf.count} / {rf.total} repos ({rf.frequencyPercent}%)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center mt-2">
                      <span className="text-[11px] text-zinc-500 font-medium">Found in:</span>
                      {rf.repos.map((r, ri) => (
                        <a
                          key={ri}
                          href={r.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                        >
                          <span>{r.repoName.split("/")[1] || r.repoName}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Most Common Features (Section 12) */}
        <section
          id="common-features-section"
          className="scroll-mt-6 border border-zinc-200 rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-zinc-700" />
                Most Common Features ({landscape.commonFeatures.length})
              </h3>
              <span className="text-[11px] font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                &gt;50% table-stakes
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              The standard expectations for this domain across surveyed projects.
            </p>

            {landscape.commonFeatures.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No common baseline features yet.</p>
            ) : (
              <div className="space-y-3">
                {landscape.commonFeatures.map((cf, idx) => (
                  <div key={idx} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-zinc-900">{cf.featureName}</span>
                      <span className="font-mono text-zinc-700 font-semibold">
                        {cf.count} / {cf.total} ({cf.frequencyPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                        style={{ width: `${cf.frequencyPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 3. "What Is Missing?" Potential Gaps (Section 15) */}
      <section
        id="potential-gaps-section"
        className="scroll-mt-6 border border-amber-200 rounded-xl bg-amber-50/40 p-5 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-950">
              Potential Gaps & Strategic Differentiation
            </h3>
            <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
              Capabilities that appear in very few or no repositories in this search result.
              (Qualifying standard: Not detected in the analyzed repositories).
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {landscape.potentialGaps.map((gap, i) => (
                <div
                  key={i}
                  className="p-3 bg-white border border-amber-200/70 rounded-lg shadow-2xs text-xs"
                >
                  <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {gap.gap}
                  </p>
                  <p className="text-zinc-600 text-[11px] mt-1 leading-relaxed">
                    {gap.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Complete Feature Frequency Directory with Filters (Section 13) */}
      <section className="border border-zinc-200 rounded-xl bg-white shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/60">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">
              All Discovered Features ({landscape.features.length})
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Canonical features normalized from across all analyzed repositories
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportLandscapeCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-700" />
              <span>Export Features CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              onClick={() => setTierFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                tierFilter === "all"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200"
              }`}
            >
              All ({landscape.features.length})
            </button>
            <button
              onClick={() => setTierFilter("unique")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                tierFilter === "unique"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              Unique ({landscape.uniqueFeatures.length})
            </button>
            <button
              onClick={() => setTierFilter("rare")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                tierFilter === "rare"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
              }`}
            >
              Rare ({landscape.rareFeatures.length})
            </button>
            <button
              onClick={() => setTierFilter("moderate")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                tierFilter === "moderate"
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              Moderate
            </button>
            <button
              onClick={() => setTierFilter("common")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                tierFilter === "common"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              Common ({landscape.commonFeatures.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter by feature name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Feature List Table */}
        <div className="divide-y divide-zinc-200">
          {filteredFeatures.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No features match your current filter.
            </div>
          ) : (
            filteredFeatures.map((feat) => {
              const isExpanded = expandedFeature === feat.name;
              return (
                <div key={feat.name} className="p-4 hover:bg-zinc-50/60 transition-colors">
                  <div
                    onClick={() =>
                      setExpandedFeature(isExpanded ? null : feat.name)
                    }
                    className="flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-zinc-950">
                          {feat.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            feat.tier === "unique"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : feat.tier === "rare"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : feat.tier === "common"
                              ? "bg-zinc-200 text-zinc-800 font-bold"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {feat.tier.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          {feat.category}
                        </span>
                      </div>

                      {feat.variants.length > 1 && (
                        <p className="text-[11px] text-zinc-500 mt-1">
                          <strong className="text-zinc-600">Variants: </strong>
                          {feat.variants.slice(0, 4).join(" • ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-zinc-950">
                          {feat.count} / {landscape.totalRepos}
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          {feat.frequencyPercent}%
                        </span>
                      </div>
                      <div className="text-zinc-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details: Repositories & Evidence */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-zinc-200 pl-2 space-y-2 animate-in fade-in">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Repositories implementing this feature:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {feat.repos.map((r, ri) => {
                          const cleanUrl = r.repoUrl.replace(/\/+$/, "").toLowerCase();
                          const rObj = analyzedRepos.find(
                            (x) => x.repoUrl.replace(/\/+$/, "").toLowerCase() === cleanUrl
                          );
                          return (
                            <div
                              key={ri}
                              className="p-2.5 bg-white rounded-lg border border-zinc-200 flex flex-col justify-between shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {rObj ? (
                                    <button
                                      onClick={() => onOpenRepoModal(rObj)}
                                      className="font-mono font-semibold text-xs text-zinc-950 hover:text-blue-600 hover:underline text-left cursor-pointer"
                                      title="View repository details"
                                    >
                                      <span>{r.repoName}</span>
                                    </button>
                                  ) : (
                                    <span className="font-mono font-semibold text-xs text-zinc-950">
                                      {r.repoName}
                                    </span>
                                  )}
                                  <a
                                    href={r.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                                    title="Open on GitHub"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                {rObj && (
                                  <button
                                    onClick={() => onOpenRepoModal(rObj)}
                                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium cursor-pointer border border-zinc-200 shadow-2xs"
                                  >
                                    View Details
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
                                <span className="font-medium text-zinc-800">Evidence: </span>
                                {r.evidence}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
