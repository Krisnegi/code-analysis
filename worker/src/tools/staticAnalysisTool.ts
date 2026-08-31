import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface StaticAnalysisResult {
  success: boolean
  language?: string
  totalFiles?: number
  tsFiles?: number
  jsFiles?: number
  pyFiles?: number
  lintErrors?: number
  lintWarnings?: number
  complexFiles?: string[]
  error?: string
}

export async function staticAnalysisTool(volumeName: string): Promise<StaticAnalysisResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'static_analysis.sh')
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `static_analysis.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
