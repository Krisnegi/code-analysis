import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface TestRunnerResult {
  success: boolean
  testFileCount?: number
  framework?: string
  passed?: number
  failed?: number
  coverage?: string
  timedOut?: boolean
  skipped?: boolean
  reason?: string
  error?: string
}

export async function testRunnerTool(volumeName: string, skipped: boolean = false): Promise<TestRunnerResult> {
  if (skipped) {
    return {
      success: true,
      skipped: true,
      reason: 'Human user declined test execution checkpoint',
      coverage: 'N/A'
    }
  }

  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(
      volumeName,
      'test_runner.sh',
      [],
      45000
    )
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `test_runner.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
