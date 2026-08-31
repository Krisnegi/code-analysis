import { Router, Request, Response } from 'express'
import { runBaselineAnalysis } from '@code-analysis/shared'

const router = Router()

router.post('/baseline', async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body
    if (!repoUrl || typeof repoUrl !== 'string') {
      res.status(400).json({ error: 'Valid repoUrl string is required' })
      return
    }

    const report = await runBaselineAnalysis(repoUrl)
    res.json(report)
  } catch (err: any) {
    res.status(500).json({ error: `Baseline analysis failed: ${err.message}` })
  }
})

export default router
