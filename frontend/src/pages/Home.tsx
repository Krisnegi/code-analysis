import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RepoInput } from '../components/RepoInput'
import { ApprovalGate } from '../components/ApprovalGate'
import { JobStatusResponse } from '@code-analysis/shared'
import { Loader2 } from 'lucide-react'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [jobId, setJobId] = useState<string | null>(null)
  const [statusResponse, setStatusResponse] = useState<JobStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (repoUrl: string, mode: 'agent' | 'baseline') => {
    setLoading(true)
    setError(null)
    setJobId(null)
    setStatusResponse(null)

    if (mode === 'baseline') {
      try {
        const res = await fetch('/api/baseline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl })
        })
        const report = await res.json()
        if (res.ok) {
          navigate('/report/baseline', { state: { report } })
        } else {
          setError(report.error || 'Baseline analysis failed')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })
      const data = await res.json()
      if (res.ok) {
        setJobId(data.jobId)
      } else {
        setError(data.error || 'Failed to submit analysis job')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!jobId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`)
        const data: JobStatusResponse = await res.json()
        setStatusResponse(data)

        if (data.status === 'done') {
          clearInterval(interval)
          setLoading(false)
          navigate(`/report/${jobId}`)
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setLoading(false)
          setError(data.error || 'Job failed')
        }
      } catch {
        // Retry silently
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, navigate])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <RepoInput onAnalyze={handleAnalyze} loading={loading} />

      {error && (
        <div className="max-w-3xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {statusResponse?.status === 'awaiting_approval' && jobId && (
        <div className="max-w-3xl mx-auto">
          <ApprovalGate
            jobId={jobId}
            context={statusResponse.approvalContext}
            onDecision={() => {}}
          />
        </div>
      )}

      {loading && statusResponse && statusResponse.status !== 'awaiting_approval' && (
        <div className="max-w-3xl mx-auto bg-[#121824] border border-[#1f293d] p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-mono">Job ID: {jobId}</span>
              <h4 className="text-base font-bold text-white">
                {statusResponse.currentStep || 'Agent analyzing repository...'}
              </h4>
            </div>
          </div>

          <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold capitalize">
            {statusResponse.status}
          </span>
        </div>
      )}
    </div>
  )
}
