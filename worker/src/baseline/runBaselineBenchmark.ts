import fs from 'fs'
import path from 'path'
import { runBaselineAnalysis, BaselineReport } from './baselineAnalyzer'

interface RepoItem {
  id: string
  name: string
  url: string
  language: string
}

interface HumanRankings {
  ranking: string[]
}

function calculateSpearman(rankArrayA: string[], rankArrayB: string[]): number {
  const n = rankArrayA.length
  if (n === 0 || n !== rankArrayB.length) return 0

  let dSquareSum = 0
  for (let i = 0; i < n; i++) {
    const item = rankArrayA[i]
    const rankInB = rankArrayB.indexOf(item)
    if (rankInB !== -1) {
      const diff = i - rankInB
      dSquareSum += diff * diff
    }
  }

  return 1 - (6 * dSquareSum) / (n * (n * n - 1))
}

export async function runBenchmark(): Promise<void> {
  const reposPath = path.resolve(__dirname, '../../../evaluation/repos.json')
  const humanRankingsPath = path.resolve(__dirname, '../../../evaluation/human_rankings.json')
  const baselineResultsPath = path.resolve(__dirname, '../../../evaluation/baseline_results.json')
  const trajectoriesDir = path.resolve(__dirname, '../../../trajectories')

  const repos: RepoItem[] = JSON.parse(fs.readFileSync(reposPath, 'utf-8'))
  const humanRankings: HumanRankings = JSON.parse(fs.readFileSync(humanRankingsPath, 'utf-8'))

  console.log(`Starting Baseline Benchmark on ${repos.length} repositories...`)

  const results: Record<string, BaselineReport> = {}

  for (const repo of repos) {
    console.log(`Analyzing baseline for ${repo.name}...`)
    const report = await runBaselineAnalysis(repo.url)
    results[repo.id] = report

    const repoSlug = repo.name.replace('/', '_')
    const repoTrajDir = path.join(trajectoriesDir, repoSlug)
    if (!fs.existsSync(repoTrajDir)) {
      fs.mkdirSync(repoTrajDir, { recursive: true })
    }

    fs.writeFileSync(path.join(repoTrajDir, 'baseline_report.json'), JSON.stringify(report, null, 2))
  }

  const baselineRanked = [...repos].sort((a, b) => {
    const scoreA = results[a.id]?.totalScore || 0
    const scoreB = results[b.id]?.totalScore || 0
    return scoreB - scoreA
  })

  const baselineRankIds = baselineRanked.map((r) => r.id)
  const spearman = calculateSpearman(baselineRankIds, humanRankings.ranking)

  const summary = {
    method: 'baseline',
    timestamp: new Date().toISOString(),
    spearmanCorrelation: parseFloat(spearman.toFixed(4)),
    rankings: baselineRankIds,
    humanRankings: humanRankings.ranking,
    scores: results
  }

  fs.writeFileSync(baselineResultsPath, JSON.stringify(summary, null, 2))
  console.log(`Baseline Benchmark Complete! Spearman Correlation: ${summary.spearmanCorrelation}`)
}

if (require.main === module) {
  runBenchmark().catch(console.error)
}
