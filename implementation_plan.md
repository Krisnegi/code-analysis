# Code Analysis Agent — micro1 Hackathon Implementation Plan

> **Hackathon Project**: *"Code Analysis: Is this repository actually good?"*
> **Judging Total**: 100 Points | **Submission Deadline**: Per micro1 rules
> **Goal**: Build an agentic system that evaluates GitHub repositories and produces a structured, reproducible quality report — outperforming a simple LLM baseline.

---

## Complete Tech Stack

### Backend — API Server
| Layer | Technology | Purpose |
|:---|:---|:---|
| Runtime | **Node.js v20 LTS** | Server runtime |
| Framework | **Express.js (TypeScript)** | Lightweight REST API — accepts requests, enqueues jobs, returns status |
| Language | **TypeScript** | Type safety across all backend code |

### Backend — Worker Process
| Layer | Technology | Purpose |
|:---|:---|:---|
| Agent Framework | **LangChain.js** | ReAct agent orchestration, tool use, memory |
| LLM — Primary | **Google Gemini 2.0 Flash** | Agent backbone — free via Google AI Studio (15 RPM, 1M tokens/day, 1M context window) |
| LLM — Fallback | **Groq Llama 3.3 70B** | Free fallback via Groq (different provider — unaffected if Google is down or rate-limited) |
| Job Queue | **BullMQ** | Worker picks jobs from queue (`attempts: 1` — no job-level retry, all error handling is internal) |
| GitHub API | **Octokit REST** | Repo metadata, PRs, issues, commits (no container needed) |

### Infrastructure
| Layer | Technology | Purpose |
|:---|:---|:---|
| Queue & State Store | **Redis** | BullMQ job queue + job status tracking (pending/active/done/failed) |
| Clone Container | **`alpine/git` Docker image** | Isolated git clone with network — writes to named volume, never touches host |
| Analyzer Containers | **Custom `analyzer` Docker image** | Per-tool analysis containers — `--network none`, read-only volume mount |
| Shared Volume | **Docker named volumes** | Secure handoff of cloned repo between containers — host never touches it |
| Sandbox Controls | **Docker resource limits** | `--cpus 0.5 --memory 512m`, 30s test timeout, 120s container timeout |
| Orchestration | **Docker Compose** | Runs `api`, `worker`, `redis`, `frontend` as separate services |
| Package Manager | **pnpm** | Monorepo workspace management |
| Logging | **Winston** | Structured JSONL trajectory logging per analysis job |

### Frontend
| Layer | Technology | Purpose |
|:---|:---|:---|
| Build Tool | **Vite** | Fast dev server and bundling |
| Framework | **React 18 (TypeScript)** | UI component framework |
| Styling | **Tailwind CSS v3** | Utility-first rapid UI |
| Charts | **Recharts** | Scoring radar charts and bar graphs |
| Code Display | **react-syntax-highlighter** | Displaying flagged code snippets with evidence |
| Icons | **Lucide React** | Icon set |
| HTTP Client | **Axios** | API calls to backend |
| State | **Zustand** | Lightweight global state |

---

## Project Structure

```
code-analysis/
├── api/                            # Express API Server (lightweight — just queues jobs)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── analyze.ts          # POST /api/analyze → pushes job to BullMQ, returns jobId
│   │   │   ├── status.ts           # GET /api/status/:id → polls Redis for job state
│   │   │   ├── report.ts           # GET /api/report/:id → returns saved report.json
│   │   │   └── trajectory.ts       # GET /api/trajectory/:id → returns trajectory.jsonl
│   │   ├── queue/
│   │   │   └── analysisQueue.ts    # BullMQ Queue definition (shared with worker)
│   │   ├── types/
│   │   │   └── index.ts            # Shared TypeScript types (AnalysisJob, Report, etc.)
│   │   └── index.ts                # Express entry point
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── worker/                         # Worker Process (runs LangChain agent per job)
│   ├── src/
│   │   ├── index.ts                # BullMQ Worker — picks jobs, runs agent, updates status
│   │   ├── agent/
│   │   │   ├── codeAnalysisAgent.ts  # LangChain ReAct agent definition
│   │   │   ├── systemPrompt.ts       # 3-phase system prompt (Gather → Investigate → Score)
│   │   │   ├── rubric.ts             # Scoring thresholds: tool outputs → category scores
│   │   │   └── memory.ts             # Agent memory — accumulates all tool results
│   │   ├── tools/                  # TypeScript wrappers — agent calls these, they spawn containers
│   │   │   ├── cloneRepoTool.ts    # Spawns alpine/git container, writes to named volume
│   │   │   ├── staticAnalysisTool.ts   # Spawns analyzer container (--network none)
│   │   │   ├── testRunnerTool.ts       # Spawns analyzer container (--network none)
│   │   │   ├── dependencyScanTool.ts   # Spawns analyzer container (--network none)
│   │   │   ├── securityScanTool.ts     # Spawns analyzer container (--network none)
│   │   │   ├── readFileTool.ts         # Spawns analyzer container, cats specific file
│   │   │   ├── searchCodeTool.ts       # Spawns analyzer container, greps pattern
│   │   │   ├── listDirectoryTool.ts    # Spawns analyzer container, lists directory
│   │   │   ├── gitMetricsTool.ts       # Octokit GitHub API — no container
│   │   │   ├── scoringTool.ts          # Pure function: evidence JSON → rubric scores
│   │   │   └── volumeCleanupTool.ts    # docker volume rm — always runs after job
│   │   ├── sandbox/
│   │   │   └── sandboxOrchestrator.ts  # docker volume create/run/rm lifecycle manager
│   │   ├── baseline/
│   │   │   └── baselineAnalyzer.ts     # Simple baseline (Octokit + single LLM prompt)
│   │   └── logger/
│   │       └── trajectoryLogger.ts     # Winston — writes trajectory.jsonl per job
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── sandbox/                        # Docker images for isolated execution
│   ├── cloner/
│   │   └── Dockerfile              # FROM alpine/git — minimal, network-enabled, clone only
│   └── analyzer/
│       ├── Dockerfile              # ubuntu:22.04, node+python+eslint+pylint+gitleaks, NO git
│       └── scripts/
│           ├── static_analysis.sh  # ESLint/Pylint + tree-sitter complexity
│           ├── test_runner.sh      # Detect framework → npm install --ignore-scripts → run tests
│           ├── dependency_scan.sh  # npm audit / pip-audit
│           ├── security_scan.sh    # gitleaks + regex secrets scan
│           ├── read_file.sh        # cat a specific file → JSON (feedback loop)
│           ├── search_code.sh      # grep pattern → JSON array (feedback loop)
│           └── list_directory.sh   # ls a path → JSON (feedback loop)
│
├── frontend/                       # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── RepoInput.tsx
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── RadarChart.tsx
│   │   │   ├── CategoryBreakdown.tsx
│   │   │   ├── CodeSnippet.tsx
│   │   │   ├── TrajectoryViewer.tsx
│   │   │   ├── JobStatusPoller.tsx
│   │   │   └── ApprovalGate.tsx       # Human approval card shown before testRunnerTool executes
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Report.tsx
│   │   │   └── Benchmark.tsx
│   │   ├── store/
│   │   ├── api/
│   │   └── App.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── evaluation/
│   ├── repos.json                  # 10 benchmark repo URLs (curated mix)
│   ├── human_rankings.json         # Expert human ranking — ordinal order [repo3, repo1, ...] (set before any run)
│   ├── baseline_results.json       # Aggregated baseline scores for all 10 repos (for Spearman comparison)
│   ├── agent_results.json          # Aggregated agent scores for all 10 repos (for Spearman comparison)
│   ├── run_benchmark.ts            # Runs all 10 repos through agent + baseline, saves per-repo files
│   └── compare_results.ts          # Computes Spearman correlation for both, outputs comparison table
│
├── trajectories/                   # Per-repo results (auto-saved per job)
│   └── <repo-name>/
│       ├── trajectory.jsonl        # Full step-by-step agent thought + tool call + result
│       ├── report.json             # Agent full scored report with evidence (6 categories)
│       └── baseline_report.json    # Baseline scored report — same 6-category shape, weaker evidence
│
├── changelog/
│   └── CHANGELOG.md               # Improvement changelog (hackathon requirement)
│
├── docker-compose.yml              # api + worker + redis + frontend services
├── .env.example
└── README.md
```

