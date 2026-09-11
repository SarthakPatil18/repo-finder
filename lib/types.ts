export interface DeploymentResult {
  repoUrl: string;
  repoName: string;
  description?: string;
  deployments: string[];
}

export type FeatureStatus = "confirmed" | "claimed";

export type FeatureEvidenceType = "code" | "api" | "schema" | "component" | "readme_only";

export interface FeatureItem {
  name: string;
  originalName: string;
  category: string;
  status: FeatureStatus; // "confirmed" if verified by code/schema/api/component, "claimed" if only claimed in README
  evidence: string;
  evidenceType: FeatureEvidenceType;
  description?: string;
}

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  aiMl: string[];
  apis: string[];
}

export interface DatabaseEntity {
  name: string;
  source: string; // e.g. "schema.prisma", "schema.sql", "models.py"
  fieldCount?: number;
}

export interface ApiCapability {
  name: string;
  routes: string[];
  description?: string;
}

export interface AiMlDetection {
  hasAi: boolean;
  features: Array<{
    name: string;
    evidence: string;
    verified: boolean;
  }>;
  technologies: string[];
}

export interface RepoAnalysisResult {
  repoUrl: string;
  repoName: string;
  projectName: string;
  description: string | null;
  homepage: string | null;
  deployments: string[];
  purpose: string;
  features: FeatureItem[];
  techStack: TechStack;
  databaseEntities: DatabaseEntity[];
  apiCapabilities: ApiCapability[];
  aiMl: AiMlDetection;
  analyzedAt: number;
  analysisStatus: "analyzed" | "partial" | "failed";
  uniqueFeatures?: FeatureItem[];
}

export type FeatureTier = "common" | "moderate" | "rare" | "unique";

export interface CanonicalFeatureSummary {
  name: string;
  category: string;
  count: number;
  frequency: number; // 0 to 1
  frequencyPercent: number; // 0 to 100
  tier: FeatureTier;
  variants: string[];
  repos: Array<{
    repoName: string;
    repoUrl: string;
    deploymentUrl?: string;
    evidence: string;
    status: FeatureStatus;
  }>;
}

export interface UniqueFeatureItem {
  featureName: string;
  repoName: string;
  repoUrl: string;
  deploymentUrl?: string;
  evidence: string;
  category: string;
}

export interface RareFeatureItem {
  featureName: string;
  count: number;
  total: number;
  frequencyPercent: number;
  repos: Array<{
    repoName: string;
    repoUrl: string;
    deploymentUrl?: string;
  }>;
}

export interface CommonFeatureItem {
  featureName: string;
  count: number;
  total: number;
  frequencyPercent: number;
}

export interface PotentialGapItem {
  gap: string;
  reasoning: string;
}

export interface CrossRepoMatrix {
  features: string[];
  repos: Array<{
    repoName: string;
    repoUrl: string;
    hasFeature: Record<string, boolean>;
  }>;
}

export interface FeatureLandscape {
  totalRepos: number;
  features: CanonicalFeatureSummary[];
  uniqueFeatures: UniqueFeatureItem[];
  rareFeatures: RareFeatureItem[];
  commonFeatures: CommonFeatureItem[];
  potentialGaps: PotentialGapItem[];
  matrix: CrossRepoMatrix;
}

export type ScanEvent =
  | {
      type: "init";
      data: {
        totalCount: number;
        scannedQuery: string;
        willScanCount: number;
      };
    }
  | {
      type: "progress";
      data: {
        checked: number;
        total: number;
        currentRepo: string;
      };
    }
  | {
      type: "found";
      data: DeploymentResult;
    }
  | {
      type: "analyzing";
      data: {
        repoName: string;
        checked: number;
        total: number;
      };
    }
  | {
      type: "analyzed";
      data: RepoAnalysisResult;
    }
  | {
      type: "landscape";
      data: FeatureLandscape;
    }
  | {
      type: "done";
      data: {
        totalChecked: number;
        totalFound: number;
        totalAnalyzed: number;
      };
    }
  | {
      type: "warning";
      data: {
        message: string;
      };
    }
  | {
      type: "error";
      data: {
        message: string;
      };
    };

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  has_pages: boolean;
  owner: {
    login: string;
  };
  default_branch?: string;
}
