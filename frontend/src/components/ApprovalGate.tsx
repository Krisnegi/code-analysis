import React, { useState } from 'react'
import { ShieldAlert, CheckCircle2, FastForward, FileCode, AlertTriangle, Clock } from 'lucide-react'
import { ApprovalContext } from '@code-analysis/shared'

interface ApprovalGateProps {
  jobId: string
  context?: ApprovalContext
  onDecision: (decision: 'approved' | 'skipped') => void
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({ jobId, context, onDecision }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        onDecision('approved')
      } else {
        setError(data.error || 'Failed to approve execution')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/skip-test`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        onDecision('skipped')
      } else {
        setError(data.error || 'Failed to skip test execution')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#121824] border-2 border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 my-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1f293d] pb-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Human Approval Required
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Consequential Action Checkpoint
              </span>
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              PDF Ground Rule 04: The agent requires human verification before executing code.
            </p>
          </div>
        </div>
        <div className="flex items-center text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          <Clock className="w-4 h-4 mr-1.5 animate-spin" />
          <span>Auto-skips in 10 minutes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1f293d]">
          <span className="text-xs text-slate-400 block mb-1">Language & Files</span>
          <span className="text-base font-semibold text-white flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-blue-400" />
            {context?.detectedLanguage || 'JS/TS'} ({context?.fileCount || 0} files)
          </span>
        </div>

        <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1f293d]">
          <span className="text-xs text-slate-400 block mb-1">Static Analysis Summary</span>
          <span className="text-base font-semibold text-white flex items-center gap-2">
            <span className="text-emerald-400">{context?.staticAnalysisSummary.lintErrors || 0} Lint Errors</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{context?.staticAnalysisSummary.complexFilesCount || 0} Complex Files</span>
          </span>
        </div>

        <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1f293d]">
          <span className="text-xs text-slate-400 block mb-1">Test Runner Framework</span>
          <span className="text-base font-semibold text-amber-300">
            {context?.testFramework || 'npm test'} (Sandboxed)
          </span>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 text-sm text-slate-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-200 block mb-0.5">Execution Details & Safety Constraints:</strong>
            The agent is requesting permission to execute <code className="bg-[#0a0d14] px-2 py-0.5 rounded text-amber-300 font-mono">npm test / pytest</code> inside an isolated container with <code className="bg-[#0a0d14] px-1.5 py-0.5 rounded text-blue-300">--network none</code>, 512MB RAM cap, and a strict 30s timeout.
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all flex items-center justify-center space-x-2 border border-slate-700 disabled:opacity-50"
        >
          <FastForward className="w-4 h-4 text-slate-400" />
          <span>Skip Test Execution (Mark N/A)</span>
        </button>

        <button
          onClick={handleApprove}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{loading ? 'Resuming Agent...' : 'Approve & Execute Test Suite'}</span>
        </button>
      </div>
    </div>
  )
}
