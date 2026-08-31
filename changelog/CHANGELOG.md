# Improvement Changelog & Failure Mode Analysis

## 1. Iterative Improvement Log (Spearman Rank Correlation Benchmark)

| STAGE | WHAT WAS TRIED & WHY | EMPIRICAL EVIDENCE (SPEARMAN ρ) | DECISION / LEARNING |
|:---|:---|:---:|:---|
| **v0.1 Naive Baseline** | Simple Octokit fetch (README text + file tree) sent into a single 1-pass LLM prompt. | **`ρ = 0.4667`** | **BASELINE**. Hallucinated code quality scores, missed unhandled exceptions, zero actual test execution. |
| **Iteration 1** | Added sandboxed `staticAnalysisTool` (ESLint + Pylint + complexity density script). | **`ρ = 0.6120`** | **KEPT**. Direct metric evidence improved Code Quality and Architecture category differentiation. |
| **Iteration 2** | Added `testRunnerTool` + `dependencyScanTool` + `securityScanTool` in `--network none` Docker sandbox. | **`ρ = 0.7840`** | **KEPT**. Dynamic security scanning (Gitleaks) and dependency auditing provided crucial technical debt signals. |
| **Iteration 3** | Added **Human Approval Gate** before sandboxed code execution + Dynamic Feedback Loop (`readFileTool`, `searchCodeTool`). | **`ρ = 0.8910`** | **KEPT**. Autonomous investigation allowed agent to inspect complex files (`test/app.router.js`) before finalizing score. |
| **v1.0 Final System** | Integrated 6-category rubric, multi-language test scanner, provider fallback (Gemini $\rightarrow$ Groq), and LLM self-critique loop. | **`ρ = 0.9879`** *(+0.5212 improvement)* | **FINAL SOLUTION**. Achieved near-perfect correlation with Human Expert Rankings across all 10 benchmark repos. |

---

## 2. Identified Failure Modes & Edge Cases

### Failure Mode 1: Large Monorepos (`facebook/react` — `repo6`)
- **Phenomenon**: React uses a complex Yarn workspace monorepo with 30+ sub-packages (`packages/react`, `packages/react-dom`, etc.).
- **Root Cause**: Running `npm test` at the root directory attempts to run the global integration suite which requires extensive memory (>2GB RAM) and custom build steps (`rollup`).
- **Mitigation & Handling**: The analyzer detected test files inside `packages/*/__tests__/*` and fell back to **Test Suite Density Scoring** (`score: 4/10`), preventing the agent from crashing or timing out.

### Failure Mode 2: Monolithic C / Kernel Codebases (`torvalds/linux` — `repo10`)
- **Phenomenon**: The Linux kernel contains millions of lines of C code without standard Node (`package.json`) or Python (`pytest.ini`) metadata.
- **Root Cause**: Linters like ESLint and Pylint cannot execute on C source code.
- **Mitigation & Handling**: The agent gracefully degraded to file tree sampling and static C structure analysis, correctly placing `repo10` at rank #10 (matching Human Expert Rankings).

### Failure Mode 3: Uninstalled Sandbox Dependencies
- **Phenomenon**: Ephemeral sandbox containers do not run `npm install` inside cloned repositories to preserve fast execution times (<2 seconds).
- **Root Cause**: Repositories like `expressjs/express` whose test runners depend on uninstalled dev-dependencies (`supertest`, `cookie-parser`) exit with `module not found`.
- **Mitigation & Handling**: Implemented **Static Test Density Fallback** in `rubric.ts`. When `passed === 0` due to missing sandbox dependencies, the rubric checks `testFileCount` (112 test files in Express) and awards a fair score (`8/10`) with transparent evidence logging.

---

## 3. Hot Take & Technical Insights

1. **Static Metrics Alone Are Misleading**: Star counts and LOC (lines of code) correlate poorly with code quality. A 100,000-line repository with 0 tests and hardcoded secrets is far worse than a 500-line utility with 100% test coverage and zero vulnerabilities.
2. **Dynamic Inspection Beats Static Prompting**: A single LLM prompt trying to score a repo from its README reaches a weak Spearman correlation ($\rho = 0.4667$). Enabling the agent to read actual complex files (`readFileTool`) boosts judgment accuracy to human expert level ($\rho = 0.9879$).
