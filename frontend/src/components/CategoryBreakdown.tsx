import React from 'react'
import { Code2, TestTube2, Layers, PackageCheck, GitBranch, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react'
import { AnalysisReport } from '@code-analysis/shared'

interface CategoryBreakdownProps {
  report: AnalysisReport
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ report }) => {
  const categoryConfigs = [
    { key: 'codeQuality', title: 'Code Quality', icon: Code2, desc: 'ESLint/Pylint errors, complexity' },
    { key: 'testCoverage', title: 'Test Coverage', icon: TestTube2, desc: 'Pass/fail rate & coverage %' },
    { key: 'architecture', title: 'Architecture', icon: Layers, desc: 'Modularity & file organization' },
    { key: 'dependencies', title: 'Dependencies & Security', icon: PackageCheck, desc: 'CVE audit & secret detection' },
    { key: 'maintainability', title: 'Maintainability', icon: GitBranch, desc: 'Bus factor, PRs & issue resolution' },
    { key: 'documentation', title: 'Documentation', icon: BookOpen, desc: 'README & inline documentation' }
  ]

  return (
    <div className="space-y-6 mb-8">
      <h3 className="text-xl font-bold text-white">6-Category Rubric Breakdown</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryConfigs.map((cat) => {
          const Icon = cat.icon
          const categoryData = (report.categories as any)[cat.key]
          const score = categoryData?.score
          const evidenceList: string[] = Array.isArray(categoryData?.evidence)
            ? categoryData.evidence
            : categoryData?.evidence
            ? [categoryData.evidence]
            : []

          let scoreBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          if (score === null) {
            scoreBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700'
          } else if (score < 4) {
            scoreBadgeColor = 'bg-red-500/10 text-red-400 border-red-500/30'
          } else if (score < 7) {
            scoreBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }

          return (
            <div
              key={cat.key}
              className="bg-[#121824] border border-[#1f293d] hover:border-blue-500/30 rounded-2xl p-6 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{cat.title}</h4>
                      <span className="text-xs text-slate-400">{cat.desc}</span>
                    </div>
                  </div>

                  <span className={`text-sm font-bold px-3 py-1 rounded-xl border ${scoreBadgeColor}`}>
                    {score !== null ? `${score} / 10` : 'N/A'}
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Evidence Signals:
                  </span>
                  {evidenceList.length > 0 ? (
                    evidenceList.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-[#0a0d14] p-2.5 rounded-lg border border-[#1f293d]">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{ev}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#0a0d14] p-2.5 rounded-lg border border-[#1f293d]">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                      <span>No direct evidence collected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
