import React from 'react'
import { ShieldCheck, Github, ExternalLink } from 'lucide-react'

interface ScoreCardProps {
  repoUrl: string
  totalScore: number | null
  scoringMethod?: string
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ repoUrl, totalScore, scoringMethod = 'agent' }) => {
  const score = totalScore ?? 0
  const maxScore = 60
  const percentage = Math.round((score / maxScore) * 100)

  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  let tierLabel = 'Excellent Quality'

  if (score < 25) {
    badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30'
    tierLabel = 'High Technical Debt'
  } else if (score < 40) {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    tierLabel = 'Moderate Quality'
  }

  return (
    <div className="bg-[#121824] border border-[#1f293d] rounded-2xl p-6 sm:p-8 shadow-xl mb-8">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20 uppercase tracking-wider">
              {scoringMethod} Assessment
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${badgeColor}`}>
              {tierLabel}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center justify-center lg:justify-start gap-3">
            <Github className="w-8 h-8 text-slate-300" />
            <span className="break-all">{repoUrl.replace('https://github.com/', '')}</span>
          </h1>

          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View Repository on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        <div className="flex items-center gap-6 bg-[#0a0d14] px-8 py-5 rounded-2xl border border-[#1f293d] shadow-inner">
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${percentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white">{score}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">/ 60 pts</span>
            </div>
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Overall Score</span>
            <span className="text-xl font-bold text-white">{percentage}% Quality</span>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>6-Category Rubric</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
