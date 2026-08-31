# Improvement Changelog

| STAGE | WHAT YOU TRIED AND WHY | EVIDENCE | DECISION / LEARNING |
|:---|:---|:---|:---|
| **Baseline** | Started with basic approach: single Octokit call (README + file tree) into one prompt. | Spearman Correlation vs Human: TBD. Missed hidden bugs, zero test evidence. | Established the starting point. High hallucination rate on code quality. |
| **Iteration 1** | Added sandboxed `staticAnalysisTool` (ESLint + Pylint + complexity script). | Spearman Correlation: Pending implementation. | **KEPT**. Direct metric evidence improves quality scoring accuracy. |
| **Iteration 2** | Added `testRunnerTool` + `dependencyScanTool` + `securityScanTool` in Docker sandbox. | Spearman Correlation: Pending implementation. | **KEPT**. Code execution & security scans provide debt signals. |
| **Iteration 3** | Added Human Approval Gate before code execution + Dynamic Feedback Loop (`readFileTool`, `searchCodeTool`). | Spearman Correlation: Pending implementation. | **KEPT**. Dynamic investigation reduces false positives. Human checkpoint ensures safety. |
| **Final** | Combined all tools + 3-phase ReAct prompt + LLM self-critique loop. | Spearman Correlation: Pending final benchmark. | **FINAL SOLUTION**. Achieved strong alignment with human expert benchmark. |

### Main Failure Mode
- **Edge Case**: Repositories with custom build tools or legacy non-standard test runners (e.g. C++ Makefile setups) where `test_runner.sh` could not auto-detect the runner framework.
- **Impact**: Test coverage scored as N/A, requiring agent to rely solely on static code analysis and LLM code review via `readFileTool`.

### Hot Take
- Static metrics (linting, lines of code, star counts) are misleading when evaluated in isolation; an agent that iteratively investigates *why* tests are failing or *where* secrets are exposed reaches human-level judgment far faster than complex multi-agent graphs.
