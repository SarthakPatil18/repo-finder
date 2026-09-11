import {
  GitHubRepoItem,
  DeploymentResult,
  ScanEvent,
  RepoAnalysisResult,
} from "./types";
import {
  sanitizeCandidateUrl,
  verifyDeploymentUrl,
  isKnownHostingProvider,
} from "./verifier";
import { analyzeRepository } from "./analyzer";
import { enhanceWithLlm } from "./llm";
import { buildFeatureLandscape } from "./normalizer";

interface ScanOptions {
  query: string;
  token?: string;
  geminiKey?: string;
  maxRepos?: number;
  onEvent: (event: ScanEvent) => void;
  signal?: AbortSignal;
}

const PROVIDER_REGEX =
  /https?:\/\/[a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|onrender\.com|pages\.dev|github\.io|web\.app|firebaseapp\.com|railway\.app|up\.railway\.app|fly\.dev|herokuapp\.com|surge\.sh|amplifyapp\.com|deno\.dev|zeabur\.app)[^\s\)"'`]*/gi;

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi;

const DEPLOYMENT_LABEL_REGEX =
  /(live\s*(demo|site|website|url|app|version)?|demo|website|preview|view\s*project|deploy(ment)?|online\s*(demo|version)?|try\s*it|web\s*app)/i;

/**
 * Helper to build GitHub API headers
 */
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
 * Searches repositories on GitHub matching query.
 */
