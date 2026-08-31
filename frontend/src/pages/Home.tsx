import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RepoInput } from '../components/RepoInput'
import { ApprovalGate } from '../components/ApprovalGate'
import { JobStatusResponse, AnalysisReport } from '@code-analysis/shared'
import { Loader2, ArrowRight, X, Cpu, CheckCircle2, ShieldAlert, AlertCircle, Sparkles, Sliders } from 'lucide-react'

interface TrackedJob {
  jobId: string
  repoUrl: string
  mode?: 'agent' | 'baseline'
  baselineReport?: AnalysisReport
  statusData?: JobStatusResponse
}

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load tracked jobs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trackedJobs')
      if (saved) {
        const parsed: TrackedJob[] = JSON.parse(saved)
        setTrackedJobs(parsed)
      }
    } catch {
      // Ignore parse error
    }
  }, [])

  // Sync tracked jobs to localStorage
  const saveTrackedJobs = (jobs: TrackedJob[]) => {
    setTrackedJobs(jobs)
    try {
      localStorage.setItem('trackedJobs', JSON.stringify(jobs))
    } catch {
      // Ignore write error
    }
  }

  const handleAnalyze = async (repoUrl: string, mode: 'agent' | 'baseline') => {
    setSubmitting(true)
    setError(null)

    if (mode === 'baseline') {
      const repoSlug = repoUrl.split('github.com/')[1]?.replace('/', '_') || 'repo'
      const jobId = `baseline_${repoSlug}_${Math.random().toString(36).substring(2, 7)}`

      const initialJob: TrackedJob = {
        jobId,
        repoUrl,
        mode: 'baseline',
        statusData: {
          jobId,
          status: 'active' as const,
          currentStep: 'Evaluating README text with 1-pass zero-tool LLM baseline...'
        }
      }

      const updatedList = [initialJob, ...trackedJobs.filter((j) => j.jobId !== jobId)]
      saveTrackedJobs(updatedList)

      try {
        const res = await fetch('/api/baseline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl })
        })
        const report = await res.json()
        if (res.ok) {
          const finishedList: TrackedJob[] = updatedList.map((j) =>
            j.jobId === jobId
              ? {
                  ...j,
                  baselineReport: report,
                  statusData: { jobId, status: 'done' as const, currentStep: '1-pass baseline analysis complete' }
                }
              : j
          )
          saveTrackedJobs(finishedList)
        } else {
          setError(report.error || 'Baseline analysis failed')
          const failedList: TrackedJob[] = updatedList.map((j) =>
            j.jobId === jobId
              ? {
                  ...j,
                  statusData: { jobId, status: 'failed' as const, currentStep: 'Baseline analysis failed' }
                }
              : j
          )
          saveTrackedJobs(failedList)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setSubmitting(false)
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
        const newJob: TrackedJob = { jobId: data.jobId, repoUrl, mode: 'agent' }
        saveTrackedJobs([newJob, ...trackedJobs.filter((j) => j.jobId !== data.jobId)])
      } else {
        setError(data.error || 'Failed to submit analysis job')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const removeJob = async (jobId: string) => {
    const target = trackedJobs.find((j) => j.jobId === jobId)
    const status = target?.statusData?.status

    if (target?.mode !== 'baseline' && status && status !== 'done' && status !== 'failed') {
      try {
        await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
      } catch {
        // Ignore network error on cancel
      }
    }

    const updated = trackedJobs.filter((j) => j.jobId !== jobId)
    saveTrackedJobs(updated)
  }

  // Poll all active Agentic jobs every 2 seconds
  useEffect(() => {
    if (trackedJobs.length === 0) return

    const interval = setInterval(async () => {
      const updatedJobs = await Promise.all(
        trackedJobs.map(async (job) => {
          // Skip baseline jobs or completed jobs
          if (
            job.mode === 'baseline' ||
            job.statusData?.status === 'done' ||
            job.statusData?.status === 'failed'
          ) {
            return job
          }

          try {
            const res = await fetch(`/api/status/${job.jobId}`)
            if (res.ok) {
              const statusData: JobStatusResponse = await res.json()
              return { ...job, statusData }
            }
          } catch {
            // Keep existing status on network glitch
          }
          return job
        })
      )

      saveTrackedJobs(updatedJobs)
    }, 2000)

    return () => clearInterval(interval)
  }, [trackedJobs])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <RepoInput onAnalyze={handleAnalyze} submitting={submitting} />

      {error && (
        <div className="max-w-3xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Multi-Job Active Queue Control Center */}
      {trackedJobs.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              Active Analysis Queue ({trackedJobs.length})
            </h3>
            <span className="text-xs text-slate-400">
              Real-time multi-repo status poller
            </span>
          </div>

          {trackedJobs.map((job) => {
            const status = job.statusData?.status || 'pending'
            const currentStep = job.statusData?.currentStep || 'Initializing analysis...'
            const isBaseline = job.mode === 'baseline'

            return (
              <div
                key={job.jobId}
                className="bg-[#121824] border border-[#1f293d] rounded-2xl p-6 shadow-xl space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1f293d]/60 pb-4">
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Repo Title + Mode Badge */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-base font-bold text-white break-all">
                        {job.repoUrl.replace('https://github.com/', '')}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 shrink-0 ${
                          isBaseline
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {isBaseline ? <Sliders className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        <span>{isBaseline ? 'Baseline Mode' : 'Full Agentic'}</span>
                      </span>
                    </div>

                    {/* Row 2: Job ID (ALWAYS on its own line below repo name) */}
                    <div className="text-xs font-mono text-slate-500 mt-1 block">
                      ({job.jobId})
                    </div>

                    {/* Row 3: Current Step Status */}
                    <div className="text-xs text-slate-400 mt-1 block">
                      {currentStep}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-semibold capitalize inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        status === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : status === 'awaiting_approval'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 animate-pulse'
                          : status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {status === 'done' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : status === 'awaiting_approval' ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : status === 'failed' ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>{status.replace('_', ' ')}</span>
                    </span>

                    {/* View Report Button if done */}
                    {status === 'done' && (
                      <button
                        onClick={() => {
                          if (isBaseline && job.baselineReport) {
                            navigate('/report/baseline', { state: { report: job.baselineReport } })
                          } else {
                            navigate(`/report/${job.jobId}`)
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all inline-flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 min-w-[115px]"
                      >
                        <span className="whitespace-nowrap">View Report</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeJob(job.jobId)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 shrink-0"
                      title="Remove from queue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Approval Gate Card if awaiting approval */}
                {status === 'awaiting_approval' && (
                  <ApprovalGate
                    jobId={job.jobId}
                    context={job.statusData?.approvalContext}
                    onDecision={() => {
                      // Status will update automatically on next poll
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
