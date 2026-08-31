import { StaticAnalysisResult } from '../tools/staticAnalysisTool'
import { TestRunnerResult } from '../tools/testRunnerTool'
import { DependencyScanResult } from '../tools/dependencyScanTool'
import { SecurityScanResult } from '../tools/securityScanTool'
import { GitMetricsResult } from '../tools/gitMetricsTool'

export interface CollectedEvidence {
  staticAnalysis?: StaticAnalysisResult | null
  testRunner?: TestRunnerResult | null
  dependencyScan?: DependencyScanResult | null
  securityScan?: SecurityScanResult | null
  gitMetrics?: GitMetricsResult | null
  investigations?: Record<string, any>
}

export function computeRubricScores(evidence: CollectedEvidence) {
  let codeQualityScore: number | null = null
  let codeQualityEvidence: string[] = []
  if (evidence.staticAnalysis && evidence.staticAnalysis.success) {
    const errs = evidence.staticAnalysis.lintErrors || 0
    if (errs === 0) codeQualityScore = 10
    else if (errs <= 5) codeQualityScore = 8
    else if (errs <= 20) codeQualityScore = 5
    else codeQualityScore = 2

    codeQualityEvidence.push(`${errs} lint errors found`)
    if (evidence.staticAnalysis.complexFiles && evidence.staticAnalysis.complexFiles.length > 0) {
      codeQualityEvidence.push(`Top complex files: ${evidence.staticAnalysis.complexFiles.slice(0, 3).join(', ')}`)
    }
  } else {
    codeQualityEvidence.push('Static analysis tool unavailable')
  }

  let testCoverageScore: number | null = null
  let testCoverageEvidence: string[] = []
  if (evidence.testRunner && evidence.testRunner.success) {
    if (evidence.testRunner.skipped) {
      testCoverageScore = null
      testCoverageEvidence.push('Test execution skipped by user approval checkpoint')
    } else {
      const covStr = evidence.testRunner.coverage || '0%'
      const covNum = parseInt(covStr.replace('%', ''), 10) || 0
      const passed = evidence.testRunner.passed || 0
      const failed = evidence.testRunner.failed || 0
      const testFileCount = evidence.testRunner.testFileCount || 0

      if (covNum > 0 || passed > 0) {
        if (covNum >= 80) testCoverageScore = 10
        else if (covNum >= 50) testCoverageScore = 7
        else testCoverageScore = 4

        testCoverageEvidence.push(`Framework: ${evidence.testRunner.framework || 'unknown'}, ${covStr} coverage`)
        testCoverageEvidence.push(`Passed: ${passed}, Failed: ${failed}`)
      } else if (testFileCount > 0 && evidence.testRunner.framework !== 'none') {
        // Honest fallback: Evaluate Test Suite Density when runtime execution is blocked by uninstalled dependencies
        if (testFileCount >= 20) testCoverageScore = 8
        else if (testFileCount >= 5) testCoverageScore = 6
        else testCoverageScore = 4

        testCoverageEvidence.push(`Framework: ${evidence.testRunner.framework}, ${testFileCount} test files detected`)
        testCoverageEvidence.push('Runtime execution skipped (uninstalled sandbox dependencies)')
      } else {
        testCoverageScore = 0
        testCoverageEvidence.push('Framework: none, 0% coverage')
        testCoverageEvidence.push('Passed: 0, Failed: 0')
      }
    }
  } else {
    testCoverageEvidence.push('Test runner unavailable')
  }

  let architectureScore: number | null = 6
  let architectureEvidence: string[] = []
  if (evidence.staticAnalysis && evidence.staticAnalysis.success) {
    const totalFiles = evidence.staticAnalysis.totalFiles || 0
    architectureEvidence.push(`Total repo files: ${totalFiles}, Language: ${evidence.staticAnalysis.language || 'unknown'}`)
  } else {
    architectureEvidence.push('Estimated from file tree')
  }

  let dependenciesScore: number | null = null
  let dependenciesEvidence: string[] = []
  let vulnsCount = 0
  let secretsCount = 0

  if (evidence.dependencyScan && evidence.dependencyScan.success) {
    vulnsCount = (evidence.dependencyScan.criticalVulns || []).length
    dependenciesEvidence.push(`${evidence.dependencyScan.dependencyCount || 0} dependencies, ${vulnsCount} critical CVEs`)
  }
  if (evidence.securityScan && evidence.securityScan.success) {
    secretsCount = evidence.securityScan.secretsCount || 0
    dependenciesEvidence.push(`Security risk: ${evidence.securityScan.riskLevel || 'low'} (${secretsCount} secrets flagged)`)
  }

  const penalty = vulnsCount * 3 + secretsCount * 4
  dependenciesScore = Math.max(0, 10 - penalty)

  let maintainabilityScore: number | null = null
  let maintainabilityEvidence: string[] = []
  if (evidence.gitMetrics && evidence.gitMetrics.success) {
    let score = 8
    if (evidence.gitMetrics.busFactor && evidence.gitMetrics.busFactor > 0.8) score -= 3
    if (evidence.gitMetrics.stalePRs && evidence.gitMetrics.stalePRs > 3) score -= 2
    if (evidence.gitMetrics.staleIssues && evidence.gitMetrics.staleIssues > 5) score -= 2

    maintainabilityScore = Math.max(1, score)
    maintainabilityEvidence.push(`Commit frequency: ${evidence.gitMetrics.commitFrequency || 'N/A'}`)
    maintainabilityEvidence.push(`Contributors: ${evidence.gitMetrics.contributors || 1}, Bus factor: ${evidence.gitMetrics.busFactor || 1}`)
    maintainabilityEvidence.push(`Stale PRs: ${evidence.gitMetrics.stalePRs || 0}, Stale issues: ${evidence.gitMetrics.staleIssues || 0}`)
  } else {
    maintainabilityEvidence.push('Git metrics unavailable')
  }

  let documentationScore: number | null = 7
  let documentationEvidence: string[] = ['README present']

  const categories = {
    codeQuality: { score: codeQualityScore, evidence: codeQualityEvidence },
    testCoverage: { score: testCoverageScore, evidence: testCoverageEvidence },
    architecture: { score: architectureScore, evidence: architectureEvidence },
    dependencies: { score: dependenciesScore, evidence: dependenciesEvidence },
    maintainability: { score: maintainabilityScore, evidence: maintainabilityEvidence },
    documentation: { score: documentationScore, evidence: documentationEvidence }
  }

  const validScores = Object.values(categories)
    .map((c) => c.score)
    .filter((s): s is number => s !== null)

  const totalScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) : null

  return {
    categories,
    totalScore
  }
}
