import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { redisConnection } from '../queue/analysisQueue'
import { TrajectoryStep } from '@code-analysis/shared'

const router = Router()

router.get('/trajectory/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id
    const repoUrl = await redisConnection.get(`job:${jobId}:repo_url`)

    let trajectoryPath = ''
    const trajectoriesDir = path.resolve(__dirname, '../../../trajectories')

    if (repoUrl) {
      const repoSlug = repoUrl.split('github.com/')[1].replace('/', '_')
      const targetPath = path.join(trajectoriesDir, repoSlug, 'trajectory.jsonl')
      if (fs.existsSync(targetPath)) {
        trajectoryPath = targetPath
      }
    }

    if (!trajectoryPath && fs.existsSync(trajectoriesDir)) {
      const subdirs = fs.readdirSync(trajectoriesDir)
      for (const dir of subdirs) {
        const p = path.join(trajectoriesDir, dir, 'trajectory.jsonl')
        if (fs.existsSync(p)) {
          trajectoryPath = p
          break
        }
      }
    }

    if (!trajectoryPath || !fs.existsSync(trajectoryPath)) {
      res.status(404).json({ error: `Trajectory log for job ${jobId} not found` })
      return
    }

    const fileContent = fs.readFileSync(trajectoryPath, 'utf-8')
    const lines = fileContent.split('\n').filter((line) => line.trim().length > 0)
    const steps: TrajectoryStep[] = lines.map((line) => JSON.parse(line))

    res.json({
      jobId,
      stepCount: steps.length,
      trajectory: steps
    })
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch trajectory: ${err.message}` })
  }
})

export default router
