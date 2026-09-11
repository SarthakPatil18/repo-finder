export interface DeploymentResult {
  repoUrl: string;
  repoName: string;
  description?: string;
  deployments: string[];
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
      type: "done";
      data: {
        totalChecked: number;
        totalFound: number;
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
