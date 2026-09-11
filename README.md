# GitHub Deployment Finder

A lightweight, high-performance web tool that scans GitHub search results to discover and verify live deployment and website URLs (Vercel, Netlify, Render, Cloudflare Pages, GitHub Pages, Fly.io, Railway, Firebase, Heroku, custom domains, etc.).

## Features

- **GitHub Search & URL Parser**: Accepts full GitHub repository search URLs (`https://github.com/search?q=mplads&type=repositories`), queries with qualifiers (`language:javascript`, `stars:>50`), or plain search terms (`mplads`).
- **Deep Candidate Extraction**: Inspects repository metadata (`homepage`), GitHub Pages (`has_pages`), GitHub Deployments API (`environment_url`), README content (markdown links and hosting domain patterns), and `package.json`.
- **Live HTTP Verification**: Validates every candidate URL with HTTP requests to ensure it is actively reachable and working.
- **Real-Time Streaming Results**: Uses Server-Sent Events (SSE) to display progress and stream verified live deployments as they are discovered.
- **CSV Export**: One-click download of all discovered mappings (`Repository URL,Deployment URL`).
- **Clean Monochrome Design**: Minimalist, high-contrast black-and-white interface.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

Create a `.env.local` file with your GitHub token to increase API rate limits:

```bash
GITHUB_TOKEN=ghp_your_personal_access_token
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

The app is built with Next.js App Router and can be deployed directly to Vercel with zero configuration:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
