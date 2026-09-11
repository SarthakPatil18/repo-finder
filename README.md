# GitHub Deployment & Feature Discovery

An intelligent, high-performance web tool that scans GitHub search results to:
1. **Discover & verify live deployments** (Vercel, Netlify, Render, Cloudflare Pages, GitHub Pages, Railway, Firebase, custom domains).
2. **Automatically analyze repositories and extract product features**, technology stacks, database entities, and API capabilities.
3. **Compare repositories into a solution landscape**, identifying common baseline features, rare capabilities, unique standout features, and potential product gaps.

---

## Key Capabilities

### 1. Repository Analysis & Feature Extraction
- **Codebase Inspection**: Fetches repository git trees, READMEs, package manifests, and database models.
- **Product Features vs. Technology Stack**: Strictly separates implementation tools (React, FastAPI, PostgreSQL) from actual product capabilities (Interactive GIS Map, Fund Allocation Tracking, PDF Report Generation).
- **Database Entity Extraction**: Inspects `schema.prisma`, `schema.sql`, `models.py`, and ORM definitions to discover core data entities without exposing sensitive information.
- **API Capability Summarization**: Summarizes backend routes into clean business capabilities (e.g. "Project Management API", "Fund Tracking API").
- **Verified AI/ML Detection**: Identifies LLM SDKs, vector databases, RAG pipelines, and serialized models, validating actual code usage.
- **Evidence-Based Accuracy**: Classifies every feature as **Confirmed** (backed by source code, routes, or schema) or **Claimed** ("Claimed / implementation not verified").

### 2. Feature Normalization & Competitive Landscape
- **Canonical Feature Taxonomy**: Normalizes varied terminology into canonical concepts (e.g. "MP Fund Dashboard" -> "Fund Allocation & Utilization Tracking").
- **Frequency Tiers**:
  - **Common (>50%)**: Table-stakes domain baseline.
  - **Moderate (20–50%)**: Popular capabilities.
  - **Rare (2–20%)**: Uncommon features representing differentiation opportunities.
  - **Unique (1 repository)**: Standout, exclusive features with clickable repository and live deployment links.
- **Potential Gaps Analysis**: Highlights capabilities absent or rare across analyzed projects with qualified evidence.

### 3. Global Research Dashboard
- **[Repositories] Tab**: Live deployment verification table with feature count and tech badges.
- **[Features] Tab**: Unique features summary table, rare features, table-stakes breakdown, gap analysis, and interactive frequency filter.
- **[Comparison] Tab**: Cross-repository Feature Matrix (Repository × Feature) with filters and side-by-side project comparison.
- **Repository Detail Drawer/Modal**: Deep inspection of individual projects (Purpose, Confirmed/Claimed features with evidence, Tech stack, Database entities, and APIs).

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

Create a `.env.local` file:

```bash
# GitHub Token (Optional: increases search to 30 req/min and REST to 5,000 req/hr)
GITHUB_TOKEN=ghp_your_personal_access_token

# Google Gemini API Key (Optional: for LLM semantic feature extraction)
GEMINI_API_KEY=your_gemini_api_key
```

*Note: The tool works 100% out of the box with its built-in deterministic AST/regex engine without requiring an API key.*

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