---

## System Architecture

### Service Separation (Docker Compose)

```
docker-compose.yml
├── api      (Express, port 3001)  ← lightweight, always up, never crashes
├── worker   (BullMQ + LangChain)  ← can crash safely, auto-restarts
├── redis    (port 6379)           ← job queue + status store
└── frontend (Vite, port 5173)     ← React dashboard
```

**Why separate processes?**
- Worker runs LangChain agent for 2-5 minutes per repo. If run in the same process as the API, a crash or timeout kills the API server too.
- Worker can be scaled independently (concurrency = N workers processing N repos in parallel).
- Redis persists job state — if worker crashes mid-analysis, BullMQ retries automatically.

---

### Job Queue Flow (BullMQ + Redis)

```
User POSTs /api/analyze { url: "github.com/some/repo" }
       │
       ▼
API Server creates jobId → pushes to BullMQ queue with retry config:
   { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
   Returns immediately: { jobId: "abc-123", status: "pending" }
       │
       ▼ (job sits in Redis queue)

User polls GET /api/status/abc-123
   → { status: "pending" }
   → { status: "active", step: "running staticAnalysisTool" }
   → { status: "done", reportUrl: "/api/report/abc-123" }

Worker picks up job from BullMQ
   → Runs full LangChain agent for that URL
   → Updates Redis status at each tool call step
   → On completion: saves report.json + trajectory.jsonl
   → On failure: BullMQ waits (5s → 10s → 20s) then retries up to 3 times
```

**Exponential backoff explained:**
Retry 1 fails → wait 5s → Retry 2 fails → wait 10s → Retry 3 fails → job marked "failed"
Each wait doubles. Prevents hammering a temporarily overloaded resource (Docker, LLM API, GitHub API).

---

### Two-Container Sandbox Pipeline

```
Worker Process (host)
│
│  1. sandboxOrchestrator: docker volume create workspace-<jobId>
│
├──► CLONE CONTAINER  (alpine/git — network: bridge, write access)
│         │
│         │  docker run --rm \
│         │    --network bridge \        ← ON: needs GitHub
│         │    -v workspace-<jobId>:/workspace \
│         │    alpine/git clone <repoUrl> /workspace
│         │
│         └── Writes repo files → Docker volume. Container destroyed. ✅
│
├──► ANALYSIS CONTAINERS  (analyzer image — network: NONE, read-only)
│         │
│         │  docker run --rm \
│         │    --network none \                      ← OFF: no escape
│         │    -v workspace-<jobId>:/workspace:ro \  ← read-only mount
│         │    --cpus 0.5 --memory 512m \
│         │    analyzer <script> → JSON to stdout
│         │
│         ├── staticAnalysisContainer  → JSON
│         ├── testRunnerContainer      → JSON
│         ├── dependencyScanContainer  → JSON
│         └── securityScanContainer    → JSON
│
│  [Investigation containers — same image, same constraints, spawned on-demand by agent]
│         ├── readFileContainer(<path>)       → file content JSON
│         ├── searchCodeContainer(<pattern>)  → grep matches JSON
│         └── listDirectoryContainer(<path>)  → directory listing JSON
│
│  5. sandboxOrchestrator: docker volume rm workspace-<jobId>  ← always runs, even on error
```

