import { NextRequest } from "next/server";
import { parseGitHubQuery } from "@/lib/parser";
import { runScan } from "@/lib/scanner";
import { ScanEvent } from "@/lib/types";

import fs from "fs";
import path from "path";

function getEffectiveToken(clientToken?: string): string {
  if (clientToken && clientToken.trim()) return clientToken.trim();
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^GITHUB_TOKEN=(.*)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // ignore
  }
  return "";
}

function getEffectiveGeminiKey(clientKey?: string): string {
  if (clientKey && clientKey.trim()) return clientKey.trim();
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^GEMINI_API_KEY=(.*)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // ignore
  }
  return "";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput = body.query || body.searchUrl || "";
  const clientToken = body.token || "";
  const clientGeminiKey = body.geminiKey || "";
  const maxRepos = typeof body.maxRepos === "number" ? body.maxRepos : 1000;

  const parsedQuery = parseGitHubQuery(rawInput);

  if (!parsedQuery) {
    return new Response(
      JSON.stringify({ error: "Please enter a valid GitHub search URL or query." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = getEffectiveToken(clientToken);
  const geminiKey = getEffectiveGeminiKey(clientGeminiKey);

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
          geminiKey: geminiKey || undefined,
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
