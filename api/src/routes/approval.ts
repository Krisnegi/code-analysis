import { Router, Request, Response } from 'express'
import { redisConnection } from '../queue/analysisQueue'

const router = Router()

router.post('/jobs/:id/approve', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id
    const status = await redisConnection.get(`job:${jobId}:status`)

    if (status !== 'awaiting_approval') {
      res.status(400).json({ error: `Job ${jobId} is not currently awaiting approval (status: ${status})` })
      return
    }

    await redisConnection.set(`approval:${jobId}`, 'approved')
    res.json({ success: true, jobId, decision: 'approved' })
  } catch (err: any) {
    res.status(500).json({ error: `Failed to approve job: ${err.message}` })
  }
})

router.post('/jobs/:id/skip-test', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id
    const status = await redisConnection.get(`job:${jobId}:status`)

    if (status !== 'awaiting_approval') {
      res.status(400).json({ error: `Job ${jobId} is not currently awaiting approval (status: ${status})` })
      return
    }

    await redisConnection.set(`approval:${jobId}`, 'skipped')
    res.json({ success: true, jobId, decision: 'skipped' })
  } catch (err: any) {
    res.status(500).json({ error: `Failed to skip test: ${err.message}` })
  }
})

export default router
