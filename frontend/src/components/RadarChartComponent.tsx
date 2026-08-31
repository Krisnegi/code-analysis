import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { AnalysisReport } from '@code-analysis/shared'

interface RadarProps {
  report: AnalysisReport
}

export const RadarChartComponent: React.FC<RadarProps> = ({ report }) => {
  const data = [
    { category: 'Code Quality', score: report.categories.codeQuality?.score ?? 0, fullMark: 10 },
    { category: 'Test Coverage', score: report.categories.testCoverage?.score ?? 0, fullMark: 10 },
    { category: 'Architecture', score: report.categories.architecture?.score ?? 0, fullMark: 10 },
    { category: 'Dependencies', score: report.categories.dependencies?.score ?? 0, fullMark: 10 },
    { category: 'Maintainability', score: report.categories.maintainability?.score ?? 0, fullMark: 10 },
    { category: 'Documentation', score: report.categories.documentation?.score ?? 0, fullMark: 10 }
  ]

  return (
    <div className="bg-[#121824] border border-[#1f293d] rounded-2xl p-6 shadow-xl mb-8">
      <h3 className="text-lg font-bold text-white mb-2">Category Score Radar</h3>
      <p className="text-xs text-slate-400 mb-6">
        Comparison across all 6 quality rubric dimensions (0 to 10 points each).
      </p>

      <div className="h-[320px] sm:h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#1f293d" />
            <PolarAngleAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#475569" />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.4}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0d14',
                borderColor: '#1f293d',
                borderRadius: '0.75rem',
                color: '#fff'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
