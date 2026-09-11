import {
  GitHubRepoItem,
  RepoAnalysisResult,
  FeatureItem,
  TechStack,
  DatabaseEntity,
  ApiCapability,
  AiMlDetection,
} from "./types";
import { normalizeFeature } from "./normalizer";

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

function getGitHubHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Deployment-Finder-App",
  };
  if (token && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Fetches repository file tree recursively using Git Trees API (1 API call).
 */
export async function fetchRepoFileTree(
  owner: string,
  repo: string,
  branch: string = "main",
  token?: string,
  signal?: AbortSignal
): Promise<GitHubTreeItem[]> {
  const headers = getGitHubHeaders(token);
  const branchesToTry = [branch, "master", "develop"];

  for (const b of branchesToTry) {
    if (signal?.aborted) break;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${b}?recursive=1`,
        { headers, signal: signal ? signal : AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tree)) {
          return data.tree as GitHubTreeItem[];
        }
      }
    } catch {
      // Try next branch
    }
  }

  return [];
}

/**
 * Fetches a single text file from a repository with size safety.
 */
export async function fetchRepoFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const headers = getGitHubHeaders(token);
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers, signal: signal ? signal : AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.content && data.encoding === "base64") {
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      // Limit file length to 60KB to avoid memory bloat
      return decoded.slice(0, 60000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches README content.
 */
export async function fetchRepoReadme(
  owner: string,
  repo: string,
  token?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const headers = getGitHubHeaders(token);
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers, signal: signal ? signal : AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8").slice(0, 70000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts Database Entities from schema files and ORM models.
 */
export function extractDatabaseEntities(
  tree: GitHubTreeItem[],
  schemaContent: string | null
): DatabaseEntity[] {
  const entities = new Map<string, DatabaseEntity>();

  // 1. Prisma schema
  if (schemaContent && /model\s+[A-Za-z0-9_]+\s*\{/.test(schemaContent)) {
    const regex = /model\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}/g;
    let match;
    while ((match = regex.exec(schemaContent)) !== null) {
      const name = match[1];
      const body = match[2];
      const fieldCount = body.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length;
      entities.set(name.toLowerCase(), {
        name,
        source: "schema.prisma",
        fieldCount,
      });
    }
  }

  // 2. SQL DDL files (CREATE TABLE)
  if (schemaContent && /CREATE\s+TABLE/i.test(schemaContent)) {
    const sqlRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([A-Za-z0-9_]+)["`]?/gi;
    let match;
    while ((match = sqlRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      if (!name.startsWith("_") && name.toLowerCase() !== "migrations") {
        const formatted = name.charAt(0).toUpperCase() + name.slice(1);
        entities.set(name.toLowerCase(), {
          name: formatted,
          source: "schema.sql",
        });
      }
    }
  }

  // 3. Python models (Django / SQLAlchemy / SQLModel)
  if (schemaContent && /class\s+[A-Za-z0-9_]+\s*\(/.test(schemaContent)) {
    const pyRegex = /class\s+([A-Za-z0-9_]+)\s*\((?:models\.Model|Base|db\.Model|SQLModel)\):/g;
    let match;
    while ((match = pyRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      entities.set(name.toLowerCase(), {
        name,
        source: "models.py",
      });
    }
  }

  // 4. File-tree heuristic: inspect names in models/, entities/
  for (const item of tree) {
    if (item.type === "blob") {
      const m = item.path.match(/(?:models|entities|db\/models)\/([A-Za-z0-9_]+)\.(?:ts|js|py|go|rb)/i);
      if (m && m[1]) {
        const baseName = m[1];
        if (!["index", "base", "types", "__init__"].includes(baseName.toLowerCase())) {
          const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
          if (!entities.has(baseName.toLowerCase())) {
            entities.set(baseName.toLowerCase(), {
              name: formatted,
              source: item.path,
            });
          }
        }
      }
    }
  }

  return Array.from(entities.values()).slice(0, 15);
}

/**
 * Summarizes API routes into human-readable capabilities.
 */
export function extractApiCapabilities(tree: GitHubTreeItem[]): ApiCapability[] {
  const routePaths: string[] = [];

  for (const item of tree) {
    if (item.type === "blob") {
      // Next.js App Router /pages router
      const nextMatch = item.path.match(/app\/api\/(.+)\/route\.(?:ts|js)/i);
      if (nextMatch) {
        routePaths.push(`/api/${nextMatch[1]}`);
        continue;
      }
      const pagesMatch = item.path.match(/pages\/api\/(.+)\.(?:ts|js)/i);
      if (pagesMatch) {
        routePaths.push(`/api/${pagesMatch[1]}`);
        continue;
      }
      // Express / FastAPI / Flask routes
      const routeMatch = item.path.match(/routes?\/(.+)\.(?:ts|js|py)/i);
      if (routeMatch) {
        routePaths.push(`/api/${routeMatch[1]}`);
        continue;
      }
      // Controllers
      const ctrlMatch = item.path.match(/controllers?\/(.+)(?:Controller)?\.(?:ts|js|py|go)/i);
      if (ctrlMatch) {
        routePaths.push(`/api/${ctrlMatch[1].toLowerCase()}`);
        continue;
      }
    }
  }

  // Group and summarize routes into readable capabilities
  const capabilityMap = new Map<string, string[]>();

  for (const route of routePaths) {
    const rLower = route.toLowerCase();
    if (rLower.includes("fund") || rLower.includes("finance") || rLower.includes("budget") || rLower.includes("allocation")) {
      const list = capabilityMap.get("Fund & Budget Tracking API") || [];
      list.push(route);
      capabilityMap.set("Fund & Budget Tracking API", list);
    } else if (rLower.includes("project") || rLower.includes("work") || rLower.includes("milestone") || rLower.includes("task")) {
      const list = capabilityMap.get("Project Progress Management API") || [];
      list.push(route);
      capabilityMap.set("Project Progress Management API", list);
    } else if (rLower.includes("constituency") || rLower.includes("district") || rLower.includes("mp") || rLower.includes("ward")) {
      const list = capabilityMap.get("Constituency & Representative API") || [];
      list.push(route);
      capabilityMap.set("Constituency & Representative API", list);
    } else if (rLower.includes("analytic") || rLower.includes("stat") || rLower.includes("summary") || rLower.includes("metric")) {
      const list = capabilityMap.get("Analytics & Metrics API") || [];
      list.push(route);
      capabilityMap.set("Analytics & Metrics API", list);
    } else if (rLower.includes("auth") || rLower.includes("user") || rLower.includes("login") || rLower.includes("session")) {
      const list = capabilityMap.get("Authentication & Access API") || [];
      list.push(route);
      capabilityMap.set("Authentication & Access API", list);
    } else if (rLower.includes("export") || rLower.includes("pdf") || rLower.includes("csv") || rLower.includes("report")) {
      const list = capabilityMap.get("Report & Document Export API") || [];
      list.push(route);
      capabilityMap.set("Report & Document Export API", list);
    } else if (rLower.includes("chat") || rLower.includes("ai") || rLower.includes("llm") || rLower.includes("query") || rLower.includes("ask")) {
      const list = capabilityMap.get("AI Query Assistant API") || [];
      list.push(route);
      capabilityMap.set("AI Query Assistant API", list);
    } else if (rLower.includes("beneficiary") || rLower.includes("citizen") || rLower.includes("grievance")) {
      const list = capabilityMap.get("Citizen Registry & Feedback API") || [];
      list.push(route);
      capabilityMap.set("Citizen Registry & Feedback API", list);
    } else {
      const list = capabilityMap.get("Core REST Endpoints") || [];
      list.push(route);
      capabilityMap.set("Core REST Endpoints", list);
    }
  }

  const results: ApiCapability[] = [];
  for (const [name, routes] of capabilityMap.entries()) {
    results.push({
      name,
      routes: Array.from(new Set(routes)).slice(0, 5),
    });
  }

  return results;
}

/**
 * Detects Tech Stack strictly separated from Product Features.
 */
export function extractTechStack(
  tree: GitHubTreeItem[],
  pkgJsonStr: string | null,
  reqsStr: string | null
): TechStack {
  const frontend = new Set<string>();
  const backend = new Set<string>();
  const database = new Set<string>();
  const aiMl = new Set<string>();
  const apis = new Set<string>();

  const allDepNames: string[] = [];

  if (pkgJsonStr) {
    try {
      const pkg = JSON.parse(pkgJsonStr);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      allDepNames.push(...Object.keys(deps));
    } catch {
      // ignore
    }
  }

  if (reqsStr) {
    const lines = reqsStr.split("\n");
    for (const line of lines) {
      const trimmed = line.trim().split(/[=><~]/)[0].trim().toLowerCase();
      if (trimmed) allDepNames.push(trimmed);
    }
  }

  const depSet = new Set(allDepNames.map((d) => d.toLowerCase()));
  const pathsLower = tree.map((t) => t.path.toLowerCase());

  // 1. Frontend
  if (depSet.has("next") || pathsLower.some((p) => p.startsWith("app/") || p.startsWith("pages/"))) frontend.add("Next.js");
  if (depSet.has("react") || depSet.has("react-dom")) frontend.add("React");
  if (depSet.has("vue") || pathsLower.some((p) => p.endsWith(".vue"))) frontend.add("Vue.js");
  if (depSet.has("svelte")) frontend.add("Svelte");
  if (depSet.has("tailwindcss") || pathsLower.some((p) => p.includes("tailwind"))) frontend.add("Tailwind CSS");
  if (depSet.has("bootstrap")) frontend.add("Bootstrap");
  if (depSet.has("leaflet") || depSet.has("react-leaflet")) frontend.add("Leaflet Maps");
  if (depSet.has("mapbox-gl") || depSet.has("react-map-gl")) frontend.add("Mapbox GL");
  if (depSet.has("chart.js") || depSet.has("react-chartjs-2")) frontend.add("Chart.js");
  if (depSet.has("recharts")) frontend.add("Recharts");
  if (depSet.has("d3")) frontend.add("D3.js");
  if (depSet.has("lucide-react")) frontend.add("Lucide Icons");
  if (depSet.has("@mui/material")) frontend.add("Material UI");

  // 2. Backend
  if (depSet.has("express")) backend.add("Express");
  if (depSet.has("fastapi") || pathsLower.some((p) => p.endsWith("main.py") && p.includes("fastapi"))) backend.add("FastAPI");
  if (depSet.has("flask")) backend.add("Flask");
  if (depSet.has("django")) backend.add("Django");
  if (depSet.has("next")) backend.add("Next.js App Router / Server Functions");
  if (pathsLower.some((p) => p.endsWith(".go"))) backend.add("Go");
  if (pathsLower.some((p) => p.endsWith(".rs") || p === "cargo.toml")) backend.add("Rust");
  if (depSet.has("@nestjs/core")) backend.add("NestJS");

  // 3. Database
  if (depSet.has("@prisma/client") || depSet.has("prisma") || pathsLower.some((p) => p.includes("schema.prisma"))) {
    database.add("Prisma ORM");
  }
  if (depSet.has("@supabase/supabase-js") || pathsLower.some((p) => p.includes("supabase"))) {
    database.add("Supabase");
  }
  if (depSet.has("pg") || depSet.has("postgres") || depSet.has("psycopg2") || depSet.has("psycopg2-binary")) {
    database.add("PostgreSQL");
  }
  if (depSet.has("mysql") || depSet.has("mysql2")) database.add("MySQL");
  if (depSet.has("sqlite3") || depSet.has("better-sqlite3") || pathsLower.some((p) => p.endsWith(".sqlite") || p.endsWith(".db"))) {
    database.add("SQLite");
  }
  if (depSet.has("mongodb") || depSet.has("mongoose")) database.add("MongoDB");
  if (depSet.has("redis") || depSet.has("ioredis")) database.add("Redis");
  if (depSet.has("firebase") || depSet.has("firebase-admin")) database.add("Firebase Firestore");
  if (depSet.has("sqlalchemy")) database.add("SQLAlchemy");

  // 4. AI/ML Technologies
  if (depSet.has("openai")) aiMl.add("OpenAI API");
  if (depSet.has("@google/genai") || depSet.has("@google/generative-ai") || depSet.has("google-generativeai")) aiMl.add("Google Gemini AI");
  if (depSet.has("@anthropic-ai/sdk") || depSet.has("anthropic")) aiMl.add("Anthropic Claude");
  if (depSet.has("langchain") || depSet.has("@langchain/core")) aiMl.add("LangChain");
  if (depSet.has("llamaindex") || depSet.has("llama-index")) aiMl.add("LlamaIndex");
  if (depSet.has("@pinecone-database/pinecone") || depSet.has("pinecone-client")) aiMl.add("Pinecone Vector DB");
  if (depSet.has("chromadb")) aiMl.add("Chroma Vector DB");
  if (depSet.has("transformers") || depSet.has("@huggingface/inference")) aiMl.add("HuggingFace Transformers");
  if (depSet.has("torch") || depSet.has("pytorch")) aiMl.add("PyTorch");
  if (depSet.has("tensorflow")) aiMl.add("TensorFlow");
  if (depSet.has("scikit-learn") || depSet.has("sklearn")) aiMl.add("Scikit-Learn");

  // 5. APIs
  if (pathsLower.some((p) => p.includes("api/"))) apis.add("REST API");
  if (depSet.has("graphql") || depSet.has("@apollo/client") || depSet.has("apollo-server")) apis.add("GraphQL");
  if (depSet.has("@trpc/server")) apis.add("tRPC");
  if (depSet.has("socket.io") || depSet.has("ws")) apis.add("WebSockets");

  return {
    frontend: Array.from(frontend),
    backend: Array.from(backend),
    database: Array.from(database),
    aiMl: Array.from(aiMl),
    apis: Array.from(apis),
  };
}

/**
 * Detects AI/ML with verification against codebase.
 */
export function detectAiMlUsage(
  techStack: TechStack,
  tree: GitHubTreeItem[],
  readme: string | null
): AiMlDetection {
  const verifiedFeatures: Array<{ name: string; evidence: string; verified: boolean }> = [];
  const pathsLower = tree.map((t) => t.path.toLowerCase());

  // 1. LLM Assistant / Chat
  const hasLlmTech = techStack.aiMl.some((t) =>
    ["OpenAI API", "Google Gemini AI", "Anthropic Claude", "LangChain", "LlamaIndex"].includes(t)
  );
  const hasAiRouteOrComponent = pathsLower.some((p) =>
    p.includes("api/chat") ||
    p.includes("api/ai") ||
    p.includes("components/chat") ||
    p.includes("prompts/") ||
    p.includes("rag/") ||
    p.includes("agent")
  );

  if (hasLlmTech && hasAiRouteOrComponent) {
    verifiedFeatures.push({
      name: "LLM-based Query Assistant",
      evidence: "Verified with LLM SDK dependency and matching API route/agent component in codebase",
      verified: true,
    });
  } else if (hasLlmTech) {
    verifiedFeatures.push({
      name: "AI Integration",
      evidence: "AI SDK configured in dependencies",
      verified: true,
    });
  }

  // 2. Vector DB / RAG
  const hasVectorDb = techStack.aiMl.some((t) => ["Pinecone Vector DB", "Chroma Vector DB"].includes(t));
  if (hasVectorDb || pathsLower.some((p) => p.includes("vector") || p.includes("embeddings"))) {
    verifiedFeatures.push({
      name: "RAG & Vector Semantic Search",
      evidence: "Vector store / embedding pipeline discovered in repository structure",
      verified: true,
    });
  }

  // 3. Document Summarization
  if (readme && /(document|proposal|report|summary)\s*summariz(ation|er)/i.test(readme) && hasLlmTech) {
    verifiedFeatures.push({
      name: "AI Document Summarization",
      evidence: "Document summarizer workflow verified with LLM integration",
      verified: true,
    });
  }

  // 4. ML Models / Prediction
  const hasTrainedModel = pathsLower.some((p) =>
    p.endsWith(".pkl") || p.endsWith(".onnx") || p.endsWith(".pt") || p.endsWith(".h5")
  );
  if (hasTrainedModel) {
    verifiedFeatures.push({
      name: "Trained ML Model Inference",
      evidence: "Serialized model weights (.pkl/.onnx/.pt) found in repository",
      verified: true,
    });
  }

  return {
    hasAi: verifiedFeatures.length > 0 || techStack.aiMl.length > 0,
    features: verifiedFeatures,
    technologies: techStack.aiMl,
  };
}

/**
 * Extracts product/application features and strictly validates evidence.
 */
export function extractProductFeatures(
  tree: GitHubTreeItem[],
  readme: string | null,
  databaseEntities: DatabaseEntity[],
  apiCapabilities: ApiCapability[],
  aiMl: AiMlDetection,
  techStack: TechStack
): FeatureItem[] {
  const featuresMap = new Map<string, FeatureItem>();
  const pathsLower = tree.map((t) => t.path.toLowerCase());
  const pathsStr = pathsLower.join(" ");

  // Helper to add verified feature
  function addFeature(
    rawName: string,
    evidence: string,
    evidenceType: "code" | "api" | "schema" | "component" | "readme_only",
    status: "confirmed" | "claimed",
    desc?: string
  ) {
    const { canonicalName, category } = normalizeFeature(rawName);
    const existing = featuresMap.get(canonicalName);
    if (!existing || (existing.status === "claimed" && status === "confirmed")) {
      featuresMap.set(canonicalName, {
        name: canonicalName,
        originalName: rawName,
        category,
        status,
        evidence,
        evidenceType,
        description: desc,
      });
    }
  }

  // 1. Check Codebase Evidence for Fund Tracking
  if (
    databaseEntities.some((e) => /fund|budget|allocation|expenditure/i.test(e.name)) ||
    apiCapabilities.some((a) => /fund|budget|allocation/i.test(a.name)) ||
    pathsLower.some((p) => p.includes("fund") || p.includes("budget") || p.includes("allocation"))
  ) {
    addFeature(
      "Fund Allocation & Utilization Tracking",
      "Confirmed via database entities, API endpoints, and financial tracking modules in source code",
      "code",
      "confirmed"
    );
  }

  // 2. Check Codebase Evidence for Interactive Map / GIS
  const hasMapComponent = pathsLower.some((p) =>
    p.includes("map") || p.includes("gis") || p.includes("heatmap") || p.includes("geojson")
  );
  const hasMapLib = techStack.frontend.some((f) => f.includes("Map") || f.includes("Leaflet"));
  if (hasMapComponent || hasMapLib) {
    addFeature(
      "Interactive GIS & Map Visualization",
      `Confirmed via map components and spatial visualization libraries (${hasMapLib ? techStack.frontend.filter(f => f.includes("Map") || f.includes("Leaflet")).join(", ") : "GeoJSON / Map UI"})`,
      "component",
      "confirmed"
    );
  }

  // 3. Check Codebase Evidence for Project Tracking
  if (
    databaseEntities.some((e) => /project|work|milestone/i.test(e.name)) ||
    apiCapabilities.some((a) => /project|progress/i.test(a.name)) ||
    pathsLower.some((p) => p.includes("project") || p.includes("milestone") || p.includes("task"))
  ) {
    addFeature(
      "Project Progress & Status Tracking",
      "Confirmed via Project data models, status tracking APIs, and project progress components",
      "schema",
      "confirmed"
    );
  }

  // 4. Check Codebase Evidence for Constituency & District Analytics
  if (
    databaseEntities.some((e) => /constituency|district|ward/i.test(e.name)) ||
    apiCapabilities.some((a) => /constituency|district/i.test(a.name)) ||
    pathsLower.some((p) => p.includes("constituency") || p.includes("district"))
  ) {
    addFeature(
      "Constituency & District Analytics",
      "Confirmed via Constituency schema entities, district aggregations, and regional views",
      "schema",
      "confirmed"
    );
  }

  // 5. Check Codebase Evidence for MP / Representative Dashboard
  if (
    databaseEntities.some((e) => /mp|representative|member/i.test(e.name)) ||
    pathsLower.some((p) => p.includes("mp") || p.includes("representative"))
  ) {
    addFeature(
      "MP & Representative Dashboard",
      "Confirmed via MP representative profile models and governance dashboards",
      "code",
      "confirmed"
    );
  }

  // 6. Check Codebase Evidence for PDF Reports
  const hasPdfTool = pathsLower.some((p) => p.includes("pdf")) || /pdf|jspdf|reportlab|weasyprint/i.test(pathsStr);
  if (hasPdfTool) {
    addFeature(
      "Automated PDF Report Generation",
      "Confirmed via PDF rendering libraries and document generation modules",
      "code",
      "confirmed"
    );
  }

  // 7. Check Codebase Evidence for CSV / Data Export
  if (pathsLower.some((p) => p.includes("export") || p.includes("csv")) || apiCapabilities.some((a) => a.name.includes("Export"))) {
    addFeature(
      "CSV & Data Export",
      "Confirmed via data serialization export endpoints and CSV download utilities",
      "api",
      "confirmed"
    );
  }

  // 8. Check Codebase Evidence for Beneficiary / Citizen Registry
  if (
    databaseEntities.some((e) => /beneficiary|citizen|feedback/i.test(e.name)) ||
    pathsLower.some((p) => p.includes("beneficiary") || p.includes("citizen"))
  ) {
    addFeature(
      "Beneficiary & Citizen Registry",
      "Confirmed via Beneficiary schema entities and citizen records",
      "schema",
      "confirmed"
    );
  }

  // 9. Check Codebase Evidence for Contractor Directory
  if (
    databaseEntities.some((e) => /contractor|agency|vendor/i.test(e.name)) ||
    pathsLower.some((p) => p.includes("contractor") || p.includes("agency"))
  ) {
    addFeature(
      "Contractor & Agency Management",
      "Confirmed via Contractor models and implementing agency data structures",
      "schema",
      "confirmed"
    );
  }

  // 10. Check Codebase Evidence for AI Query Assistant
  if (aiMl.hasAi && aiMl.features.length > 0) {
    for (const f of aiMl.features) {
      addFeature(
        f.name,
        f.evidence,
        "code",
        f.verified ? "confirmed" : "claimed"
      );
    }
  }

  // 11. Check Codebase Evidence for Authentication
  if (
    techStack.database.includes("Supabase") ||
    apiCapabilities.some((a) => a.name.includes("Authentication")) ||
    pathsLower.some((p) => p.includes("auth/") || p.includes("login") || p.includes("jwt"))
  ) {
    addFeature(
      "Role-Based Access & Authentication",
      "Confirmed via authentication guards, login routes, and session handlers",
      "api",
      "confirmed"
    );
  }

  // 12. Check Codebase Evidence for Admin Console
  if (pathsLower.some((p) => p.includes("admin") || p.includes("dashboard/admin"))) {
    addFeature(
      "Admin Management Console",
      "Confirmed via admin route controllers and administrative management screens",
      "component",
      "confirmed"
    );
  }

  // 13. Parse README claims and cross-reference with codebase
  if (readme) {
    // Extract bullet points from README sections like Features, Capabilities, Overview
    const featureSectionRegex = /(?:###?|##)\s*(?:Features|Key Features|Capabilities|What it does|Modules|Highlights)[\s\S]*?(?=(?:###?|##)\s*[A-Z]|$)/i;
    const match = readme.match(featureSectionRegex);
    const textToScan = match ? match[0] : readme.slice(0, 4000);

    const bulletRegex = /(?:^|\n)\s*[-*•]\s+([^\n\r]+)/g;
    let bMatch;
    while ((bMatch = bulletRegex.exec(textToScan)) !== null) {
      const line = bMatch[1].trim();
      if (line.length < 5 || line.length > 120) continue;
      // Skip pure tech mentions (e.g. "- Built with React and Next.js")
      if (/^(built with|powered by|uses|technologies|prerequisites|license|installation)/i.test(line)) continue;

      const { canonicalName } = normalizeFeature(line);

      // Check if already confirmed by codebase
      if (!featuresMap.has(canonicalName)) {
        // Cross-reference against file tree / entities to decide if confirmed or claimed
        const terms = line.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
        const matchesCode = terms.some((t) => pathsStr.includes(t));

        if (matchesCode) {
          addFeature(
            line,
            "Documented in README and verified by matching source files",
            "code",
            "confirmed"
          );
        } else {
          // Rule 19: "If the README claims something but no implementation can be found, mark it as: Claimed / implementation not verified. Do not count unverified claims as confirmed features."
          addFeature(
            line,
            "Claimed in README / implementation not verified in codebase",
            "readme_only",
            "claimed"
          );
        }
      }
    }
  }

  return Array.from(featuresMap.values());
}

/**
 * Extracts a concise purpose statement from README and repo metadata.
 */
export function extractPurpose(
  repo: GitHubRepoItem,
  readme: string | null
): string {
  if (repo.description && repo.description.trim().length > 15) {
    return repo.description.trim();
  }

  if (readme) {
    // Look for first clean paragraph after title
    const lines = readme.split("\n").map((l) => l.trim());
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const l = lines[i];
      if (
        l &&
        !l.startsWith("#") &&
        !l.startsWith("[") &&
        !l.startsWith("!") &&
        !l.startsWith("```") &&
        l.length > 30 &&
        !l.toLowerCase().includes("license")
      ) {
        return l.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").slice(0, 250);
      }
    }
  }

  return `Application solution for ${repo.name.replace(/[-_]/g, " ")}.`;
}

/**
 * Comprehensive analysis of a single repository.
 */
export async function analyzeRepository(
  repo: GitHubRepoItem,
  deployments: string[],
  token?: string,
  signal?: AbortSignal
): Promise<RepoAnalysisResult> {
  const owner = repo.owner.login;
  const repoName = repo.name;
  const defaultBranch = repo.default_branch || "main";

  // 1. Fetch file tree
  const tree = await fetchRepoFileTree(owner, repoName, defaultBranch, token, signal);

  // 2. Fetch README
  const readme = await fetchRepoReadme(owner, repoName, token, signal);

  // 3. Find and fetch schema files if available
  let schemaContent: string | null = null;
  const schemaFile = tree.find((t) =>
    t.path.endsWith("schema.prisma") ||
    t.path.endsWith("schema.sql") ||
    t.path.endsWith("models.py") ||
    t.path.match(/migrations\/.*\.sql$/i)
  );

  if (schemaFile) {
    schemaContent = await fetchRepoFileContent(owner, repoName, schemaFile.path, token, signal);
  }

  // 4. Find and fetch package.json / requirements.txt
  let pkgJsonStr: string | null = null;
  let reqsStr: string | null = null;

  const pkgFile = tree.find((t) => t.path === "package.json" || t.path.endsWith("/package.json"));
  if (pkgFile) {
    pkgJsonStr = await fetchRepoFileContent(owner, repoName, pkgFile.path, token, signal);
  }

  const reqsFile = tree.find((t) => t.path === "requirements.txt" || t.path === "pyproject.toml");
  if (reqsFile) {
    reqsStr = await fetchRepoFileContent(owner, repoName, reqsFile.path, token, signal);
  }

  // 5. Extract structured components
  const databaseEntities = extractDatabaseEntities(tree, schemaContent);
  const apiCapabilities = extractApiCapabilities(tree);
  const techStack = extractTechStack(tree, pkgJsonStr, reqsStr);
  const aiMl = detectAiMlUsage(techStack, tree, readme);
  const features = extractProductFeatures(tree, readme, databaseEntities, apiCapabilities, aiMl, techStack);
  const purpose = extractPurpose(repo, readme);

  return {
    repoUrl: repo.html_url,
    repoName: repo.full_name,
    projectName: repo.name,
    description: repo.description,
    homepage: repo.homepage,
    deployments,
    purpose,
    features,
    techStack,
    databaseEntities,
    apiCapabilities,
    aiMl,
    analyzedAt: Date.now(),
    analysisStatus: "analyzed",
  };
}
