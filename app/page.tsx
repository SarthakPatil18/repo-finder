"use client";

import React, { useState, useRef } from "react";
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertCircle,
  Loader2,
  Square,
  Key,
  Globe,
  Sparkles,
  Layers,
  Table2,
  Cpu,
  Database,
  Eye,
  Settings,
} from "lucide-react";
import {
  DeploymentResult,
  ScanEvent,
  RepoAnalysisResult,
  FeatureLandscape,
} from "@/lib/types";
import { RepoDetailModal } from "./components/RepoDetailModal";
import { FeaturesView } from "./components/FeaturesView";
import { ComparisonMatrixView } from "./components/ComparisonMatrixView";

export default function HomePage() {
  const [queryInput, setQueryInput] = useState(
    "https://github.com/search?q=mplads&type=repositories"
  );
  const [customToken, setCustomToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Tab navigation: [Repositories] [Features] [Comparison] (Section 17)
  const [activeTab, setActiveTab] = useState<"repositories" | "features" | "comparison">(
    "repositories"
  );

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "finished" | "error">(
    "idle"
  );
  const [currentQuery, setCurrentQuery] = useState("");
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [currentRepo, setCurrentRepo] = useState("");
  const [results, setResults] = useState<DeploymentResult[]>([]);
  const [analyzedRepos, setAnalyzedRepos] = useState<RepoAnalysisResult[]>([]);
  const [landscape, setLandscape] = useState<FeatureLandscape | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Selected repo for detail modal (Section 16)
  const [selectedRepoForModal, setSelectedRepoForModal] = useState<RepoAnalysisResult | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  function displayCleanUrl(url: string) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => {
        setCopiedUrl((prev) => (prev === text ? null : prev));
      }, 2000);
    } catch {
      // Fallback
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setScanStatus("finished");
  };

  const handleStartScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim() || isScanning) return;

    // Reset state
    setErrorMessage("");
    setResults([]);
    setAnalyzedRepos([]);
    setLandscape(null);
    setScannedCount(0);
    setTotalToScan(0);
    setCurrentRepo("");
    setIsScanning(true);
    setScanStatus("scanning");
    setCurrentQuery(queryInput.trim());

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput.trim(),
          token: customToken.trim() || undefined,
          geminiKey: geminiKey.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const eventData: ScanEvent = JSON.parse(trimmed.slice(6));
              handleScanEvent(eventData);
            } catch {
              // Ignore partial chunk
            }
          }
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        try {
          const eventData: ScanEvent = JSON.parse(buffer.trim().slice(6));
          handleScanEvent(eventData);
        } catch {
          // ignore
        }
      }

      setScanStatus("finished");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setScanStatus("finished");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to scan repositories";
        setErrorMessage(msg);
        setScanStatus("error");
      }
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const handleScanEvent = (event: ScanEvent) => {
    switch (event.type) {
      case "init":
        setTotalToScan(event.data.willScanCount);
        break;
      case "progress":
        setScannedCount(event.data.checked);
        setTotalToScan(event.data.total);
        setCurrentRepo(event.data.currentRepo);
        break;
      case "found":
        setResults((prev) => {
          const exists = prev.some((item) => item.repoUrl === event.data.repoUrl);
          if (exists) return prev;
          return [...prev, event.data];
        });
        break;
      case "analyzed":
        setAnalyzedRepos((prev) => {
          const exists = prev.some((item) => item.repoUrl === event.data.repoUrl);
          if (exists) return prev;
          return [...prev, event.data];
        });
        break;
      case "landscape":
        setLandscape(event.data);
        setAnalyzedRepos((prev) => {
          const uniqueNames = new Set(
            event.data.uniqueFeatures.map((u) => u.featureName.toLowerCase())
          );
          return prev.map((r) => ({
            ...r,
            uniqueFeatures: r.features.filter((f) =>
              uniqueNames.has(f.name.toLowerCase())
            ),
          }));
        });
        setSelectedRepoForModal((curr) => {
          if (!curr) return null;
          const uniqueNames = new Set(
            event.data.uniqueFeatures.map((u) => u.featureName.toLowerCase())
          );
          return {
            ...curr,
            uniqueFeatures: curr.features.filter((f) =>
              uniqueNames.has(f.name.toLowerCase())
            ),
          };
        });
        break;
      case "done":
        setScannedCount(event.data.totalChecked);
        setScanStatus("finished");
        setIsScanning(false);
        break;
      case "error":
        setErrorMessage(event.data.message);
        setScanStatus("error");
        setIsScanning(false);
        break;
    }
  };

  const handleExportDeploymentsCsv = () => {
    if (results.length === 0) return;

    const rows: string[] = ["Repository URL,Deployment URL"];
    for (const item of results) {
      for (const dep of item.deployments) {
        const safeRepo = `"${item.repoUrl.replace(/"/g, '""')}"`;
        const safeDep = `"${dep.replace(/"/g, '""')}"`;
        rows.push(`${safeRepo},${safeDep}`);
      }
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `deployments-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalDeploymentsCount = results.reduce(
    (acc, curr) => acc + curr.deployments.length,
    0
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-950 flex items-center gap-2">
                GitHub Deployment & Feature Discovery
              </h1>
              <p className="text-xs text-zinc-500">
                Automated live site finder, feature intelligence & landscape comparison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
              title="Configure API Keys & Settings"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              <span>Settings</span>
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-black transition-colors"
              title="GitHub"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl px-4 sm:px-6 py-7 flex-1 flex flex-col">
        {/* Settings Drawer */}
        {showSettings && (
          <div className="mb-6 p-5 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm shadow-sm animate-in fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-950 flex items-center gap-2">
                <Settings className="w-4 h-4 text-black" />
                Configuration & API Keys
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-zinc-500 hover:text-black cursor-pointer font-medium"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GitHub Token */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  GitHub Personal Access Token (Optional)
                </label>
                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">
                  Increases GitHub rate limit from 10 to 30 req/min for search and 5,000 req/hr for repository trees and contents.
                </p>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-black font-mono shadow-2xs"
                />
              </div>

              {/* Gemini API Key */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  Google Gemini API Key (Optional)
                </label>
                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">
                  Enables optional LLM semantic analysis and high-level feature synthesis. Deterministic extraction operates seamlessly without it.
                </p>
                <input
                  type="password"
                  placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxx"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-black font-mono shadow-2xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Input Box */}
        <section className="mb-6">
          <form onSubmit={handleStartScan} className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span>Paste GitHub repository search URL or query:</span>
              <button
                type="button"
                onClick={() =>
                  setQueryInput(
                    "https://github.com/search?q=mplads&type=repositories"
                  )
                }
                className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Example: mplads search
              </button>
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="https://github.com/search?q=mplads&type=repositories or 'mplads'"
                  disabled={isScanning}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all shadow-xs disabled:bg-zinc-50 disabled:text-zinc-500 font-mono"
                />
              </div>

              <div className="flex gap-2">
                {isScanning ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!queryInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>Scan & Analyze Repositories</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Scan Notice</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Status & Metrics Bar */}
        {(scanStatus === "scanning" || scanStatus === "finished") && (
          <section className="mb-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                {isScanning ? (
                  <div className="flex items-center gap-2 text-zinc-950 font-semibold text-xs sm:text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Scanning & analyzing repositories...</span>
                  </div>
                ) : (
                  <div className="text-zinc-900 font-semibold text-xs sm:text-sm">
                    Analysis complete
                  </div>
                )}

                <span className="text-zinc-300">|</span>

                <div className="text-zinc-700 text-xs sm:text-sm">
                  <span className="text-zinc-500">Repositories: </span>
                  <span className="font-semibold text-zinc-950">{scannedCount}</span>
                  {totalToScan > 0 && (
                    <span className="text-zinc-500"> / {totalToScan}</span>
                  )}
                </div>

                <span className="text-zinc-300">|</span>

                <div className="text-zinc-700 text-xs sm:text-sm">
                  <span className="text-zinc-500">Deployments: </span>
                  <span className="font-semibold text-emerald-700">
                    {totalDeploymentsCount}
                  </span>
                </div>

                <span className="text-zinc-300">|</span>

                <div className="text-zinc-700 text-xs sm:text-sm">
                  <span className="text-zinc-500">Analyzed for Features: </span>
                  <span className="font-semibold text-blue-700">
                    {analyzedRepos.length}
                  </span>
                </div>
              </div>

              {results.length > 0 && (
                <button
                  onClick={handleExportDeploymentsCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-black" />
                  <span>Export Deployments CSV</span>
                </button>
              )}
            </div>

            {isScanning && totalToScan > 0 && (
              <div className="w-full">
                <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((scannedCount / totalToScan) * 100)
                      )}%`,
                    }}
                  />
                </div>
                {currentRepo && (
                  <p className="text-xs text-zinc-500 mt-1.5 truncate">
                    Currently inspecting:{" "}
                    <span className="text-zinc-900 font-mono font-medium">
                      {currentRepo}
                    </span>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Global Research Dashboard Tabs (Section 17) */}
        {(scanStatus === "scanning" || scanStatus === "finished" || analyzedRepos.length > 0) && (
          <div className="mb-6 border-b border-zinc-200 flex items-center justify-between gap-4">
            <nav className="flex items-center gap-1 -mb-px">
              <button
                onClick={() => setActiveTab("repositories")}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "repositories"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Repositories</span>
                <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600 font-mono">
                  {results.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("features")}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "features"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Features & Landscape</span>
                {landscape && (
                  <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-800 font-mono">
                    {landscape.features.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("comparison")}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "comparison"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <Table2 className="w-4 h-4" />
                <span>Cross-Repo Comparison</span>
                {landscape && (
                  <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600 font-mono">
                    {landscape.matrix.repos.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {/* Tab 1: Repositories View (Section 20: Keep Existing Deployment Feature + Enriched Summary) */}
        {activeTab === "repositories" && (
          <section className="flex-1 flex flex-col">
            {results.length > 0 ? (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6 w-1/2">Repository</th>
                        <th className="py-3.5 px-4 sm:px-6 w-1/2">Deployment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {results.map((item) => {
                        const matchingAnalysis = analyzedRepos.find(
                          (a) => a.repoUrl === item.repoUrl
                        );

                        return item.deployments.map((depUrl, depIdx) => (
                          <tr
                            key={`${item.repoUrl}-${depUrl}-${depIdx}`}
                            className="hover:bg-zinc-50/80 transition-colors group"
                          >
                            {/* Repository URL Column */}
                            <td className="py-4 px-4 sm:px-6 align-top">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    if (matchingAnalysis) {
                                      setSelectedRepoForModal(matchingAnalysis);
                                    } else {
                                      setSelectedRepoForModal({
                                        repoUrl: item.repoUrl,
                                        repoName: item.repoName,
                                        projectName: item.repoName.split("/")[1] || item.repoName,
                                        description: item.description || null,
                                        homepage: null,
                                        deployments: item.deployments,
                                        purpose: item.description || "Repository discovered via deployment search.",
                                        features: [],
                                        techStack: { frontend: [], backend: [], database: [], aiMl: [], apis: [] },
                                        databaseEntities: [],
                                        apiCapabilities: [],
                                        aiMl: { hasAi: false, features: [], technologies: [] },
                                        analyzedAt: Date.now(),
                                        analysisStatus: "partial",
                                      });
                                    }
                                  }}
                                  className="font-mono text-xs sm:text-sm font-semibold text-zinc-950 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1.5 break-all text-left cursor-pointer"
                                  title="View full repository details, features, and tech stack"
                                >
                                  <span>{displayCleanUrl(item.repoUrl)}</span>
                                </button>

                                <a
                                  href={item.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                                  title="Open on GitHub"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>

                                <button
                                  onClick={() => {
                                    if (matchingAnalysis) {
                                      setSelectedRepoForModal(matchingAnalysis);
                                    } else {
                                      setSelectedRepoForModal({
                                        repoUrl: item.repoUrl,
                                        repoName: item.repoName,
                                        projectName: item.repoName.split("/")[1] || item.repoName,
                                        description: item.description || null,
                                        homepage: null,
                                        deployments: item.deployments,
                                        purpose: item.description || "Repository discovered via deployment search.",
                                        features: [],
                                        techStack: { frontend: [], backend: [], database: [], aiMl: [], apis: [] },
                                        databaseEntities: [],
                                        apiCapabilities: [],
                                        aiMl: { hasAi: false, features: [], technologies: [] },
                                        analyzedAt: Date.now(),
                                        analysisStatus: "partial",
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors cursor-pointer border border-zinc-200 shadow-2xs ml-1"
                                  title="View extracted features, entities, and APIs"
                                >
                                  <Eye className="w-3 h-3 text-zinc-600" />
                                  <span>View Details</span>
                                </button>
                              </div>

                              {item.description && (
                                <p className="text-xs text-zinc-500 mt-1 line-clamp-1 max-w-md">
                                  {item.description}
                                </p>
                              )}

                              {/* Feature and Entity Badges */}
                              {matchingAnalysis && (
                                <div
                                  onClick={() => setSelectedRepoForModal(matchingAnalysis)}
                                  className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] cursor-pointer hover:opacity-85"
                                  title="Click to view repository details"
                                >
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                    {matchingAnalysis.features.length} features
                                  </span>
                                  {matchingAnalysis.databaseEntities.length > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-100">
                                      {matchingAnalysis.databaseEntities.length} schema entities
                                    </span>
                                  )}
                                  {matchingAnalysis.aiMl.hasAi && (
                                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-semibold border border-purple-100 flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                      AI/ML
                                    </span>
                                  )}
                                  {matchingAnalysis.uniqueFeatures &&
                                    matchingAnalysis.uniqueFeatures.length > 0 && (
                                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                                        ★ {matchingAnalysis.uniqueFeatures.length} Unique
                                      </span>
                                    )}
                                </div>
                              )}
                            </td>

                            {/* Deployment URL Column */}
                            <td className="py-4 px-4 sm:px-6 align-top">
                              <div className="flex items-center justify-between gap-3">
                                <a
                                  href={depUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline transition-colors flex items-center gap-1.5 break-all"
                                >
                                  <span>{displayCleanUrl(depUrl)}</span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                </a>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleCopy(depUrl)}
                                    className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-black transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
                                    title="Copy live URL"
                                  >
                                    {copiedUrl === depUrl ? (
                                      <Check className="w-4 h-4 text-black" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                  <a
                                    href={depUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-black transition-colors border border-transparent hover:border-zinc-200"
                                    title="Open live URL"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-600">
                  <span>
                    Showing <strong className="text-zinc-900">{totalDeploymentsCount}</strong> live deployment link
                    {totalDeploymentsCount === 1 ? "" : "s"} across{" "}
                    <strong className="text-zinc-900">{results.length}</strong> repositor
                    {results.length === 1 ? "y" : "ies"}
                  </span>
                  <button
                    onClick={handleExportDeploymentsCsv}
                    className="inline-flex items-center gap-1 text-black hover:underline font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            ) : scanStatus === "finished" ? (
              <div className="p-12 text-center border border-dashed border-zinc-300 rounded-xl bg-zinc-50 text-zinc-500">
                <p className="text-base font-semibold text-zinc-800">
                  No active deployments found
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Scanned {scannedCount} repositories for &ldquo;{currentQuery}&rdquo;,
                  but none had verified publicly reachable deployments. Switch to the Features tab to view extracted code intelligence.
                </p>
              </div>
            ) : scanStatus === "idle" ? (
              <div className="p-12 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 text-zinc-400 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 mb-3 shadow-xs">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  Ready to scan repositories
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Paste any GitHub repository search URL or query to discover verified live deployments and analyze implemented product features automatically.
                </p>
              </div>
            ) : null}
          </section>
        )}

        {/* Tab 2: Features & Landscape View (Sections 10, 11, 12, 13, 14, 15) */}
        {activeTab === "features" && (
          <FeaturesView
            landscape={landscape}
            analyzedRepos={analyzedRepos}
            onOpenRepoModal={(repo) => setSelectedRepoForModal(repo)}
          />
        )}

        {/* Tab 3: Cross-Repository Comparison View (Section 9) */}
        {activeTab === "comparison" && (
          <ComparisonMatrixView
            landscape={landscape}
            analyzedRepos={analyzedRepos}
            onOpenRepoModal={(repo) => setSelectedRepoForModal(repo)}
          />
        )}
      </main>

      {/* Repository Detail Modal (Section 16) */}
      <RepoDetailModal
        repo={selectedRepoForModal}
        landscape={landscape}
        onClose={() => setSelectedRepoForModal(null)}
      />
    </div>
  );
}
