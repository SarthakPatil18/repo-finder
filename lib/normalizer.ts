import {
  RepoAnalysisResult,
  FeatureLandscape,
  CanonicalFeatureSummary,
  UniqueFeatureItem,
  RareFeatureItem,
  CommonFeatureItem,
  PotentialGapItem,
  FeatureTier,
} from "./types";

interface CanonicalMapping {
  canonical: string;
  category: string;
  patterns: RegExp[];
}

const CANONICAL_TAXONOMY: CanonicalMapping[] = [
  {
    canonical: "Fund Allocation & Utilization Tracking",
    category: "Finance & Budget",
    patterns: [
      /fund\s*(utilization|allocation|tracking|management|disbursement|expenditure|analytics|dashboard)/i,
      /financial\s*(tracking|dashboard|analytics|overview)/i,
      /budget\s*(tracking|allocation|analysis|monitoring)/i,
      /expenditure\s*(tracking|analysis)/i,
      /mplads\s*fund/i,
    ],
  },
  {
    canonical: "Interactive GIS & Map Visualization",
    category: "Mapping & GIS",
    patterns: [
      /(gis|interactive\s*gis|map|heatmap|geographic|constituency\s*map|district\s*map|spatial|geo)\s*(visualization|view|explorer|analytics)?/i,
      /leaflet|mapbox|google\s*maps|openstreet/i,
    ],
  },
  {
    canonical: "MP & Representative Dashboard",
    category: "Governance & Portals",
    patterns: [
      /mp\s*(dashboard|portal|overview|profile|performance)/i,
      /member\s*of\s*parliament\s*(dashboard|portal|tracking)/i,
      /representative\s*(dashboard|portal)/i,
    ],
  },
  {
    canonical: "Constituency & District Analytics",
    category: "Analytics & Insights",
    patterns: [
      /constituency\s*(dashboard|analytics|overview|breakdown|profile|stats)/i,
      /district(-|\s*)wise\s*(analytics|data|breakdown|dashboard)/i,
      /ward\s*(analytics|dashboard)/i,
      /regional\s*breakdown/i,
    ],
  },
  {
    canonical: "Project Progress & Status Tracking",
    category: "Project Management",
    patterns: [
      /project\s*(tracking|status|monitoring|progress|timeline|lifecycle|milestone)/i,
      /work\s*(status|progress|tracking|monitoring)/i,
      /milestone\s*tracking/i,
    ],
  },
  {
    canonical: "Automated PDF Report Generation",
    category: "Reporting & Export",
    patterns: [
      /pdf\s*(report|generation|export|download|summary|print)/i,
      /automated\s*reporting/i,
      /printable\s*report/i,
    ],
  },
  {
    canonical: "CSV & Data Export",
    category: "Reporting & Export",
    patterns: [
      /(csv|excel|spreadsheet|data)\s*export/i,
      /export\s*to\s*(csv|excel|json)/i,
      /download\s*(dataset|csv|data)/i,
    ],
  },
  {
    canonical: "Beneficiary & Citizen Registry",
    category: "Civic & Beneficiaries",
    patterns: [
      /beneficiary\s*(information|tracking|registry|directory|data|list|portal)/i,
      /citizen\s*(registry|beneficiaries|data)/i,
    ],
  },
  {
    canonical: "Contractor & Agency Management",
    category: "Governance & Operations",
    patterns: [
      /contractor\s*(management|directory|details|tracking|performance)/i,
      /implementing\s*agency/i,
      /vendor\s*(management|directory)/i,
    ],
  },
  {
    canonical: "Scheme Catalog & Multi-Criteria Filtering",
    category: "Discovery & Search",
    patterns: [
      /scheme\s*(filtering|catalog|directory|browser|category)/i,
      /multi(-|\s*)criteria\s*filter/i,
      /category\s*filter/i,
      /sector(-|\s*)wise\s*filter/i,
    ],
  },
  {
    canonical: "Full-Text Search & Discovery",
    category: "Discovery & Search",
    patterns: [
      /(global|full-text|instant|advanced|fuzzy)?\s*search/i,
      /search\s*(bar|filter|autocomplete|functionality)/i,
    ],
  },
  {
    canonical: "AI Query Assistant & Chatbot",
    category: "AI & Automation",
    patterns: [
      /ai\s*(assistant|chatbot|query|helper|copilot)/i,
      /llm(-|\s*)based\s*(query|assistant|chat)/i,
      /natural\s*language\s*(query|interface|search)/i,
      /chat\s*with\s*(data|docs)/i,
    ],
  },
  {
    canonical: "AI Document Summarization",
    category: "AI & Automation",
    patterns: [
      /(document|report|proposal|file|pdf)\s*summariz(ation|er)/i,
      /ai\s*summariz/i,
      /automated\s*summary/i,
    ],
  },
  {
    canonical: "AI Anomaly & Risk Detection",
    category: "AI & Automation",
    patterns: [
      /(anomaly|fraud|risk|irregularity|discrepancy)\s*detection/i,
      /predictive\s*risk/i,
      /fund\s*misallocation\s*alert/i,
    ],
  },
  {
    canonical: "Predictive Analytics & Forecasting",
    category: "Analytics & Insights",
    patterns: [
      /predict(ive|ion)\s*(analytics|modeling|forecast)/i,
      /fund\s*forecasting/i,
      /completion\s*time\s*forecast/i,
      /trend\s*forecast/i,
    ],
  },
  {
    canonical: "Real-Time Notifications & Alerts",
    category: "Communication & Alerts",
    patterns: [
      /real(-|\s*)time\s*(notifications|alerts|updates)/i,
      /email\s*(notifications|alerts)/i,
      /sms\s*alerts/i,
      /push\s*notifications/i,
    ],
  },
  {
    canonical: "Role-Based Access & Authentication",
    category: "Security & Access",
    patterns: [
      /(jwt|oauth|role(-|\s*)based|rbac|user)\s*(authentication|access|auth|login)/i,
      /admin\s*auth/i,
      /secure\s*login/i,
    ],
  },
  {
    canonical: "Admin Management Console",
    category: "Administration",
    patterns: [
      /admin\s*(panel|dashboard|console|portal)/i,
      /super\s*admin/i,
      /content\s*management/i,
      /master\s*data\s*management/i,
    ],
  },
  {
    canonical: "Citizen Grievance & Feedback Portal",
    category: "Civic & Beneficiaries",
    patterns: [
      /(citizen|public)\s*(feedback|grievance|complaint|petition|engagement)/i,
      /grievance\s*redressal/i,
      /public\s*participation/i,
    ],
  },
  {
    canonical: "Multi-Language Localization",
    category: "User Experience",
    patterns: [
      /multi(-|\s*)language/i,
      /i18n|localization|internationalization/i,
      /regional\s*languages/i,
      /hindi\s*support/i,
    ],
  },
  {
    canonical: "Audit Logging & History Tracking",
    category: "Governance & Operations",
    patterns: [
      /audit\s*(trail|log|logging|history)/i,
      /activity\s*(log|history)/i,
      /revision\s*tracking/i,
      /change\s*history/i,
    ],
  },
  {
    canonical: "Offline Support & PWA",
    category: "User Experience",
    patterns: [
      /offline\s*(support|mode|first)/i,
      /pwa|progressive\s*web\s*app/i,
      /service\s*worker/i,
    ],
  },
];

