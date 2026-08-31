import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface DependencyScanResult {
  success: boolean
  dependencyCount?: number
  criticalVulns?: string[]
  outdatedCount?: number
  error?: string
}

export async function dependencyScanTool(volumeName: string): Promise<DependencyScanResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'dependency_scan.sh')
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `dependency_scan.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