**Security guarantees:**
- Host never touches a repo file — only runs `docker volume create/rm` and reads JSON from stdout
- Clone container: minimal `alpine/git`, no shell, exits immediately after clone
- Analyzer containers: no `git` binary installed — physically cannot clone
- Volume mounted `:ro` — analysis containers cannot write or modify cloned files
- `--network none` — malicious `postinstall` scripts cannot call home

---

### LangChain ReAct Agent — Full Step-by-Step Flow

> The agent runs **from the first step to the last**. It is the orchestrator. Tools are TypeScript functions that the agent calls; those functions internally manage Docker containers.

```
Worker picks job { repoUrl, jobId } from BullMQ
│
▼
LangChain ReAct Agent STARTS (host process)
│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│  PHASE 1 — GATHER  (prescribed order in system prompt)
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├── Thought: "I need to clone the repo first"
│   Action:  cloneRepoTool(repoUrl)
│               └─ internally: docker run alpine/git clone → volume
│   Result:  { success, language: ["TypeScript"], fileCount: 247, volumeName }
│
├── Thought: "Run static analysis"
│   Action:  staticAnalysisTool(jobId)
│               └─ internally: docker run --network none analyzer static_analysis.sh
│   Result:  { lintErrors: 47, complexFiles: ["auth/login.ts"], language: "TS" }
│
├── Thought: "Run tests"
│   Action:  testRunnerTool(jobId)
│               └─ internally: docker run --network none analyzer test_runner.sh
│   Result:  { passed: 0, failed: 0, coverage: "0%", timedOut: false }
│
├── Thought: "Scan dependencies"
│   Action:  dependencyScanTool(jobId)
│               └─ internally: docker run --network none analyzer dependency_scan.sh
│   Result:  { criticalVulns: ["CVE-2023-xxx in lodash"], outdatedCount: 12 }
│
├── Thought: "Run security scan"
│   Action:  securityScanTool(jobId)
│               └─ internally: docker run --network none analyzer security_scan.sh
│   Result:  { secretsFound: ["possible API key in auth/"], riskLevel: "high" }
│
├── Thought: "Get git activity and repo health metrics"
│   Action:  gitMetricsTool(repoUrl)   ← Octokit GitHub API, no container
│   Result:  {
│     // Commit & contributor health
│     commitFrequency: "2/month", contributors: 3, busFactor: 1,
│     // PR metrics
│     prMergeRate: "78%", stalePRs: 4, avgPRDescriptionLength: 120,
│     prsWithReviews: "60%", prsLinkedToIssues: "40%",
│     // Issue metrics
│     openIssues: 12, staleIssues: 7, labelledIssues: "30%",
│     avgIssueResolution: "14 days", bugVsFeatureRatio: { bug: 8, enhancement: 3, question: 1 }
│   }
│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│  PHASE 2 — INVESTIGATE  (agent decides autonomously, up to 10 calls)
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
│   Agent reasons: "auth/ has 47 errors, 0% coverage, AND a security flag.
│                   I need to read auth/login.ts before I can score fairly."
│
├── Action: readFileTool("auth/login.ts", jobId)
│               └─ internally: docker run --network none analyzer read_file.sh auth/login.ts
│   Result: "...line 34: const API_KEY = 'sk-prod-abc123...'..."
│
│   Agent reasons: "Confirmed hardcoded secret. Let me check if there are more."
│
├── Action: searchCodeTool("process.env", "src/", jobId)
│               └─ internally: docker run --network none analyzer search_code.sh
│   Result: [{ file: "config.ts", line: 12, match: "process.env.DB_PASS || 'root'" }]
│
│   Agent reasons: "Fallback to hardcoded 'root'. Additional risk. Evidence is sufficient."
│   Agent decides: "No further investigation needed. Proceeding to score."
│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│  PHASE 3 — SCORE  (prescribed in system prompt)
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├── Action: scoringTool({ all collected evidence })
│               └─ pure TypeScript function, no container
│   Result: { codeQuality: 2, testCoverage: 0, architecture: 3,
│             dependencies: 1, maintainability: 2, documentation: 3, total: 11/60 }
│
├── Self-critique: "Is testCoverage: 0 fair? Yes — test_runner confirmed 0%.
│                  Is security: 1 fair? Yes — confirmed hardcoded secrets at auth/login.ts:34."
│
├── Generate report narrative (LLM writes summary grounded in tool evidence)
│
├── Save: trajectories/<repo>/report.json + trajectory.jsonl
│
└── volumeCleanupTool(jobId)  ← docker volume rm — always runs
    BullMQ marks job "done" in Redis
```

---

### Multi-Language Support

| Language | Analysis Depth | Tools Used |
|:---|:---:|:---|
| **JavaScript / TypeScript** | ✅ Deep | ESLint, npm audit, jest/vitest, gitleaks |
| **Python** | ✅ Deep | Pylint, pip-audit, pytest, gitleaks |
| **Go / Rust / Java / C++** | ⚠️ Graceful degradation | git metrics + file structure + LLM reads sampled code files |
| **Any other** | ⚠️ Graceful degradation | git metrics + LLM reads sampled code files |

For non-JS/Python repos: `static_analysis.sh` detects the language, skips linting, and instead samples 5-10 key source files. The agent reads these via `readFileTool` during Phase 2 and uses LLM reasoning to assess code quality. All other analysis (tests, deps, security, git metrics) still runs where applicable.

---

## Error Handling Strategy

> [!IMPORTANT]
> `attempts: 1` on all BullMQ jobs — **no job-level retry**. All retry logic lives inside the worker. `UnrecoverableError` from BullMQ is used to immediately fail a job without retry when the failure is permanent.

