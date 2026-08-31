import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

import { runCodeAnalysisAgent } from './agent/codeAnalysisAgent'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
})

console.log('Worker initializing, connecting to Redis:', redisUrl)

export const worker = new Worker(
  'analysisQueue',
  async (job: Job) => {
    const { jobId, repoUrl } = job.data
    console.log(`[Worker] Picked up job ${jobId} for repo ${repoUrl}`)

    try {
      await redisConnection.set(`job:${jobId}:status`, 'active')
      await redisConnection.set(`job:${jobId}:repo_url`, repoUrl)

      const report = await runCodeAnalysisAgent(jobId, repoUrl, redisConnection)
      console.log(`[Worker] Successfully completed job ${jobId} with total score ${report.totalScore}`)
      return report
    } catch (err: any) {
      console.error(`[Worker] Permanent error processing job ${jobId}: ${err.message}`)
      await redisConnection.set(`job:${jobId}:status`, 'failed')
      await redisConnection.set(`job:${jobId}:error`, err.message)
      throw err
    }
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
)

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`)
})

console.log('Worker service ready and listening for jobs on analysisQueue...')