/**
 * Standard candidates for potential gap inspection
 */
const POTENTIAL_GAP_CANDIDATES: Array<{
  name: string;
  category: string;
  whyImportant: string;
}> = [
  {
    name: "Real-Time Notifications & Alerts",
    category: "Communication & Alerts",
    whyImportant:
      "Alerting stakeholders or citizens when project funds are sanctioned or project milestones change.",
  },
  {
    name: "Predictive Analytics & Forecasting",
    category: "Analytics & Insights",
    whyImportant:
      "Forecasting fund lapse risks or estimating project completion timelines using historical patterns.",
  },
  {
    name: "AI Anomaly & Risk Detection",
    category: "AI & Automation",
    whyImportant:
      "Automatically flagging irregular expenditure patterns, delayed milestones, or budget discrepancies.",
  },
  {
    name: "Citizen Grievance & Feedback Portal",
    category: "Civic & Beneficiaries",
    whyImportant:
      "Allowing local constituents to report ground realities, upload geo-tagged photos, or track resolutions.",
  },
  {
    name: "Automated PDF Report Generation",
    category: "Reporting & Export",
    whyImportant:
      "Generating one-click printable executive summary dossiers for constituency oversight meetings.",
  },
  {
    name: "Offline Support & PWA",
    category: "User Experience",
    whyImportant:
      "Enabling field officers or inspectors in remote regions with low connectivity to record project updates.",
  },
  {
    name: "Multi-Language Localization",
    category: "User Experience",
    whyImportant:
      "Providing native vernacular access (e.g. Hindi, Tamil, Bengali) for inclusive civic accessibility.",
  },
  {
    name: "Audit Logging & History Tracking",
    category: "Governance & Operations",
    whyImportant:
      "Immutable tracking of financial allocations, administrative approvals, and milestone updates.",
  },
];

