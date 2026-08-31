import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

import analyzeRouter from './routes/analyze'
import statusRouter from './routes/status'
import approvalRouter from './routes/approval'
import reportRouter from './routes/report'
import trajectoryRouter from './routes/trajectory'
import baselineRouter from './routes/baseline'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() })
})

app.use('/api', analyzeRouter)
app.use('/api', statusRouter)
app.use('/api', approvalRouter)
app.use('/api', reportRouter)
app.use('/api', trajectoryRouter)
app.use('/api', baselineRouter)

app.listen(port, () => {
  console.log(`API Server listening on port ${port}`)
})
