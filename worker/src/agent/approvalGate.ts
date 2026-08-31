import Redis from 'ioredis'
import { ApprovalContext } from '@code-analysis/shared'
import { TrajectoryLogger } from '../logger/trajectoryLogger'

export class ApprovalGate {
  public static async requestApproval(
    jobId: string,
    redisConnection: Redis,
    context: ApprovalContext,
    trajectoryLogger: TrajectoryLogger
  ): Promise<void> {
    await redisConnection.set(`job:${jobId}:status`, 'awaiting_approval')
    await redisConnection.set(`job:${jobId}:approval_context`, JSON.stringify(context))
    await redisConnection.del(`approval:${jobId}`)

    trajectoryLogger.logStep({
      type: 'human_checkpoint',
      event: 'approval_requested',
      context
    })
  }

  public static async waitForApproval(
    jobId: string,
    redisConnection: Redis,
    trajectoryLogger: TrajectoryLogger,
    maxWaitSeconds: number = 600
  ): Promise<{ approved: boolean; reason: string }> {
    const pollIntervalMs = 2000
    const maxPolls = Math.floor((maxWaitSeconds * 1000) / pollIntervalMs)

    for (let i = 0; i < maxPolls; i++) {
      const decision = await redisConnection.get(`approval:${jobId}`)

      if (decision === 'approved') {
        await redisConnection.set(`job:${jobId}:status`, 'active')
        trajectoryLogger.logStep({
          type: 'human_checkpoint',
          event: 'approved'
        })
        return { approved: true, reason: 'approved_by_user' }
      }

      if (decision === 'skipped') {
        await redisConnection.set(`job:${jobId}:status`, 'active')
        trajectoryLogger.logStep({
          type: 'human_checkpoint',
          event: 'skipped'
        })
        return { approved: false, reason: 'declined_by_user' }
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    // Timeout reached
    await redisConnection.set(`job:${jobId}:status`, 'active')
    trajectoryLogger.logStep({
      type: 'human_checkpoint',
      event: 'timeout'
    })
    return { approved: false, reason: 'approval_timeout' }
  }
}
