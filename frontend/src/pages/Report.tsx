import React, { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { AnalysisReport, TrajectoryStep } from '@code-analysis/shared'
import { ScoreCard } from '../components/ScoreCard'
import { RadarChartComponent } from '../components/RadarChartComponent'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { TrajectoryViewer } from '../components/TrajectoryViewer'
import { Loader2, ArrowLeft } from 'lucide-react'

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [report, setReport] = useState<AnalysisReport | null>(location.state?.report || null)
  const [trajectory, setTrajectory] = useState<TrajectoryStep[]>([])
  const [loading, setLoading] = useState(!location.state?.report)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (location.state?.report) return

    async function fetchData() {
      try {
        setLoading(true)
        const reportRes = await fetch(`/api/report/${id}`)
        const reportData = await reportRes.json()

        if (!reportRes.ok) {
          setError(reportData.error || 'Failed to load report')
          return
        }

        setReport(reportData)

        try {
          const trajRes = await fetch(`/api/trajectory/${id}`)
          const trajData = await trajRes.json()
          if (trajRes.ok) {
            setTrajectory(trajData.trajectory || [])
          }
        } catch {
          // Trajectory is optional
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, location.state])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Fetching analysis report...</span>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl mb-6">
          {error || 'Report not found'}
        </div>
        <Link to="/" className="inline-flex items-center text-sm text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center text-xs text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        <span>Analyze another repository</span>
      </Link>

      <ScoreCard
        repoUrl={report.repoUrl}
        totalScore={report.totalScore}
        scoringMethod={report.scoringMethod}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <RadarChartComponent report={report} />
        </div>
        <div className="lg:col-span-2">
          <CategoryBreakdown report={report} />
        </div>
      </div>

      {trajectory.length > 0 && <TrajectoryViewer steps={trajectory} />}
    </div>
  )
}
