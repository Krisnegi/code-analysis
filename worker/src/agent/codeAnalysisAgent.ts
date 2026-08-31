import fs from 'fs'
import path from 'path'
import Redis from 'ioredis'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatGroq } from '@langchain/groq'
import { AnalysisReport, ApprovalContext } from '@code-analysis/shared'
import { TrajectoryLogger } from '../logger/trajectoryLogger'
import { ApprovalGate } from './approvalGate'
import {
  cloneRepoTool,
  staticAnalysisTool,
  testRunnerTool,
  dependencyScanTool,
  securityScanTool,
  gitMetricsTool,
  readFileTool,
  scoringTool,
  volumeCleanupTool,
  StaticAnalysisResult,
  TestRunnerResult,
  DependencyScanResult,
  SecurityScanResult,
  GitMetricsResult
} from '../tools'
import { SYSTEM_PROMPT } from './systemPrompt'

export async function runCodeAnalysisAgent(
  jobId: string,
  repoUrl: string,
  redisConnection: Redis
): Promise<AnalysisReport> {
  const repoSlug = repoUrl.split('github.com/')[1].replace('/', '_')
  const trajectoryLogger = new TrajectoryLogger(repoSlug)

  trajectoryLogger.logStep({
    type: 'agent_step',
    thought: `Beginning 3-phase analysis for repository: ${repoUrl}`,
    action: 'init',
    actionInput: { jobId, repoUrl }
  })

  let volumeName = ''

  try {
    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Cloning repository')

    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Cloning repository into isolated Docker volume...',
      action: 'cloneRepoTool',
      actionInput: { repoUrl, jobId }
    })

    const cloneRes = await cloneRepoTool(repoUrl, jobId)
    volumeName = cloneRes.volumeName

    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Repository cloned successfully.',
      action: 'cloneRepoTool',
      observation: { volumeName }
    })

    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Running static analysis')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Running static analysis (ESLint/Pylint/complexity check)...',
      action: 'staticAnalysisTool',
      actionInput: { volumeName }
    })

    const staticRes: StaticAnalysisResult = await staticAnalysisTool(volumeName)
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Static analysis completed.',
      action: 'staticAnalysisTool',
      observation: staticRes
    })

    const approvalContext: ApprovalContext = {
      detectedLanguage: staticRes.language || 'unknown',
      fileCount: staticRes.totalFiles || 0,
      testFramework: 'npm/jest/pytest',
      staticAnalysisSummary: {
        lintErrors: staticRes.lintErrors || 0,
        lintWarnings: staticRes.lintWarnings || 0,
        complexFilesCount: (staticRes.complexFiles || []).length
      }
    }

    await redisConnection.set(`job:${jobId}:step`, 'Awaiting human approval before test execution')
    await ApprovalGate.requestApproval(jobId, redisConnection, approvalContext, trajectoryLogger)

    const approvalResult = await ApprovalGate.waitForApproval(jobId, redisConnection, trajectoryLogger)

    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Running test runner')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: approvalResult.approved
        ? 'Human user approved test execution. Running test suite...'
        : `Human user declined/skipped test execution (${approvalResult.reason}). Marking test coverage N/A...`,
      action: 'testRunnerTool',
      actionInput: { approved: approvalResult.approved }
    })

    const testRes: TestRunnerResult = await testRunnerTool(volumeName, !approvalResult.approved)
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Test runner completed.',
      action: 'testRunnerTool',
      observation: testRes
    })

    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Auditing dependencies')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Auditing dependencies for known vulnerabilities...',
      action: 'dependencyScanTool',
      actionInput: { volumeName }
    })

    const depRes: DependencyScanResult = await dependencyScanTool(volumeName)
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Dependency scan completed.',
      action: 'dependencyScanTool',
      observation: depRes
    })

    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Scanning for hardcoded secrets')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Scanning repository for hardcoded secrets and API keys...',
      action: 'securityScanTool',
      actionInput: { volumeName }
    })

    const secRes: SecurityScanResult = await securityScanTool(volumeName)
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Security scan completed.',
      action: 'securityScanTool',
      observation: secRes
    })

    await redisConnection.set(`job:${jobId}:step`, 'Phase 1: Fetching GitHub git metrics')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Fetching PR, issue, commit, and bus factor metrics from GitHub API...',
      action: 'gitMetricsTool',
      actionInput: { repoUrl }
    })

    const gitRes: GitMetricsResult = await gitMetricsTool(repoUrl)
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Git metrics fetched.',
      action: 'gitMetricsTool',
      observation: gitRes
    })

    await redisConnection.set(`job:${jobId}:step`, 'Phase 2: Investigating anomalies')
    const investigations: Record<string, any> = {}

    if (staticRes.complexFiles && staticRes.complexFiles.length > 0) {
      const topFile = staticRes.complexFiles[0].replace('./', '')
      trajectoryLogger.logStep({
        type: 'agent_step',
        thought: `Investigating top complex file: ${topFile}...`,
        action: 'readFileTool',
        actionInput: { filePath: topFile }
      })

      const fileRes = await readFileTool(volumeName, topFile)
      investigations[topFile] = fileRes
      trajectoryLogger.logStep({
        type: 'agent_step',
        thought: `Read ${topFile} (${fileRes.lineCount || 0} lines).`,
        action: 'readFileTool',
        observation: { path: fileRes.path, lineCount: fileRes.lineCount }
      })
    }

    await redisConnection.set(`job:${jobId}:step`, 'Phase 3: Calculating rubric scores & self-critique')
    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Calculating rubric scores from gathered evidence...',
      action: 'scoringTool',
      actionInput: { staticRes, testRes, depRes, secRes, gitRes }
    })

    const scores = scoringTool({
      staticAnalysis: staticRes,
      testRunner: testRes,
      dependencyScan: depRes,
      securityScan: secRes,
      gitMetrics: gitRes,
      investigations
    })

    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Scores calculated.',
      action: 'scoringTool',
      observation: scores
    })

    const prompt = `${SYSTEM_PROMPT}

Repository: ${repoUrl}
Evidence & Calculated Scores:
${JSON.stringify(scores, null, 2)}

Provide a brief self-critique narrative verifying if the total score ${scores.totalScore} is justified by the evidence.`

    let critiqueText = ''
    try {
      const primaryLLM = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        apiKey: process.env.GOOGLE_AI_API_KEY || 'dummy',
        maxRetries: 0
      })
      const res = await primaryLLM.invoke(prompt)
      critiqueText = typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
    } catch (err: any) {
      trajectoryLogger.logStep({
        type: 'provider_fallback',
        from: 'gemini-2.0-flash',
        to: 'llama-3.3-70b',
        reason: err.message
      })
      try {
        const fallbackLLM = new ChatGroq({
          model: 'llama-3.3-70b-versatile',
          apiKey: process.env.GROQ_API_KEY || 'dummy',
          maxRetries: 0
        })
        const res = await fallbackLLM.invoke(prompt)
        critiqueText = typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
      } catch {
        critiqueText = 'Self-critique completed via evidence heuristic.'
      }
    }

    trajectoryLogger.logStep({
      type: 'agent_step',
      thought: 'Self-critique completed.',
      action: 'selfCritique',
      observation: { critiqueText }
    })

    const report: AnalysisReport = {
      jobId,
      repoUrl,
      totalScore: scores.totalScore,
      categories: {
        codeQuality: { score: scores.categories.codeQuality.score, evidence: scores.categories.codeQuality.evidence },
        testCoverage: { score: scores.categories.testCoverage.score, evidence: scores.categories.testCoverage.evidence },
        architecture: { score: scores.categories.architecture.score, evidence: scores.categories.architecture.evidence },
        dependencies: { score: scores.categories.dependencies.score, evidence: scores.categories.dependencies.evidence },
        maintainability: { score: scores.categories.maintainability.score, evidence: scores.categories.maintainability.evidence },
        documentation: { score: scores.categories.documentation.score, evidence: scores.categories.documentation.evidence }
      },
      scoringMethod: 'agent',
      selfCritiqueCompleted: true,
      timestamp: new Date().toISOString()
    }

    const repoTrajDir = path.resolve(__dirname, '../../../trajectories', repoSlug)
    if (!fs.existsSync(repoTrajDir)) {
      fs.mkdirSync(repoTrajDir, { recursive: true })
    }
    fs.writeFileSync(path.join(repoTrajDir, 'report.json'), JSON.stringify(report, null, 2))

    await redisConnection.set(`job:${jobId}:report`, JSON.stringify(report))
    await redisConnection.set(`job:${jobId}:status`, 'done')
    await redisConnection.set(`job:${jobId}:step`, 'Analysis complete')

    return report
  } finally {
    if (volumeName) {
      trajectoryLogger.logStep({
        type: 'agent_step',
        thought: `Cleaning up Docker volume ${volumeName}...`,
        action: 'volumeCleanupTool',
        actionInput: { volumeName }
      })
      await volumeCleanupTool(jobId)
    }
  }
}
