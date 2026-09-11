import { NextRequest } from "next/server";
import { parseGitHubQuery } from "@/lib/parser";
import { runScan } from "@/lib/scanner";
import { ScanEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput = body.query || body.searchUrl || "";
  const clientToken = body.token || "";
  const maxRepos = typeof body.maxRepos === "number" ? body.maxRepos : 1000;

  const parsedQuery = parseGitHubQuery(rawInput);

  if (!parsedQuery) {
    return new Response(
      JSON.stringify({ error: "Please enter a valid GitHub search URL or query." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Server token takes precedence if set, otherwise client token
  const token = (process.env.GITHUB_TOKEN || clientToken || "").trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: ScanEvent) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      try {
        await runScan({
          query: parsedQuery,
          token: token || undefined,
          maxRepos,
          onEvent: sendEvent,
          signal: req.signal,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unexpected scan error";
        sendEvent({ type: "error", data: { message: msg } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
