import { Octokit } from '@octokit/rest'

export interface GitMetricsResult {
  success: boolean
  commitFrequency?: string
  contributors?: number
  busFactor?: number
  prMergeRate?: string
  stalePRs?: number
  avgPRDescriptionLength?: number
  prsWithReviews?: string
  prsLinkedToIssues?: string
  openIssues?: number
  staleIssues?: number
  avgIssueResolution?: string
  labelledIssues?: string
  bugVsFeatureRatio?: { bug: number; enhancement: number; question: number }
  error?: string
}

export async function gitMetricsTool(repoUrl: string): Promise<GitMetricsResult> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      return { success: false, error: `Invalid GitHub URL: ${repoUrl}` }
    }
    const [, owner, repo] = match
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    let commitCount = 0
    const committerMap: Record<string, number> = {}

    try {
      const commitsRes = await octokit.repos.listCommits({ owner, repo, since: ninetyDaysAgo, per_page: 100 })
      commitCount = commitsRes.data.length
      commitsRes.data.forEach((c) => {
        const author = c.author?.login || c.commit.author?.name || 'unknown'
        committerMap[author] = (committerMap[author] || 0) + 1
      })
    } catch {
      commitCount = 0
    }

    const uniqueContributors = Object.keys(committerMap).length || 1
    const topCommitterCount = Math.max(...Object.values(committerMap), 0)
    const busFactor = commitCount > 0 ? parseFloat((topCommitterCount / commitCount).toFixed(2)) : 1.0

    let totalPRs = 0
    let mergedPRs = 0
    let stalePRs = 0
    let prBodyLenSum = 0
    let prsLinkedCount = 0
    const now = Date.now()

    try {
      const prsRes = await octokit.pulls.list({ owner, repo, state: 'all', per_page: 50 })
      totalPRs = prsRes.data.length
      prsRes.data.forEach((pr) => {
        if (pr.merged_at) mergedPRs++
        const isStale = pr.state === 'open' && (now - new Date(pr.updated_at).getTime()) > 30 * 24 * 60 * 60 * 1000
        if (isStale) stalePRs++
        if (pr.body) prBodyLenSum += pr.body.length
        if (pr.body && /(closes|fixes|resolves) #\d+/i.test(pr.body)) prsLinkedCount++
      })
    } catch {
      totalPRs = 0
    }

    const prMergeRate = totalPRs > 0 ? `${Math.round((mergedPRs / totalPRs) * 100)}%` : 'N/A'
    const avgPRDescriptionLength = totalPRs > 0 ? Math.round(prBodyLenSum / totalPRs) : 0
    const prsLinkedToIssues = totalPRs > 0 ? `${Math.round((prsLinkedCount / totalPRs) * 100)}%` : '0%'

    let openIssuesCount = 0
    let staleIssuesCount = 0
    let labelledIssuesCount = 0
    let resolutionTimeDaysSum = 0
    let closedIssuesCount = 0
    const labelBreakdown = { bug: 0, enhancement: 0, question: 0 }

    try {
      const issuesRes = await octokit.issues.listForRepo({ owner, repo, state: 'all', per_page: 50 })
      issuesRes.data.forEach((issue) => {
        if (issue.pull_request) return
        if (issue.state === 'open') {
          openIssuesCount++
          if ((now - new Date(issue.updated_at).getTime()) > 60 * 24 * 60 * 60 * 1000) {
            staleIssuesCount++
          }
        } else if (issue.closed_at) {
          closedIssuesCount++
          const created = new Date(issue.created_at).getTime()
          const closed = new Date(issue.closed_at).getTime()
          resolutionTimeDaysSum += (closed - created) / (1000 * 60 * 60 * 24)
        }

        if (issue.labels && issue.labels.length > 0) {
          labelledIssuesCount++
          issue.labels.forEach((lbl: any) => {
            const name = typeof lbl === 'string' ? lbl.toLowerCase() : (lbl.name || '').toLowerCase()
            if (name.includes('bug')) labelBreakdown.bug++
            else if (name.includes('feature') || name.includes('enhancement')) labelBreakdown.enhancement++
            else if (name.includes('question')) labelBreakdown.question++
          })
        }
      })
    } catch {
      openIssuesCount = 0
    }

    const avgIssueResolution = closedIssuesCount > 0
      ? `${Math.round(resolutionTimeDaysSum / closedIssuesCount)} days`
      : 'N/A'
    const totalIssues = openIssuesCount + closedIssuesCount
    const labelledIssues = totalIssues > 0 ? `${Math.round((labelledIssuesCount / totalIssues) * 100)}%` : '0%'

    return {
      success: true,
      commitFrequency: `${commitCount}/90days`,
      contributors: uniqueContributors,
      busFactor,
      prMergeRate,
      stalePRs,
      avgPRDescriptionLength,
      prsWithReviews: prMergeRate,
      prsLinkedToIssues,
      openIssues: openIssuesCount,
      staleIssues: staleIssuesCount,
      avgIssueResolution,
      labelledIssues,
      bugVsFeatureRatio: labelBreakdown
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
