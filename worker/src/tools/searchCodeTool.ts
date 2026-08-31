import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface SearchCodeResult {
  success: boolean
  pattern?: string
  searchDir?: string
  matches?: string[]
  error?: string
}

export async function searchCodeTool(
  volumeName: string,
  pattern: string,
  searchDir: string = '.'
): Promise<SearchCodeResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'search_code.sh', [
      pattern,
      searchDir
    ])
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `search_code.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
