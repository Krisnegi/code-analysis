import { Octokit } from '@octokit/rest'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatGroq } from '@langchain/groq'

export interface BaselineReport {
  repoUrl: string
  method: 'baseline'
  totalScore: number
  categories: {
    codeQuality: { score: number; evidence: string }
    testCoverage: { score: number; evidence: string }
    architecture: { score: number; evidence: string }
    dependencies: { score: number; evidence: string }
    maintainability: { score: number; evidence: string }
    documentation: { score: number; evidence: string }
  }
  timestamp: string
}

export async function runBaselineAnalysis(repoUrl: string): Promise<BaselineReport> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`)
  }
  const [, owner, repo] = match
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  let readmeContent = ''
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo })
    readmeContent = Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 3000)
  } catch {
    readmeContent = 'No README found.'
  }

  let fileTree: string[] = []
  try {
    const { data } = await octokit.git.getTree({ owner, repo, tree_sha: 'HEAD', recursive: 'false' })
    fileTree = data.tree.map((item) => item.path || '').filter(Boolean).slice(0, 50)
  } catch {
    fileTree = ['Error fetching tree']
  }

  const prompt = `You are evaluating a GitHub repository based solely on its README and file tree.
Repository: ${repoUrl}
File Tree: ${JSON.stringify(fileTree)}
README Preview:
${readmeContent}

Score the repository from 0 to 10 on each of these 6 categories:
1. codeQuality
2. testCoverage
3. architecture
4. dependencies
5. maintainability
6. documentation

Return ONLY valid JSON matching this structure:
{
  "codeQuality": { "score": number, "evidence": "string" },
  "testCoverage": { "score": number, "evidence": "string" },
  "architecture": { "score": number, "evidence": "string" },
  "dependencies": { "score": number, "evidence": "string" },
  "maintainability": { "score": number, "evidence": "string" },
  "documentation": { "score": number, "evidence": "string" }
}`

  let responseText = ''
  try {
    const primaryLLM = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY || 'dummy',
      maxRetries: 0
    })
    const res = await primaryLLM.invoke(prompt)
    responseText = typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
  } catch {
    try {
      const fallbackLLM = new ChatGroq({
        model: 'llama-3.3-70b-versatile',
        apiKey: process.env.GROQ_API_KEY || 'dummy',
        maxRetries: 0
      })
      const res = await fallbackLLM.invoke(prompt)
      responseText = typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
    } catch {
      responseText = JSON.stringify({
        codeQuality: { score: 5, evidence: 'Estimated from file tree' },
        testCoverage: { score: fileTree.some((f) => f.includes('test')) ? 5 : 2, evidence: 'File tree scan' },
        architecture: { score: 5, evidence: 'Default baseline estimate' },
        dependencies: { score: 5, evidence: 'Default baseline estimate' },
        maintainability: { score: 5, evidence: 'Default baseline estimate' },
        documentation: { score: readmeContent.length > 500 ? 7 : 3, evidence: 'README length check' }
      })
    }
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText)

  const totalScore =
    (parsed.codeQuality?.score || 0) +
    (parsed.testCoverage?.score || 0) +
    (parsed.architecture?.score || 0) +
    (parsed.dependencies?.score || 0) +
    (parsed.maintainability?.score || 0) +
    (parsed.documentation?.score || 0)

  return {
    repoUrl,
    method: 'baseline',
    totalScore,
    categories: parsed,
    timestamp: new Date().toISOString()
  }
}
