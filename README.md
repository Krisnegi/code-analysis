# Code Analysis Agent — Is This Repository Actually Good? 🚀

> **micro1 Hackathon Project**: Autonomous multi-stage repository analyzer built with **LangChain.js**, **Docker Sandbox Isolation**, **Express.js**, and **React (Vite)**.
> Evaluates GitHub codebases across 6 rigorous technical categories and produces auditable, reproducible quality reports.

---

## 📊 Benchmark & Evaluation Results (Phase 5)

Our agentic system was evaluated against **10 curated benchmark repositories** and compared against an expert human ranking as well as a Naive LLM Baseline.

| Metric | Naive LLM Baseline | **Our Agentic System** | Performance Gain |
|:---|:---:|:---:|:---:|
| **Spearman Rank Correlation ($\rho$)** | `0.4667` | **`0.9879`** | **`+0.5212`** *(+111% Improvement)* |
| **Code Inspection Depth** | README Text Only | **Full Codebase + AST + AST Complexity** | 100x Deeper |
| **Runtime Execution** | None | **Sandboxed Tests + Security Audit** | Real Runtime Signals |
| **Cost per Repository** | $0.00 | **$0.00** *(Gemini 2.0 / Groq Free Tiers)* | Zero Cost |

---

## 🏗️ System Architecture

```
                                  USER DASHBOARD (Vite + React 18)
                                                │
                                                ▼ (HTTP REST)
                                      API SERVER (Express + TS)
                                                │
                                                ▼ (BullMQ Enqueue)
                                        REDIS JOB QUEUE
                                                │
                                                ▼ (BullMQ Worker)
                                     LANGCHAIN REACT WORKER
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [PHASE 1: GATHER EVIDENCE]                                   [PHASE 2 & 3: INVESTIGATE & SCORE]
                 │                                                             │
  ┌──────────────┴──────────────┐                               ┌──────────────┴──────────────┐
  │ CLONE CONTAINER             │                               │ INVESTIGATION TOOLS         │
  │  alpine/git                 │                               │  readFileTool               │
  │  --network bridge           │                               │  searchCodeTool             │
  │  Writes to Docker Volume    │                               │  listDirectoryTool          │
  └──────────────┬──────────────┘                               └──────────────┬──────────────┘
                 │                                                             │
                 ▼                                                             ▼
  ┌─────────────────────────────┐                               ┌─────────────────────────────┐
  │ ANALYSIS CONTAINERS         │                               │ RUBRIC SCORING ENGINE       │
  │  ubuntu:22.04 + linters     │                               │  6 Categories (0-10)        │
  │  --network none (ISOLATED)  │                               │  Self-Critique LLM Loop     │
  │  -v workspace:/workspace:ro │                               └──────────────┬──────────────┘
  └─────────────────────────────┘                                              │
                                                                               ▼
                                                                     SAVED REPORT & TRAJECTORY
```

---

## 🔐 Security & Sandbox Isolation

To guarantee secure execution when scanning arbitrary third-party GitHub repositories:
1. **Two-Container Architecture**: Cloning happens in `alpine/git`. Analysis runs in a completely separate, network-less container.
2. **Network Isolation**: All analytical tools (`staticAnalysisTool`, `testRunnerTool`, `dependencyScanTool`, `securityScanTool`) run with `--network none`.
3. **Read-Only Volume Mounts**: The cloned repository volume is mounted as `:ro` (Read-Only) during analysis.
4. **Human Approval Gate**: Interactive approval checkpoint pauses execution before running untrusted test commands.

---

## ⚡ Quick Start & Reproduction Guide

### 1. Prerequisites
- **Docker Desktop** installed and running
- **Node.js v20+** and **pnpm** installed

### 2. Environment Setup
Clone the repository and create your `.env` file:
```bash
git clone https://github.com/Krisnegi/code-analysis.git
cd code-analysis
cp .env.example .env
```

Fill in your free API keys in `.env`:
```env
GOOGLE_AI_API_KEY=your_google_ai_studio_key
GROQ_API_KEY=your_groq_key
GITHUB_TOKEN=your_github_personal_access_token
```

### 3. Launch with Docker Compose
```bash
docker compose up --build -d
```

Access the components:
- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Redis Queue**: `localhost:6379`

### 4. Run Benchmark Suite (Phase 5 Evaluation)
To reproduce our **`ρ = 0.9879`** Spearman Rank Correlation benchmark across all 10 repositories:
```bash
npx tsx evaluation/compare_results.ts
```

---

## 📏 6-Category Scoring Rubric (0–10 Each)

1. **Code Quality**: Cyclomatic complexity, lint error density, duplicate structures.
2. **Test Coverage**: Framework detection, test suite density, pass/fail counts, coverage %.
3. **Architecture**: Separation of concerns, modularity, coupling, file organization.
4. **Dependencies**: CVE vulnerability counts (pip-audit / npm audit), outdated package counts.
5. **Maintainability**: Git commit frequency, bus factor, PR merge rates, stale PRs/issues, resolution time.
6. **Documentation**: README thoroughness, API documentation, inline docstrings.

---

## 💡 Key Lessons & Technical Takeaways

1. **Dynamic Code Exploration Beats Single Prompts**: Relying solely on README text yields a weak correlation ($\rho = 0.4667$). Allowing an agent to dynamically read source code files (`readFileTool`) elevates accuracy to human expert level ($\rho = 0.9879$).
2. **Static Test Suite Density Fallback**: When ephemeral sandboxes skip `npm install` for speed, evaluating **Test File Density** (e.g. 112 test files in `express`) ensures fair scoring without sacrificing security.
3. **Provider Fallback Resilience**: Seamless failover from Gemini to Groq ensures 100% uptime even during rate-limits or upstream API deprecations.

---

## 📄 License
MIT License. Created for micro1 Hackathon.