### Core Principle

```
Permanent failures  → throw UnrecoverableError → BullMQ marks "failed" immediately
Recoverable LLM     → retry internally (3x, 2s/4s/8s) → if all fail → UnrecoverableError
Non-fatal tool fail → return null/error JSON → agent continues → N/A score for that category
Cleanup failure     → log only, never fails the job → hourly cron cleans orphaned volumes
Redis write fail    → log only, continue execution → Redis reconnects automatically
```

### Failure Point Decision Table

| Failure Point | Retries | Outcome if Failed | Job Fate |
|:---|:---:|:---|:---:|
| `docker volume create` | ❌ None | `UnrecoverableError` | Failed immediately |
| `cloneRepoTool` — any cause (bad URL, 404, private, network, GitHub down) | ❌ None | `UnrecoverableError` | Failed immediately |
| Analysis tools (`staticAnalysisTool`, `testRunnerTool`, `dependencyScanTool`, `securityScanTool`) | ❌ None | Return `null` → agent continues → N/A score | Continues ✅ |
| `gitMetricsTool` (GitHub API) | ⚠️ 3x via Octokit retry plugin | Return `null` → N/A for Maintainability | Continues ✅ |
| LLM call (any agent reasoning step) | ⚠️ 3x internal (2s→4s→8s) | `UnrecoverableError` after all 3 fail | Failed immediately |
| LLM returns malformed JSON for scoring | ⚠️ 2x re-prompt | Automated rubric fallback (pure thresholds, no LLM) | Continues ✅ |
| Investigation tools (`readFileTool`, `searchCodeTool`, `listDirectoryTool`) | ❌ None | Return error JSON → agent tries different path | Continues ✅ |
| `scoringTool` (pure function) | ❌ None | Partial score fallback from available evidence | Continues ✅ |
| Self-critique LLM call | ⚠️ 3x internal (2s→4s→8s) | `UnrecoverableError` after all 3 fail | Failed immediately |
| `volumeCleanupTool` | ❌ None | Log only, never rethrows | Job already done ✅ |
| Save `report.json` / `trajectory.jsonl` | ⚠️ 3x (1s delay) | `UnrecoverableError` after all 3 fail | Failed immediately |
| Redis job status update | ❌ None | Log warning, continue execution | Continues ✅ |

---

### Key Implementation Details

#### UnrecoverableError Usage
```typescript
import { UnrecoverableError } from 'bullmq'

// Volume creation
try { await sandboxOrchestrator.createVolume(jobId) }
catch (err) { throw new UnrecoverableError(`Volume creation failed: ${err.message}`) }

// Clone failure (all causes treated equally — none benefit from retry)
const cloneResult = await cloneRepoTool(repoUrl, jobId)
if (!cloneResult.success) {
  throw new UnrecoverableError(`Clone failed: ${cloneResult.error}`)
}

// LLM call with primary → fallback strategy
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatGroq } from "@langchain/groq"

const primaryLLM  = new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash", apiKey: process.env.GOOGLE_AI_API_KEY, maxRetries: 0 })
const fallbackLLM = new ChatGroq({ model: "llama-3.3-70b-versatile", apiKey: process.env.GROQ_API_KEY, maxRetries: 0 })

async function callLLM(prompt: string) {
  try {
    return await primaryLLM.invoke(prompt)
  } catch (err) {
    if (err.status === 429) {               // Rate limit — retry primary once after delay
      await sleep(5000)
      try { return await primaryLLM.invoke(prompt) } catch { /* fall through */ }
    }
    if (err.status === 401 || err.status === 400) {  // Config / input error — fail immediately
      throw new UnrecoverableError(`LLM config error: ${err.message}`)
    }
    // Model down / timeout → switch to Groq fallback
    try {
      trajectoryLogger.warn('Gemini unavailable, switching to Groq fallback')
      return await fallbackLLM.invoke(prompt)
    } catch (fallbackErr) {
      throw new UnrecoverableError(
        `Both LLMs failed. Gemini: ${err.message}. Groq: ${fallbackErr.message}`
      )
    }
  }
}

// Report save failure
try { await saveWithRetry(report, 3) }
catch (err) { throw new UnrecoverableError(`Report save failed after 3 attempts: ${err.message}`) }
```

#### Volume Cleanup Guarantee
```typescript
// worker/src/index.ts — always runs, even if agent throws
try {
  await runAgent(job)
  await saveReport(jobId, report)
} finally {
  try { await volumeCleanupTool(jobId) }
  catch (err) { logger.error('Volume cleanup failed', { jobId, err }) }
  // Separate: hourly cron scans for volumes older than 2h and removes them
}
```

#### Non-Fatal Tool Failure Pattern
```typescript
// Each analysis tool wrapper follows this pattern
async function staticAnalysisTool(jobId: string): Promise<StaticAnalysisResult | null> {
  try {
    const json = await runAnalyzerContainer(jobId, 'static_analysis.sh')
    return JSON.parse(json)
  } catch (err) {
    trajectoryLogger.logToolError('staticAnalysisTool', err.message)
    return null  // Agent receives null, scores category as N/A
  }
}
```

#### What Self-Critique Returns
Self-critique is NOT pass/fail. The agent re-reads all evidence and either confirms or revises its initial scores:
```typescript
// Self-critique output shape
{
  finalScores: {
    codeQuality: 5,      // unchanged
    testCoverage: 0,     // unchanged
    architecture: 6,     // unchanged
    security: 1,         // REVISED DOWN from 4
    maintainability: 4,  // unchanged
    documentation: 3     // unchanged
  },
  revisions: [
    {
      category: "security",
      from: 4,
      to: 1,
      reason: "Two confirmed hardcoded secrets: auth/login.ts:34, config.ts:12"
    }
  ]
}
// Report stores both initialScores and finalScores so trajectory is fully auditable
```

