import fs from 'fs'
import path from 'path'
import { TrajectoryStep } from '@code-analysis/shared'

export class TrajectoryLogger {
  private logPath: string
  private stepCounter: number = 0

  constructor(repoName: string) {
    const repoSlug = repoName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const dirPath = path.resolve(__dirname, '../../../trajectories', repoSlug)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    this.logPath = path.join(dirPath, 'trajectory.jsonl')
  }

  public logStep(stepData: Omit<TrajectoryStep, 'step' | 'timestamp'>): void {
    this.stepCounter++
    const fullStep: TrajectoryStep = {
      step: this.stepCounter,
      timestamp: new Date().toISOString(),
      ...stepData
    }
    fs.appendFileSync(this.logPath, JSON.stringify(fullStep) + '\n')
  }

  public getLogPath(): string {
    return this.logPath
  }
}
