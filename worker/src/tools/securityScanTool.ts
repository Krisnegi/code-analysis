import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface SecurityScanResult {
  success: boolean
  secretsCount?: number
  riskLevel?: string
  secretsFound?: string[]
  error?: string
}

export async function securityScanTool(volumeName: string): Promise<SecurityScanResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'security_scan.sh')
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `security_scan.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
