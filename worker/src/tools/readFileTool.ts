import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface ReadFileResult {
  success: boolean
  path?: string
  lineCount?: number
  content?: string
  error?: string
}

export async function readFileTool(volumeName: string, filePath: string): Promise<ReadFileResult> {
  try {
    const { stdout, exitCode } = await SandboxOrchestrator.runAnalyzerScript(volumeName, 'read_file.sh', [filePath])
    if (exitCode !== 0 || !stdout) {
      return { success: false, error: `read_file.sh failed with exit code ${exitCode} for path ${filePath}` }
    }
    const parsed = JSON.parse(stdout)
    return { success: true, ...parsed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
