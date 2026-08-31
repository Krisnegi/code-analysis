import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
})

export const analysisQueue = new Queue('analysisQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 }
  }
})