/**
 * Normalizes an extracted feature string to its canonical name and category.
 */
export function normalizeFeature(rawName: string): {
  canonicalName: string;
  category: string;
} {
  const clean = rawName.trim();

  for (const item of CANONICAL_TAXONOMY) {
    for (const pat of item.patterns) {
      if (pat.test(clean)) {
        return {
          canonicalName: item.canonical,
          category: item.category,
        };
      }
    }
  }

  // Fallback: title-case the cleaned raw name
  const formatted = clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return {
    canonicalName: formatted,
    category: "Application Features",
  };
}

/**
 * Builds the complete Feature Landscape from analyzed repositories:
 * - Calculates feature frequencies and assigns tiers (common, moderate, rare, unique)
 * - Identifies unique features (found in 1 repository)
 * - Identifies rare features (found in 2-20% or 2-3 repositories)
 * - Identifies common table-stakes features (>50%)
 * - Identifies potential gaps ("Not detected in the analyzed repositories")
 * - Generates the Repository x Feature matrix
 */
export function buildFeatureLandscape(
  repos: RepoAnalysisResult[]
): FeatureLandscape {
  const totalRepos = repos.length;

  if (totalRepos === 0) {
    return {
      totalRepos: 0,
      features: [],
      uniqueFeatures: [],
      rareFeatures: [],
      commonFeatures: [],
      potentialGaps: [],
      matrix: { features: [], repos: [] },
    };
  }

  // Canonical feature accumulator
  const featureMap = new Map<
    string,
    {
      category: string;
      variants: Set<string>;
      repos: Map<
        string,
        {
          repoName: string;
          repoUrl: string;
          deploymentUrl?: string;
          evidence: string;
          status: "confirmed" | "claimed";
        }
      >;
    }
  >();

  // Process all repos and their features
  for (const repo of repos) {
    const deploymentUrl = repo.deployments?.[0];

    for (const feat of repo.features) {
      const canonical = feat.name;
      const category = feat.category || "Application Features";

      if (!featureMap.has(canonical)) {
        featureMap.set(canonical, {
          category,
          variants: new Set(),
          repos: new Map(),
        });
      }

      const entry = featureMap.get(canonical)!;
      entry.variants.add(feat.originalName || feat.name);

      // Prefer confirmed status and better evidence if multiple
      const existing = entry.repos.get(repo.repoUrl);
      if (!existing || (existing.status === "claimed" && feat.status === "confirmed")) {
        entry.repos.set(repo.repoUrl, {
          repoName: repo.repoName,
          repoUrl: repo.repoUrl,
          deploymentUrl,
          evidence: feat.evidence || "Found in repository implementation",
          status: feat.status,
        });
      }
    }
  }

  const canonicalSummaries: CanonicalFeatureSummary[] = [];
  const uniqueFeatures: UniqueFeatureItem[] = [];
  const rareFeatures: RareFeatureItem[] = [];
  const commonFeatures: CommonFeatureItem[] = [];

  for (const [canonicalName, data] of featureMap.entries()) {
    const matchingRepos = Array.from(data.repos.values());
    const count = matchingRepos.length;
    const frequency = count / totalRepos;
    const frequencyPercent = Math.round(frequency * 100);

    let tier: FeatureTier = "moderate";
    if (count === 1) {
      tier = "unique";
    } else if (frequency > 0.5) {
      tier = "common";
    } else if (frequency <= 0.2 || count <= Math.max(2, Math.floor(totalRepos * 0.2))) {
      tier = "rare";
    } else {
      tier = "moderate";
    }

    canonicalSummaries.push({
      name: canonicalName,
      category: data.category,
      count,
      frequency,
      frequencyPercent,
      tier,
      variants: Array.from(data.variants),
      repos: matchingRepos,
    });

    // Populate Unique Features
    if (tier === "unique" && matchingRepos.length === 1) {
      const singleRepo = matchingRepos[0];
      uniqueFeatures.push({
        featureName: canonicalName,
        repoName: singleRepo.repoName,
        repoUrl: singleRepo.repoUrl,
        deploymentUrl: singleRepo.deploymentUrl,
        evidence: singleRepo.evidence,
        category: data.category,
      });
    }

    // Populate Rare Features
    if (tier === "rare") {
      rareFeatures.push({
        featureName: canonicalName,
        count,
        total: totalRepos,
        frequencyPercent,
        repos: matchingRepos.map((r) => ({
          repoName: r.repoName,
          repoUrl: r.repoUrl,
          deploymentUrl: r.deploymentUrl,
        })),
      });
    }

    // Populate Common Features
    if (tier === "common") {
      commonFeatures.push({
        featureName: canonicalName,
        count,
        total: totalRepos,
        frequencyPercent,
      });
    }
  }

  // Sort canonical summaries by count descending
  canonicalSummaries.sort((a, b) => b.count - a.count);
  rareFeatures.sort((a, b) => a.count - b.count);
  commonFeatures.sort((a, b) => b.count - a.count);

  // Annotate each repo with its unique features
  const uniqueFeatureNames = new Set(uniqueFeatures.map((u) => u.featureName));
  for (const repo of repos) {
    repo.uniqueFeatures = repo.features.filter((f) => uniqueFeatureNames.has(f.name));
  }

  // Analyze Potential Gaps
  const potentialGaps: PotentialGapItem[] = [];
  for (const candidate of POTENTIAL_GAP_CANDIDATES) {
    const existing = canonicalSummaries.find(
      (c) => c.name.toLowerCase() === candidate.name.toLowerCase()
    );

    if (!existing || existing.count === 0) {
      potentialGaps.push({
        gap: `No repository appears to implement ${candidate.name}.`,
        reasoning: `${candidate.whyImportant} (Not detected in the analyzed repositories).`,
      });
    } else if (existing.count === 1) {
      potentialGaps.push({
        gap: `Only 1 repository contains ${candidate.name}.`,
        reasoning: `${candidate.whyImportant} Represents a high-impact differentiation opportunity.`,
      });
    } else if (existing.frequencyPercent <= 15) {
      potentialGaps.push({
        gap: `${candidate.name} is uncommon (${existing.count} of ${totalRepos} repositories, ${existing.frequencyPercent}%).`,
        reasoning: `${candidate.whyImportant} Missing from most projects.`,
      });
    }
  }

  // Build Cross-Repository Feature Matrix
  // Take top canonical features (up to 25 most relevant for display)
  const matrixFeatureNames = canonicalSummaries.slice(0, 30).map((f) => f.name);

  const matrixRepos = repos.map((repo) => {
    const repoFeatureSet = new Set(repo.features.map((f) => f.name));
    const hasFeature: Record<string, boolean> = {};
    for (const feat of matrixFeatureNames) {
      hasFeature[feat] = repoFeatureSet.has(feat);
    }
    return {
      repoName: repo.repoName,
      repoUrl: repo.repoUrl,
      hasFeature,
    };
  });

  return {
    totalRepos,
    features: canonicalSummaries,
    uniqueFeatures,
    rareFeatures,
    commonFeatures,
    potentialGaps,
    matrix: {
      features: matrixFeatureNames,
      repos: matrixRepos,
    },
  };
}
