import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Terminal, ShieldAlert, RefreshCw, Zap, Cpu } from 'lucide-react'
import { TrajectoryStep } from '@code-analysis/shared'

interface TrajectoryProps {
  steps: TrajectoryStep[]
}

export const TrajectoryViewer: React.FC<TrajectoryProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(true)
  const [filter, setFilter] = useState<'all' | 'checkpoints' | 'retries'>('all')

  const filteredSteps = steps.filter((step) => {
    if (filter === 'checkpoints') return step.type === 'human_checkpoint'
    if (filter === 'retries') return step.type === 'retry_event' || step.type === 'provider_fallback'
    return true
  })

  return (
    <div className="bg-[#121824] border border-[#1f293d] rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1f293d] pb-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Agent Execution Trajectory Log
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Step-by-step record of agent thoughts, tool calls, human checkpoints, and LLM retries ({steps.length} steps).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-[#0a0d14] p-1 rounded-lg border border-[#1f293d] text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Steps ({steps.length})
            </button>
            <button
              onClick={() => setFilter('checkpoints')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filter === 'checkpoints' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Checkpoints
            </button>
            <button
              onClick={() => setFilter('retries')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filter === 'retries' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Retries
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredSteps.map((step) => {
            let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            let Icon = Cpu

            if (step.type === 'human_checkpoint') {
              badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              Icon = ShieldAlert
            } else if (step.type === 'retry_event') {
              badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              Icon = RefreshCw
            } else if (step.type === 'provider_fallback') {
              badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
              Icon = Zap
            }

            return (
              <div
                key={step.step}
                className="bg-[#0a0d14] border border-[#1f293d] rounded-xl p-4 transition-all hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Step #{step.step}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badgeColor}`}>
                      <Icon className="w-3 h-3" />
                      {step.type}
                    </span>
                    {step.action && (
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {step.action}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {step.thought && (
                  <p className="text-xs text-slate-300 mb-2 font-mono leading-relaxed bg-[#121824] p-2.5 rounded-lg border border-[#1f293d]">
                    <span className="text-blue-400 font-semibold block mb-1">Thought:</span>
                    {step.thought}
                  </p>
                )}

                {step.event && (
                  <div className="text-xs text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mb-2">
                    Event: {String(step.event)}
                  </div>
                )}

                {step.observation && (
                  <details className="mt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer font-mono text-slate-400 hover:text-slate-200">
                      View Observation JSON
                    </summary>
                    <pre className="mt-2 bg-[#121824] p-3 rounded-lg border border-[#1f293d] overflow-x-auto text-[11px] font-mono text-emerald-300">
                      {JSON.stringify(step.observation, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
