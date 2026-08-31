import React, { useState } from 'react'
import { Search, Sparkles, Sliders, ArrowRight } from 'lucide-react'

interface RepoInputProps {
  onAnalyze: (url: string, mode: 'agent' | 'baseline') => void
  loading: boolean
}

export const RepoInput: React.FC<RepoInputProps> = ({ onAnalyze, loading }) => {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'agent' | 'baseline'>('agent')

  const presetRepos = [
    { label: 'expressjs/express', url: 'https://github.com/expressjs/express' },
    { label: 'pallets/flask', url: 'https://github.com/pallets/flask' },
    { label: 'sindresorhus/is', url: 'https://github.com/sindresorhus/is' },
    { label: 'axios/axios', url: 'https://github.com/axios/axios' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onAnalyze(url.trim(), mode)
    }
  }

  return (
    <div className="bg-[#121824] border border-[#1f293d] rounded-2xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto mb-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Is This Repository Actually Good?
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Submit any public GitHub URL for an automated, sandboxed, 6-category agentic quality evaluation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full pl-12 pr-4 py-3.5 bg-[#0a0d14] border border-[#1f293d] focus:border-blue-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-[#0a0d14] p-1 rounded-xl border border-[#1f293d] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode('agent')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'agent'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Agentic Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('baseline')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'baseline'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Baseline Mode</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Initializing...' : 'Analyze Repository'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-[#1f293d]">
        <span className="text-xs text-slate-400 block mb-2 font-medium">Quick Presets:</span>
        <div className="flex flex-wrap gap-2">
          {presetRepos.map((preset) => (
            <button
              key={preset.url}
              onClick={() => {
                setUrl(preset.url)
                onAnalyze(preset.url, mode)
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0a0d14] hover:bg-slate-800 text-slate-300 border border-[#1f293d] transition-all hover:border-slate-600"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