export async function searchGitHubRepos(
  query: string,
  token?: string,
  maxRepos: number = 1000,
  signal?: AbortSignal
): Promise<{ items: GitHubRepoItem[]; totalCount: number }> {
  const items: GitHubRepoItem[] = [];
  let page = 1;
  const perPage = 100;
  let totalCount = 0;

  while (items.length < maxRepos) {
    if (signal?.aborted) break;

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      query
    )}&page=${page}&per_page=${perPage}`;

    const res = await fetch(url, {
      headers: getGitHubHeaders(token),
      signal,
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        const rateLimitReset = res.headers.get("x-ratelimit-reset");
        const resetMinutes = rateLimitReset
          ? Math.ceil((parseInt(rateLimitReset, 10) * 1000 - Date.now()) / 60000)
          : null;
        throw new Error(
          `GitHub API rate limit exceeded.${
            token
              ? ""
              : " Consider adding a GITHUB_TOKEN in settings to increase limits."
          }${resetMinutes ? ` Try again in ${resetMinutes} minute(s).` : ""}`
        );
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(
        errJson.message || `GitHub Search API error (${res.status}): ${res.statusText}`
      );
    }

    const data = await res.json();
    totalCount = data.total_count || 0;
    const pageItems: GitHubRepoItem[] = data.items || [];

    if (pageItems.length === 0) break;

    items.push(...pageItems);

    if (items.length >= totalCount || pageItems.length < perPage) {
      break;
    }

    page++;
    if (page > 10) break; // GitHub search limit (1000 max items)
  }

  return {
    items: items.slice(0, maxRepos),
    totalCount,
  };
}

/**
 * Extracts candidate deployment URLs from repository metadata, deployments, README, and files.
 */
export async function findCandidateUrlsForRepo(
  repo: GitHubRepoItem,
  token?: string,
  signal?: AbortSignal
): Promise<string[]> {
  const candidates = new Set<string>();
  const owner = repo.owner.login;
  const repoName = repo.name;
  const headers = getGitHubHeaders(token);

  // 1. Repo homepage
  if (repo.homepage) {
    const sanitized = sanitizeCandidateUrl(repo.homepage);
    if (sanitized) candidates.add(sanitized);
  }

  // 2. GitHub Pages
  if (repo.has_pages) {
    const ghPagesUrl = `https://${owner.toLowerCase()}.github.io/${repoName}`;
    const sanitized = sanitizeCandidateUrl(ghPagesUrl);
    if (sanitized) candidates.add(sanitized);
  }

  // 3. GitHub Deployments API
  try {
    const depRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/deployments?per_page=5`,
      { headers, signal: AbortSignal.timeout(4000) }
    );
    if (depRes.ok) {
      const deployments = await depRes.json();
      if (Array.isArray(deployments)) {
        for (const dep of deployments) {
          if (dep.statuses_url) {
            try {
              const stRes = await fetch(dep.statuses_url, {
                headers,
                signal: AbortSignal.timeout(3000),
              });
              if (stRes.ok) {
                const statuses = await stRes.json();
                if (Array.isArray(statuses) && statuses.length > 0) {
                  for (const status of statuses) {
                    if (status.environment_url) {
                      const sanitized = sanitizeCandidateUrl(status.environment_url);
                      if (sanitized) candidates.add(sanitized);
                    }
                  }
                }
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. README scanning
  try {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/readme`,
      { headers, signal: AbortSignal.timeout(4000) }
    );
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        const decoded = Buffer.from(readmeData.content, "base64").toString("utf-8");

        // Match hosting provider URLs
        const providerMatches = decoded.match(PROVIDER_REGEX);
        if (providerMatches) {
          for (const match of providerMatches) {
            const sanitized = sanitizeCandidateUrl(match);
            if (sanitized) candidates.add(sanitized);
          }
        }

        // Match markdown links with deployment-related anchor text
        let linkMatch;
        while ((linkMatch = MARKDOWN_LINK_REGEX.exec(decoded)) !== null) {
          const anchorText = linkMatch[1];
          const linkHref = linkMatch[2];

          if (DEPLOYMENT_LABEL_REGEX.test(anchorText)) {
            const sanitized = sanitizeCandidateUrl(linkHref);
            if (sanitized) candidates.add(sanitized);
          } else {
            try {
              const urlObj = new URL(linkHref);
              if (isKnownHostingProvider(urlObj.hostname)) {
                const sanitized = sanitizeCandidateUrl(linkHref);
                if (sanitized) candidates.add(sanitized);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 5. Check package.json homepage field if no candidate yet
  if (candidates.size === 0) {
    try {
      const pkgRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/package.json`,
        { headers, signal: AbortSignal.timeout(3000) }
      );
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        if (pkgData.content) {
          const pkgJson = JSON.parse(
            Buffer.from(pkgData.content, "base64").toString("utf-8")
          );
          if (pkgJson.homepage) {
            const sanitized = sanitizeCandidateUrl(pkgJson.homepage);
            if (sanitized) candidates.add(sanitized);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(candidates);
}

/**
 * Process a single repository for deployment verification.
 */
export async function scanDeploymentsForRepo(
  repo: GitHubRepoItem,
  token?: string,
  signal?: AbortSignal
): Promise<string[]> {
  const candidates = await findCandidateUrlsForRepo(repo, token, signal);
  if (candidates.length === 0) return [];

  const validDeployments: string[] = [];
  const seenDeployments = new Set<string>();

  for (const candidate of candidates) {
    if (signal?.aborted) break;
    const verified = await verifyDeploymentUrl(candidate);
    if (verified && !seenDeployments.has(verified)) {
      seenDeployments.add(verified);
      validDeployments.push(verified);
    }
  }

  return validDeployments;
}

/**
 * Full Scanner and Feature Discovery pipeline:
 * 1. Search repositories
 * 2. Concurrently find & verify deployments
 * 3. Concurrently analyze repository features, entities, APIs, tech stack
 * 4. Build global feature landscape & comparison matrix
 */
export async function runScan(options: ScanOptions): Promise<void> {
  const { query, token, geminiKey, maxRepos = 1000, onEvent, signal } = options;

  let searchData: { items: GitHubRepoItem[]; totalCount: number };
  try {
    searchData = await searchGitHubRepos(query, token, maxRepos, signal);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: "error", data: { message } });
    return;
  }

  const { items, totalCount } = searchData;

  onEvent({
    type: "init",
    data: {
      totalCount,
      scannedQuery: query,
      willScanCount: items.length,
    },
  });

  if (items.length === 0) {
    onEvent({
      type: "done",
      data: {
        totalChecked: 0,
        totalFound: 0,
        totalAnalyzed: 0,
      },
    });
    return;
  }

  let checkedCount = 0;
  let foundCount = 0;
  const analyzedRepos: RepoAnalysisResult[] = [];
  const concurrency = 6;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      if (signal?.aborted) break;
      const index = currentIndex++;
      const repo = items[index];
      if (!repo) break;

      onEvent({
        type: "progress",
        data: {
          checked: checkedCount,
          total: items.length,
          currentRepo: repo.full_name,
        },
      });

      let validDeployments: string[] = [];
      try {
        // Step 1: Scan deployment URLs
        validDeployments = await scanDeploymentsForRepo(repo, token, signal);
        if (validDeployments.length > 0) {
          foundCount++;
          const depResult: DeploymentResult = {
            repoUrl: repo.html_url,
            repoName: repo.full_name,
            description: repo.description || undefined,
            deployments: validDeployments,
          };
          onEvent({
            type: "found",
            data: depResult,
          });
        }
      } catch {
        // Ignore deployment check error, continue to feature analysis
      }

      // Step 2: Deep Feature Analysis
      try {
        onEvent({
          type: "analyzing",
          data: {
            repoName: repo.full_name,
            checked: analyzedRepos.length,
            total: items.length,
          },
        });

        let analysis = await analyzeRepository(repo, validDeployments, token, signal);

        // Step 3: Optional LLM Enhancement
        if (geminiKey && geminiKey.trim()) {
          analysis = await enhanceWithLlm(analysis, geminiKey, signal);
        }

        analyzedRepos.push(analysis);

        onEvent({
          type: "analyzed",
          data: analysis,
        });
      } catch {
        // Continue processing remaining repos
      } finally {
        checkedCount++;
        onEvent({
          type: "progress",
          data: {
            checked: checkedCount,
            total: items.length,
            currentRepo: repo.full_name,
          },
        });
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);

  // Step 4: Aggregate Feature Landscape & Matrix
  if (analyzedRepos.length > 0) {
    const landscape = buildFeatureLandscape(analyzedRepos);
    onEvent({
      type: "landscape",
      data: landscape,
    });
  }

  onEvent({
    type: "done",
    data: {
      totalChecked: checkedCount,
      totalFound: foundCount,
      totalAnalyzed: analyzedRepos.length,
    },
  });
}
