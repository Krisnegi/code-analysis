export type JobStatus = 'pending' | 'active' | 'awaiting_approval' | 'done' | 'failed'

export interface CategoryScore {
  score: number | null
  status?: string
  reason?: string
  evidence?: string | string[]
}

export interface AnalysisReport {
  jobId: string
  repoUrl: string
  totalScore: number | null
  categories: {
    codeQuality: CategoryScore
    testCoverage: CategoryScore
    architecture: CategoryScore
    dependencies: CategoryScore
    maintainability: CategoryScore
    documentation: CategoryScore
  }
  errors?: Array<{ tool: string; error: string }>
  scoringMethod: 'agent' | 'automated-fallback' | 'baseline'
  selfCritiqueCompleted?: boolean
  timestamp: string
}

export interface TrajectoryStep {
  step: number
  type: 'agent_step' | 'human_checkpoint' | 'retry_event' | 'provider_fallback'
  thought?: string
  action?: string
  actionInput?: unknown
  observation?: unknown
  event?: 'approval_requested' | 'approved' | 'skipped' | 'timeout'
  context?: unknown
  target?: string
  attempt?: number
  reason?: string
  from?: string
  to?: string
  timestamp: string
}

export interface ApprovalContext {
  detectedLanguage: string
  fileCount: number
  testFramework: string
  staticAnalysisSummary: {
    lintErrors: number
    lintWarnings: number
    complexFilesCount: number
  }
}

export interface JobStatusResponse {
  jobId: string
  status: JobStatus
  currentStep?: string
  approvalContext?: ApprovalContext
  error?: string
  reportUrl?: string
  trajectoryUrl?: string
}
