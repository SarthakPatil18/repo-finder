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

  // Check if it's a URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === "github.com" || url.hostname.endsWith(".github.com")) {
        // Look for 'q' parameter
        const q = url.searchParams.get("q");
        if (q !== null && q.trim()) {
          return q.trim();
        }
      }
    } catch {
      // If parsing fails as URL, fallback to raw input
    }
  }

  // Handle case where user pasted "github.com/search?q=..." without protocol
  if (trimmed.startsWith("github.com/search") || trimmed.includes("github.com/search?")) {
    try {
      const url = new URL(`https://${trimmed.replace(/^https?:\/\//, "")}`);
      const q = url.searchParams.get("q");
      if (q !== null && q.trim()) {
        return q.trim();
      }
    } catch {
      // Fallback
    }
  }

  return trimmed;
}
