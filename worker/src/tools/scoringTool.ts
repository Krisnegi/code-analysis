import { CollectedEvidence, computeRubricScores } from '../agent/rubric'

export function scoringTool(evidence: CollectedEvidence) {
  try {
    return computeRubricScores(evidence)
  } catch (err: any) {
    return {
      categories: {
        codeQuality: { score: 5, evidence: 'Fallback rubric calculation' },
        testCoverage: { score: null, evidence: 'Fallback rubric calculation' },
        architecture: { score: 5, evidence: 'Fallback rubric calculation' },
        dependencies: { score: 5, evidence: 'Fallback rubric calculation' },
        maintainability: { score: 5, evidence: 'Fallback rubric calculation' },
        documentation: { score: 5, evidence: 'Fallback rubric calculation' }
      },
      totalScore: 25,
      warning: `Scoring used partial evidence due to error: ${err.message}`
    }
  }
}