#### What the Final Report Contains on Partial Failure
```typescript
{
  repoUrl: "...",
  totalScore: 28,         // scored on available categories only
  categories: {
    codeQuality:    { score: 5, evidence: [...] },
    testCoverage:   { score: null, status: "unavailable", reason: "testRunnerTool failed" },
    architecture:   { score: 6, evidence: [...] },
    dependencies:   { score: 2, evidence: [...] },
    maintainability:{ score: 4, evidence: [...] },
    documentation:  { score: 3, evidence: [...] }
  },
  errors: [
    { tool: "testRunnerTool", error: "Container OOM after 30s" }
  ],
  scoringMethod: "agent",   // or "automated-fallback" if LLM scoring failed
  selfCritiqueCompleted: true
}
```

---

## Scoring Rubric (Primary Metric)

Each repository scored on **6 categories** (0–10 each) = **60 points total**:

| # | Category | Key Signals |
|:---|:---|:---|
| 1 | **Code Quality** | Lint errors, cyclomatic complexity, code duplication |
| 2 | **Test Coverage** | Test file presence, coverage %, pass/fail, framework detected |
| 3 | **Architecture** | Folder structure, separation of concerns, coupling (LLM-assessed) |
| 4 | **Dependencies** | CVE count, outdated packages, license risks |
| 5 | **Maintainability** | Commit frequency, bus factor, PR merge rate, stale PRs, PR description quality, PR review activity, PRs linked to issues, open issues, stale issues, issue label discipline, avg issue resolution time, bug/feature ratio |
| 6 | **Documentation** | README quality, inline comments, API docs (LLM-assessed) |

**Primary Metric**: Spearman Rank Correlation between agent's repo rankings and human expert rankings across 10 benchmark repos.

---

## Implementation Phases

---

### PHASE 0 — Scaffold, Docker Images & Baseline
> **Goal**: Stand up monorepo, build both Docker images, build and run the simple baseline on all 10 repos first.

- [ ] **0.1** — Initialize monorepo with `pnpm workspaces` — packages: `api/`, `worker/`, `frontend/`
- [ ] **0.2** — Configure `tsconfig.json`, ESLint, Prettier for all packages
- [ ] **0.3** — Set up `docker-compose.yml` with `api`, `worker`, `redis`, `frontend` services
- [ ] **0.4** — Create `.env.example`:
  ```bash
  # LLM — Primary (Google AI Studio — free)
  # Get key at: https://aistudio.google.com/apikey
  GOOGLE_AI_API_KEY=your_google_ai_key_here

  # LLM — Fallback (Groq — free)
  # Get key at: https://console.groq.com
  GROQ_API_KEY=your_groq_key_here

  # GitHub API (free with any GitHub account)
  GITHUB_TOKEN=your_github_token_here

  # Redis (local, no cost)
  REDIS_URL=redis://redis:6379
  ```
- [ ] **0.5** — **Build `sandbox/cloner/Dockerfile`**
  - `FROM alpine/git` — minimal, only `git` installed, no analysis tools
  - Test: `docker build -t cloner ./sandbox/cloner && docker volume create test-vol && docker run --rm -v test-vol:/workspace cloner clone https://github.com/expressjs/express /workspace`
- [ ] **0.6** — **Build `sandbox/analyzer/Dockerfile`**
  - `FROM ubuntu:22.04` with node, python3, eslint, pylint, tree-sitter-cli, gitleaks — **no git binary**
  - All scripts pre-installed in `/scripts/`
  - Test: `docker build -t analyzer ./sandbox/analyzer && docker run --rm --network none -v test-vol:/workspace:ro analyzer /scripts/static_analysis.sh`
- [ ] **0.7** — **Build Simple Baseline** (`worker/src/baseline/baselineAnalyzer.ts`)
  - Uses Octokit to fetch README + file tree only (no containers, no sandbox, no tool execution)
  - Single LLM prompt → scores all 6 categories in the **same rubric shape as the agent**:
    ```typescript
    // Baseline output shape — identical structure to agent report.json
    {
      codeQuality:     { score: 6, evidence: "README mentions clean code practices" },
      testCoverage:    { score: 5, evidence: "test/ folder detected in file tree" },
      architecture:    { score: 7, evidence: "src/ folder present, appears organized" },
      dependencies:    { score: 6, evidence: "package.json has 12 dependencies" },
      maintainability: { score: 5, evidence: "GitHub shows recent activity" },
      documentation:   { score: 7, evidence: "README is 2000 characters" },
      total:           36,
      method:          "baseline"   // ← distinguishes from agent report
    }
    ```
  - This is the naive baseline to beat — same rubric, weaker evidence, one LLM call vs full tool suite
- [ ] **0.8** — Curate **10 benchmark repositories** in `evaluation/repos.json`
  - Mix: well-maintained OSS, abandoned repos, hidden bugs, high-star-low-quality
  - Include 1 polyglot/monorepo edge case
- [ ] **0.9** — Manually review all 10 repos → save expert rankings to `evaluation/human_rankings.json` **before any agent or baseline runs** (avoids bias)
  - Format: ordinal ranking array `["repo3", "repo1", "repo7", ...]` (best → worst)
  - Human reviewer uses the same 6-category rubric as a mental guide
- [ ] **0.10** — Run baseline on all 10 repos:
  - Save per-repo `trajectories/<repo-name>/baseline_report.json`
  - Save aggregated `evaluation/baseline_results.json`
  - Start `changelog/CHANGELOG.md` with v0.1 baseline Spearman score

---

### PHASE 1 — API Server + Job Queue
> **Goal**: Stand up Express API that enqueues jobs, polls status, handles human approval, and serves saved reports.

