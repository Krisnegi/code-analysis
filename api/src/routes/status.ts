import { Router, Request, Response } from 'express'
import { redisConnection } from '../queue/analysisQueue'
import { JobStatus, JobStatusResponse } from '@code-analysis/shared'

const router = Router()

router.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id
    const status = (await redisConnection.get(`job:${jobId}:status`)) as JobStatus | null

    if (!status) {
      res.status(404).json({ error: `Job ${jobId} not found` })
      return
    }

    const currentStep = await redisConnection.get(`job:${jobId}:step`)
    const errorMsg = await redisConnection.get(`job:${jobId}:error`)
    const approvalContextRaw = await redisConnection.get(`job:${jobId}:approval_context`)

    let approvalContext
    if (approvalContextRaw) {
      try {
        approvalContext = JSON.parse(approvalContextRaw)
      } catch {
        approvalContext = undefined
      }
    }

    const response: JobStatusResponse = {
      jobId,
      status,
      currentStep: currentStep || undefined,
      approvalContext,
      error: errorMsg || undefined,
      reportUrl: status === 'done' ? `/api/report/${jobId}` : undefined,
      trajectoryUrl: status === 'done' ? `/api/trajectory/${jobId}` : undefined
    }

    res.json(response)
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch status: ${err.message}` })
  }
})

export default router
