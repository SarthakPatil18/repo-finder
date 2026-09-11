import { RepoAnalysisResult, FeatureItem } from "./types";
import { normalizeFeature } from "./normalizer";

interface LlmExtractionResponse {
  purpose?: string;
  features?: Array<{
    name: string;
    evidence: string;
  }>;
  database_entities?: string[];
  ai_features?: Array<{
    name: string;
    evidence: string;
  }>;
}

/**
 * Calls Gemini LLM to enrich semantic feature extraction when an API key is provided.
 * Follows strict rules:
 * - Only sends condensed high-signal evidence.
 * - Expects strictly validated structured JSON output.
 * - Adheres to Rule 19: Never invents features; requires concrete implementation evidence.
 */
export async function enhanceWithLlm(
  analysis: RepoAnalysisResult,
  apiKey?: string,
  signal?: AbortSignal
): Promise<RepoAnalysisResult> {
  if (!apiKey || !apiKey.trim()) {
    return analysis;
  }

  const prompt = `You are a software architect analyzing a repository.
Repository: ${analysis.repoName}
Existing Purpose: ${analysis.purpose}
Discovered Tech Stack:
- Frontend: ${analysis.techStack.frontend.join(", ") || "None"}
- Backend: ${analysis.techStack.backend.join(", ") || "None"}
- Database: ${analysis.techStack.database.join(", ") || "None"}
- AI/ML: ${analysis.techStack.aiMl.join(", ") || "None"}
Discovered Database Entities: ${analysis.databaseEntities.map((e) => e.name).join(", ") || "None"}
Discovered APIs: ${analysis.apiCapabilities.map((a) => a.name).join(", ") || "None"}
Discovered Features So Far: ${analysis.features.map((f) => `${f.name} (${f.status})`).join("; ") || "None"}

TASK:
1. Provide a clear, accurate 1-2 sentence Purpose explaining what problem this project solves.
2. Identify any additional high-value PRODUCT/APPLICATION features (e.g., "Automated PDF Report Generation", "AI Scheme Recommendation", "GIS Heatmap").
   CRITICAL ACCURACY RULE:
   - Differentiate Product Features from Technology Stack (Next.js, Tailwind, React, FastAPI are NOT product features).
   - ONLY include features supported by the evidence above. Never hallucinate or invent features.
   - For every feature provide concrete evidence.
3. List any additional confirmed database entities or AI capabilities if verified.

Return ONLY a valid JSON object matching this schema:
{
  "purpose": "A concise summary of the problem solved",
  "features": [
    {
      "name": "Feature Name",
      "evidence": "Specific evidence based on routes, entities, or components"
    }
  ],
  "database_entities": ["Entity1", "Entity2"],
  "ai_features": [
    {
      "name": "AI Feature Name",
      "evidence": "Concrete evidence"
    }
  ]
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: signal ? signal : AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return analysis;
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return analysis;

    const parsed: LlmExtractionResponse = JSON.parse(candidateText);

    // Update purpose if richer
    if (parsed.purpose && parsed.purpose.length > 20) {
      analysis.purpose = parsed.purpose;
    }

    // Merge validated features
    if (Array.isArray(parsed.features)) {
      const existingNames = new Set(analysis.features.map((f) => f.name.toLowerCase()));
      for (const item of parsed.features) {
        if (item.name && item.evidence && typeof item.name === "string") {
          const { canonicalName, category } = normalizeFeature(item.name);
          if (!existingNames.has(canonicalName.toLowerCase())) {
            existingNames.add(canonicalName.toLowerCase());
            const newFeat: FeatureItem = {
              name: canonicalName,
              originalName: item.name,
              category,
              status: "confirmed",
              evidence: item.evidence,
              evidenceType: "code",
            };
            analysis.features.push(newFeat);
          }
        }
      }
    }

    // Merge database entities
    if (Array.isArray(parsed.database_entities)) {
      const existingEntities = new Set(analysis.databaseEntities.map((e) => e.name.toLowerCase()));
      for (const ent of parsed.database_entities) {
        if (typeof ent === "string" && ent.trim() && !existingEntities.has(ent.toLowerCase())) {
          existingEntities.add(ent.toLowerCase());
          analysis.databaseEntities.push({
            name: ent.trim(),
            source: "LLM semantic extraction",
          });
        }
      }
    }

    // Merge AI features
    if (Array.isArray(parsed.ai_features) && parsed.ai_features.length > 0) {
      for (const a of parsed.ai_features) {
        if (a.name && a.evidence) {
          analysis.aiMl.hasAi = true;
          analysis.aiMl.features.push({
            name: a.name,
            evidence: a.evidence,
            verified: true,
          });
        }
      }
    }

    return analysis;
  } catch {
    // Graceful fallback to deterministic analysis
    return analysis;
  }
}