- [ ] **1.1** — Set up Express server with TypeScript, health check at `GET /health`
- [ ] **1.2** — Define all shared TypeScript types:
  ```typescript
  type JobStatus =
    | 'pending'            // in BullMQ queue, not yet picked up
    | 'active'             // worker running
    | 'awaiting_approval'  // paused — agent waiting for human to approve testRunnerTool
    | 'done'               // completed successfully
    | 'failed'             // UnrecoverableError thrown

  type AnalysisJob, AnalysisReport, CategoryScore, TrajectoryStep
  ```
- [ ] **1.3** — Set up **BullMQ queue** (`analysisQueue.ts`) connected to Redis
- [ ] **1.4** — Implement API routes:
  - `POST /api/analyze` — validates URL, pushes job with `{ attempts: 1 }`, returns `{ jobId, status: "pending" }`
  - `GET /api/status/:id` — reads job state from BullMQ/Redis, returns `{ status, currentStep?, approvalContext?, error? }`
  - `POST /api/jobs/:id/approve` — sets Redis approval flag `approved`, worker resumes with `testRunnerTool`
  - `POST /api/jobs/:id/skip-test` — sets Redis approval flag `skipped`, worker continues with `dependencyScanTool`, test coverage marked N/A
  - `GET /api/report/:id` — reads saved `report.json` from `trajectories/<jobId>/`
  - `GET /api/trajectory/:id` — reads saved `trajectory.jsonl`
  - `POST /api/baseline` — runs baseline (no queue, synchronous, for demo comparison)

---

### PHASE 2 — Sandbox Tools
> **Goal**: Build clone container tool, all analyzer container tools, feedback loop tools. Each TypeScript tool function manages the Docker container lifecycle internally.

- [ ] **2.1** — **`sandboxOrchestrator.ts`** — helper that wraps `docker volume create`, `docker run`, `docker volume rm`
- [ ] **2.2** — **`cloneRepoTool`** — creates volume, runs alpine/git container, returns `{ jobId, volumeName, language[], fileCount, repoSize }`
- [ ] **2.3** — **`sandbox/analyzer/scripts/static_analysis.sh`** — detect language → ESLint (JS/TS) or Pylint (Python) or file sampling (other) → output JSON
- [ ] **2.4** — **`staticAnalysisTool`** — runs `static_analysis.sh` in analyzer container via `sandboxOrchestrator`
- [ ] **2.5** — **`sandbox/analyzer/scripts/test_runner.sh`** — detect framework → `npm install --ignore-scripts` → `timeout 30 npm test --coverage` → parse output → JSON
- [ ] **2.6** — **`testRunnerTool`** — runs `test_runner.sh` in analyzer container
  > ⚠️ **Consequential action** — this tool executes code from the untrusted repository. The agent pauses before calling this tool and waits for human approval (see Phase 3, step 3.3a).
- [ ] **2.7** — **`sandbox/analyzer/scripts/dependency_scan.sh`** — npm audit / pip-audit → JSON
- [ ] **2.8** — **`dependencyScanTool`** — runs `dependency_scan.sh` in analyzer container
- [ ] **2.9** — **`sandbox/analyzer/scripts/security_scan.sh`** — gitleaks detect + regex scan → JSON
- [ ] **2.10** — **`securityScanTool`** — runs `security_scan.sh` in analyzer container
- [ ] **2.11** — **Feedback loop scripts**: `read_file.sh <path>`, `search_code.sh <pattern> <dir>`, `list_directory.sh <path>` → all output JSON
- [ ] **2.12** — **`readFileTool`**, **`searchCodeTool`**, **`listDirectoryTool`** — each spawns an analyzer container, passes script + args, returns JSON to agent
- [ ] **2.13** — **`gitMetricsTool`** — Octokit fetches the following via GitHub REST API (no container):
  - **Commit & contributor health**: commit frequency (last 90 days), unique contributors, bus factor (% of commits by top contributor)
  - **PR quality signals** (last 50 PRs):
    - PR merge rate (merged / total opened)
    - Stale PRs count (open PRs with no activity in >30 days)
    - Avg PR description length (empty descriptions = poor practice)
    - % of PRs with at least 1 code review comment
    - % of PRs linked to an issue (`closes #` in body)
  - **Issue quality signals** (last 50 issues):
    - Open issues count
    - Stale issues count (open with no activity in >60 days)
    - Avg issue resolution time (closed issues)
    - % of issues with at least 1 label applied
    - Bug / enhancement / question label breakdown
  - Output: full structured JSON with all signals above → feeds Maintainability scoring
- [ ] **2.14** — **`scoringTool`** — pure TypeScript function, takes all evidence JSON → applies `rubric.ts` thresholds → returns 6 category scores
- [ ] **2.15** — **`volumeCleanupTool`** — `docker volume rm workspace-<jobId>`, guaranteed to run in try/finally block

---

### PHASE 3 — LangChain Agent + Worker Process
> **Goal**: Wire all tools into the LangChain ReAct agent with 3-phase system prompt, human approval gate before test execution, BullMQ worker, and trajectory logging.

- [ ] **3.1** — Set up **BullMQ Worker** (`worker/src/index.ts`)
  - Connects to Redis, registers `analysisQueue` worker with `concurrency: 1`
  - On job pick-up: initializes agent, runs it, updates Redis status at each step
  - On completion: saves report + trajectory, marks job "done"
  - On `UnrecoverableError`: BullMQ marks job "failed" immediately (no retry)
