import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { redisConnection } from '../queue/analysisQueue'

const router = Router()

router.get('/report/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id
    const repoUrl = await redisConnection.get(`job:${jobId}:repo_url`)

    let reportPath = ''
    const trajectoriesDir = path.resolve(__dirname, '../../../trajectories')

    if (repoUrl) {
      const repoSlug = repoUrl.split('github.com/')[1].replace('/', '_')
      const targetPath = path.join(trajectoriesDir, repoSlug, 'report.json')
      if (fs.existsSync(targetPath)) {
        reportPath = targetPath
      }
    }

    if (!reportPath && fs.existsSync(trajectoriesDir)) {
      const subdirs = fs.readdirSync(trajectoriesDir)
      for (const dir of subdirs) {
        const p = path.join(trajectoriesDir, dir, 'report.json')
        if (fs.existsSync(p)) {
          const content = JSON.parse(fs.readFileSync(p, 'utf-8'))
          if (content.jobId === jobId) {
            reportPath = p
            break
          }
        }
      }
    }

    if (!reportPath || !fs.existsSync(reportPath)) {
      res.status(404).json({ error: `Report for job ${jobId} not found` })
      return
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    res.json(reportData)
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch report: ${err.message}` })
  }
})

export default router
