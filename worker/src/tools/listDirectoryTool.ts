import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface ListDirectoryResult {
  success: boolean
  path?: string
  items?: string[]
  error?: string
}

export async function listDirectoryTool(volumeName: string, dirPath: string = '.'): Promise<ListDirectoryResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'list_directory.sh', [
      dirPath
    ])
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `list_directory.sh failed with exit code ${exitCode}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
