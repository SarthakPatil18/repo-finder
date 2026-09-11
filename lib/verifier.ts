/**
 * Verification & Filtering of candidate deployment URLs.
 */

// Hostnames that should never be considered a project deployment
const BLACKLISTED_HOSTS = new Set([
  "github.com",
  "api.github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "gitlab.com",
  "bitbucket.org",
  "npmjs.com",
  "www.npmjs.com",
  "yarnpkg.com",
  "pypi.org",
  "crates.io",
  "packagist.org",
  "rubygems.org",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "www.linkedin.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "facebook.com",
  "instagram.com",
  "reddit.com",
  "discord.gg",
  "discord.com",
  "medium.com",
  "t.me",
  "telegram.me",
  "slack.com",
  "shields.io",
  "img.shields.io",
  "badgen.net",
  "travis-ci.org",
  "travis-ci.com",
  "codecov.io",
  "circleci.com",
  "sonarcloud.io",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "w3.org",
  "schema.org",
  "gnu.org",
  "apache.org",
  "mit-license.org",
  "opensource.org",
  "google.com",
  "www.google.com",
  "play.google.com",
  "apps.apple.com",
  "wikipedia.org",
  "stackoverflow.com",
  "developer.mozilla.org",
  "github.io", // bare github.io without subdomain
  "pages.dev",
  "vercel.app",
  "netlify.app",
  "onrender.com",
]);

// Known deployment provider domains
const HOSTING_PROVIDER_PATTERNS = [
  /\.vercel\.app$/i,
  /\.netlify\.app$/i,
  /\.onrender\.com$/i,
  /\.pages\.dev$/i,
  /\.github\.io$/i,
  /\.web\.app$/i,
  /\.firebaseapp\.com$/i,
  /\.railway\.app$/i,
  /\.up\.railway\.app$/i,
  /\.fly\.dev$/i,
  /\.herokuapp\.com$/i,
  /\.surge\.sh$/i,
  /\.amplifyapp\.com$/i,
  /\.deno\.dev$/i,
  /\.zeabur\.app$/i,
  /\.repl\.co$/i,
  /\.replit\.app$/i,
  /\.glitch\.me$/i,
];

// File extensions that indicate assets, not live sites
const BLACKLISTED_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|ico|mp4|mov|pdf|zip|tar|gz|json|xml|txt|md|css|js|map)$/i;

export function isKnownHostingProvider(hostname: string): boolean {
  return HOSTING_PROVIDER_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Normalizes candidate URL: validates structure, cleans query params/hash, checks blacklists.
 */
export function sanitizeCandidateUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  let cleaned = rawUrl.trim();

  // Strip wrapping quotes, brackets, parentheses or markdown characters
  cleaned = cleaned.replace(/^[`'"<(\[]+|[`'">)\].,;]+$/g, "");

  // Prepend https if missing protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    if (cleaned.startsWith("//")) {
      cleaned = `https:${cleaned}`;
    } else if (
      HOSTING_PROVIDER_PATTERNS.some((pattern) => pattern.test(cleaned.split("/")[0])) ||
      cleaned.startsWith("www.")
    ) {
      cleaned = `https://${cleaned}`;
    } else {
      return null;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return null;
  }

  // Must be http or https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blacklist check
  if (BLACKLISTED_HOSTS.has(hostname)) {
    return null;
  }

  // Check localhost / ip patterns
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname === "0.0.0.0"
  ) {
    return null;
  }

  // Check file extension on pathname
  if (BLACKLISTED_EXTENSIONS.test(parsed.pathname)) {
    return null;
  }

  // Normalize: remove trailing slash if only pathname is "/"
  if (parsed.pathname === "/") {
    parsed.pathname = "";
  }
  // Strip tracking parameters
  parsed.searchParams.delete("utm_source");
  parsed.searchParams.delete("utm_medium");
  parsed.searchParams.delete("utm_campaign");
  parsed.searchParams.delete("ref");
  parsed.hash = "";

  const finalUrl = parsed.toString().replace(/\/$/, "");
  return finalUrl;
}

/**
 * Checks if a candidate URL is reachable over HTTP.
 * Follows redirects and tests response status.
 */
export async function verifyDeploymentUrl(url: string, timeoutMs: number = 6000): Promise<string | null> {
  const sanitized = sanitizeCandidateUrl(url);
  if (!sanitized) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Try HEAD first
    let response: Response | null = null;
    try {
      response = await fetch(sanitized, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch {
      // HEAD can fail on servers that disallow HEAD (405) or socket drop, fallback to GET
    }

    // Fallback to lightweight GET if HEAD failed or gave 405 Method Not Allowed
    if (!response || response.status === 405) {
      try {
        response = await fetch(sanitized, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Range: "bytes=0-1024",
          },
        });
      } catch {
        clearTimeout(timer);
        return null;
      }
    }

    clearTimeout(timer);

    if (!response) return null;

    // Check status
    // 200-399: definitely reachable
    // 401 or 403: some apps return 403 due to Cloudflare Bot Protection or auth,
    // if it's on a known hosting provider or custom domain with valid DNS, it's alive.
    if (response.status >= 200 && response.status < 400) {
      // If redirected, check if redirected URL ended up at a blacklisted host
      if (response.url && response.url !== sanitized) {
        const redirectedSanitized = sanitizeCandidateUrl(response.url);
        if (!redirectedSanitized) return null;
        return sanitized;
      }
      return sanitized;
    }

    // Known provider with 401/403 is often alive but protected
    try {
      const urlObj = new URL(sanitized);
      if (isKnownHostingProvider(urlObj.hostname) && (response.status === 401 || response.status === 403)) {
        return sanitized;
      }
    } catch {
      // ignore
    }

    return null;
  } catch {
    return null;
  }
}