- [ ] **3.2** — Implement **`rubric.ts`** — scoring thresholds for all 6 categories with documented criteria per score band (0-3, 4-6, 7-10)
- [ ] **3.3** — Implement **`memory.ts`** — accumulates all tool results across the full ReAct loop
- [ ] **3.3a** — Implement **Human Approval Gate** (`worker/src/agent/approvalGate.ts`)
  ```
  Mechanism:
  1. After staticAnalysisTool completes, agent calls approvalGate.requestApproval(jobId, context)
  2. approvalGate sets Redis key: approval:<jobId> = "pending"
  3. Worker updates job status → "awaiting_approval" with approvalContext:
       { detectedLanguage, fileCount, testFramework, staticAnalysisSummary }
  4. Worker polls Redis key approval:<jobId> every 2 seconds (max wait: 10 minutes)
  5a. Key becomes "approved"  → agent calls testRunnerTool, continues normally
  5b. Key becomes "skipped"   → agent skips testRunnerTool, logs { skipped: true },
                                  test coverage marked N/A in final report
  5c. 10 minute timeout       → treated as "skipped" automatically
  ```
  API side: `POST /api/jobs/:id/approve` sets key to "approved"
            `POST /api/jobs/:id/skip-test` sets key to "skipped"
- [ ] **3.4** — Write **`systemPrompt.ts`** with 3 explicit phases:
  ```
  Phase 1 (REQUIRED, in order): cloneRepoTool → staticAnalysisTool →
    [HUMAN APPROVAL GATE] → testRunnerTool (or skip if declined) →
    dependencyScanTool → securityScanTool → gitMetricsTool
  Phase 2 (YOUR CHOICE, max 10 calls): use readFileTool / searchCodeTool /
    listDirectoryTool to investigate anomalies found in Phase 1
  Phase 3 (REQUIRED): call scoringTool with all evidence, then self-critique each score
  ```
- [ ] **3.5** — Initialize **LangChain ReAct agent** with all tools, system prompt, memory
- [ ] **3.6** — Set up **Winston trajectory logger** — writes one JSONL line per step, capturing **all retries and human checkpoints** (PDF Deliverable 04 requirement):
  - **Standard step**: `{ step, type: "agent_step", thought, action, actionInput, observation, timestamp }`
  - **Human checkpoint**: `{ step, type: "human_checkpoint", event: "approval_requested" | "approved" | "skipped" | "timeout", context: {...}, timestamp }`
  - **Agent/Tool retry**: `{ step, type: "retry_event", target: "gemini" | "groq" | "octokit", attempt: 2, reason: "rate_limit_429", timestamp }`
  - **LLM Provider fallback**: `{ step, type: "provider_fallback", from: "gemini-2.0-flash", to: "llama-3.3-70b", reason: "503_service_unavailable", timestamp }`
- [ ] **3.7** — Implement **volume lifecycle guarantee**: try/finally wraps the whole agent run — `volumeCleanupTool` always runs whether agent succeeds or throws
- [ ] **3.8** — Test end-to-end: submit a repo via API → worker picks up → agent runs → approval gate pauses → user approves → agent continues → report saved

---

### PHASE 4 — Frontend Dashboard
> **Goal**: Build a premium React dashboard with live job status, human approval gate UI, analysis results, and full agent trajectory viewer.

- [ ] **4.1** — Scaffold Vite + React + Tailwind, set up React Router v6
- [ ] **4.2** — **Home page**:
  - Repo URL input, analysis mode toggle (Agent vs Baseline)
  - Submit → poll `/api/status/:id` every 2s → show live step progress
  - Loading skeleton while job runs
- [ ] **4.3** — **`ApprovalGate` component** (shown when `status === 'awaiting_approval'`):
  - Displays context the agent gathered so far:
    - Detected language, file count, test framework found
    - Summary of static analysis (lint errors, complexity flags)
  - Shows exactly what will happen: `"About to execute: npm test (sandboxed, --network none, 30s limit)"`
  - Two actions:
    - `[✅ Approve & Run Tests]` → `POST /api/jobs/:id/approve` → polling resumes
    - `[⏭ Skip Test Execution]` → `POST /api/jobs/:id/skip-test` → agent continues without tests
  - Timeout indicator: "Auto-skipped in 10:00 if no response"
- [ ] **4.4** — **Report page**:
  - Overall score hero (animated score ring)
  - Radar chart (6 category scores — Recharts)
  - Per-category cards with score + evidence snippets + file links
  - Flagged code snippets with exact line numbers (react-syntax-highlighter)
  - Collapsible trajectory viewer: each step shows thought → tool call → result
  - Approval gate event shown in trajectory: `"Human approved test execution at 14:32:05"`
- [ ] **4.5** — **Benchmark page**:
  - Table of all 10 repos ranked by: Agent score | Baseline score | Human ranking
  - Spearman correlation scores displayed prominently
- [ ] **4.6** — Polish: dark mode, smooth transitions, responsive, loading skeletons, error states

---

### PHASE 5 — Evaluation & Measurement
> **Goal**: Produce measurable evidence that the agent outperforms the baseline. Required by hackathon judging criteria.

- [ ] **5.1** — Run **baseline** on all 10 benchmark repos:
  - Save per-repo `trajectories/<repo-name>/baseline_report.json` (same 6-category shape as agent)
  - Save aggregated `evaluation/baseline_results.json`
- [ ] **5.2** — Run **agent** on all 10 benchmark repos:
  - Per-repo `trajectories/<repo-name>/report.json` already saved during agent run
  - Save aggregated `evaluation/agent_results.json`
- [ ] **5.3** — Run `evaluation/compare_results.ts`:
  - Compute Spearman Rank Correlation vs human rankings for: baseline and agent
  - Compute per-category score accuracy
  - Output comparison table
- [ ] **5.4** — Document each improvement iteration in `changelog/CHANGELOG.md`
- [ ] **5.5** — Identify failure modes — repos where agent underperformed and why

---

### PHASE 6 — Reproducibility & Documentation
> **Goal**: Any judge can clone, run `docker compose up`, and reproduce exact results.

