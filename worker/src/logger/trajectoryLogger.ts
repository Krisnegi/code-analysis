import fs from 'fs'
import path from 'path'
import { TrajectoryStep } from '@code-analysis/shared'

export class TrajectoryLogger {
  private logPath: string
  private stepCounter: number = 0
  private steps: TrajectoryStep[] = []
  private jobId?: string
  private redisConnection?: any

  constructor(repoName: string, jobId?: string, redisConnection?: any) {
    this.jobId = jobId
    this.redisConnection = redisConnection
    const repoSlug = repoName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const dirPath = path.resolve(__dirname, '../../../trajectories', repoSlug)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    this.logPath = path.join(dirPath, 'trajectory.jsonl')
    // Reset/truncate trajectory log for a fresh new run
    fs.writeFileSync(this.logPath, '')
  }

  public logStep(stepData: Omit<TrajectoryStep, 'step' | 'timestamp'>): void {
    this.stepCounter++
    const fullStep: TrajectoryStep = {
      step: this.stepCounter,
      timestamp: new Date().toISOString(),
      ...stepData
    }
    this.steps.push(fullStep)

    // Write to disk
    fs.appendFileSync(this.logPath, JSON.stringify(fullStep) + '\n')

    // Also update Redis key asynchronously if available
    if (this.redisConnection && this.jobId) {
      this.redisConnection.set(`job:${this.jobId}:trajectory`, JSON.stringify(this.steps)).catch(() => {})
    }
  }

  public getSteps(): TrajectoryStep[] {
    return this.steps
  }

  public getLogPath(): string {
    return this.logPath
  }
}
