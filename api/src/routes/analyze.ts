import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { analysisQueue, redisConnection } from '../queue/analysisQueue'

const router = Router()

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body
    if (!repoUrl || typeof repoUrl !== 'string') {
      res.status(400).json({ error: 'Valid repoUrl string is required' })
      return
    }

    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/)?$/
    if (!githubRegex.test(repoUrl.trim())) {
      res.status(400).json({ error: 'Invalid GitHub repository URL format' })
      return
    }

    const cleanUrl = repoUrl.trim().replace(/\/$/, '')
    const repoSlug = cleanUrl.split('github.com/')[1].replace('/', '_')
    const jobId = `job_${repoSlug}_${crypto.randomBytes(4).toString('hex')}`

    await redisConnection.set(`job:${jobId}:status`, 'pending')
    await redisConnection.set(`job:${jobId}:repo_url`, cleanUrl)

    await analysisQueue.add(
      'analyze-repo',
      { jobId, repoUrl: cleanUrl },
      { jobId }
    )

    res.status(202).json({
      jobId,
      status: 'pending',
      repoUrl: cleanUrl
    })
  } catch (err: any) {
    res.status(500).json({ error: `Failed to enqueue job: ${err.message}` })
  }
})

export default router