- [ ] **6.1** — Write `README.md`:
  - Problem statement & user story
  - Architecture diagram (ASCII)
  - Setup: `cp .env.example .env` → fill keys → `docker compose up --build`
  - Exact benchmark command: `pnpm run benchmark`
  - Execution cost estimate (LLM API calls per repo, total for 10 repos)
  - Runtime estimate per repo
  - Improvement Changelog summary
  - Failure modes & hot take
- [ ] **6.2** — Finalize `.env.example`
- [ ] **6.3** — Cold-start test: delete all images/volumes → `docker compose up --build` → verify everything works
- [ ] **6.4** — Verify all 10 trajectory logs are complete and parseable

---

### PHASE 7 — Demo Video & Submission
> **Goal**: 5-minute demo video + all deliverables packaged.

- [ ] **7.1** — Record **5-minute demo video**:
  1. Problem & user story (30s)
  2. Baseline demo — submit a repo, show basic LLM-only score (45s)
  3. Agent walkthrough — live analysis, show trajectory viewer with agent thoughts (2min)
  4. Benchmark results — side-by-side comparison table, Spearman scores (1min)
  5. Improvement changelog + hot take / failure modes (45s)
- [ ] **7.2** — Submit:
  - GitHub repo link (public)
  - Reproduction guide (in README)
  - Demo video link
  - Trajectory logs for all 10 benchmark repos

---

## Improvement Changelog Template (PDF Deliverable 01 Compliant)

```markdown
# Improvement Changelog

| STAGE | WHAT YOU TRIED AND WHY | EVIDENCE | DECISION / LEARNING |
|:---|:---|:---|:---|
| **Baseline** | Started with basic approach: single Octokit call (README + file tree) into one prompt. | Spearman Correlation vs Human: 0.32. Missed hidden bugs, zero test evidence. | Established the starting point. High hallucination rate on code quality. |
| **Iteration 1** | Added sandboxed `staticAnalysisTool` (ESLint + Pylint + complexity script). | Spearman Correlation: 0.54 (+0.22). | **KEPT**. Direct metric evidence improved quality scoring accuracy significantly. |
| **Iteration 2** | Added `testRunnerTool` + `dependencyScanTool` + `securityScanTool` in Docker sandbox. | Spearman Correlation: 0.71 (+0.17). Found hardcoded secrets & 0% coverage paths. | **KEPT**. Code execution & security scans provided definitive debt signals. |
| **Iteration 3** | Added Human Approval Gate before code execution + Dynamic Feedback Loop (`readFileTool`, `searchCodeTool`). | Spearman Correlation: 0.86 (+0.15). Agent verified exact file:line evidence before scoring. | **KEPT**. Agent autonomy in Phase 2 drastically reduced false positives. Human checkpoint ensured safety. |
| **Final** | Combined all tools + 3-phase ReAct prompt + LLM self-critique loop. | Spearman Correlation: 0.89 (+0.57 over baseline). | **FINAL SOLUTION**. Achieved strong alignment with human expert benchmark. |

### Main Failure Mode
- **Edge Case**: Repositories with custom build tools or legacy non-standard test runners (e.g. C++ Makefile setups) where `test_runner.sh` could not auto-detect the runner framework.
- **Impact**: Test coverage scored as N/A, requiring agent to rely solely on static code analysis and LLM code review via `readFileTool`.

### Hot Take
- Static metrics (linting, lines of code, star counts) are misleading when evaluated in isolation; an agent that iteratively investigates *why* tests are failing or *where* secrets are exposed reaches human-level judgment far faster than complex multi-agent graphs.
```

---

## Open Questions

> [!NOTE]
> **LLM Choice**: ✅ RESOLVED — **Google Gemini 2.0 Flash** (primary, free via Google AI Studio) + **Groq Llama 3.3 70B** (fallback, free via Groq). Both support LangChain tool-use. Two different providers means genuine fallback. Zero cost. LangChain packages: `@langchain/google-genai` + `@langchain/groq`.

> [!NOTE]
> **Network / git clone**: ✅ RESOLVED — `alpine/git` clone container (network enabled) writes to named Docker volume. Analyzer containers mount volume `--network none :ro`. Host never touches repo files.

> [!NOTE]
> **Test execution safety**: ✅ RESOLVED — `--network none`, 30s timeout, `--ignore-scripts` on npm install, 0.5 CPU, 512MB memory.

> [!NOTE]
> **Dynamic feedback loop**: ✅ RESOLVED — Phase 2 of system prompt. Agent calls readFileTool / searchCodeTool / listDirectoryTool autonomously (max 10 calls). Each spawns `--network none` analyzer container.

> [!NOTE]
> **Multi-language**: ✅ RESOLVED — Deep analysis for JS/TS + Python. Graceful degradation (LLM code review via readFileTool) for Go/Rust/Java/C++.

> [!NOTE]
> **Job queue & process isolation**: ✅ RESOLVED — BullMQ + Redis. API server and worker are separate Docker services. Worker crash does not affect API. `attempts: 1` — no job-level retry. All retries handled internally per failure type. `UnrecoverableError` used for permanent failures.

> [!NOTE]
> **Human Expert Rankings**: Must be finalized BEFORE any agent or baseline runs to avoid bias contamination.

---

## Verification Plan

### Automated
- `pnpm test` — unit tests for all tool wrappers and rubric scoring
- `docker compose up --build` — cold-start reproducibility check
- `pnpm run benchmark` — runs all 10 repos through agent + baseline, outputs comparison

### Manual
- Verify trajectory JSONL files are complete (one line per agent step)
- Spot-check 3 agent reports against manual review of same repos
- Confirm `docker volume ls` is empty after each job (no volume leaks)
- Record demo video showing live agent execution with trajectory viewer
