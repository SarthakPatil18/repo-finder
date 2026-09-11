/**
 * Parses input string which can be either a GitHub search URL or a raw query.
 *
 * Examples:
 * - "https://github.com/search?q=mplads&type=repositories" -> "mplads"
 * - "https://github.com/search?q=mplads+language%3Ajavascript&type=repositories" -> "mplads language:javascript"
 * - "mplads language:typescript stars:>50" -> "mplads language:typescript stars:>50"
 */
export function parseGitHubQuery(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Normalize URL with or without protocol
  let parsedUrl: URL | null = null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      // Fallback to raw input
    }
  } else if (trimmed.startsWith("github.com/")) {
    try {
      parsedUrl = new URL(`https://${trimmed}`);
    } catch {
      // Fallback to raw input
    }
  }

  if (
    parsedUrl &&
    (parsedUrl.hostname === "github.com" || parsedUrl.hostname.endsWith(".github.com"))
  ) {
    // 1. Look for 'q' parameter in search URLs
    const q = parsedUrl.searchParams.get("q");
    if (q !== null && q.trim()) {
      return q.trim();
    }

    // 2. Check if user pasted a direct repository URL (e.g. https://github.com/owner/repo)
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const reserved = new Set([
      "search",
      "settings",
      "features",
      "explore",
      "topics",
      "marketplace",
      "pricing",
      "organizations",
      "login",
      "join",
    ]);

    if (pathParts.length >= 2 && !reserved.has(pathParts[0].toLowerCase())) {
      return `repo:${pathParts[0]}/${pathParts[1]}`;
    }
  }

  return trimmed;
}
