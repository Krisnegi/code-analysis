import { UnrecoverableError } from 'bullmq'
import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export interface CloneResult {
  success: boolean
  jobId: string
  volumeName: string
  error?: string
}

export async function cloneRepoTool(repoUrl: string, jobId: string): Promise<CloneResult> {
  const volumeName = await SandboxOrchestrator.createVolume(jobId)

  const { stdout, exitCode } = await SandboxOrchestrator.runClonerContainer(repoUrl, volumeName)

  if (exitCode !== 0) {
    throw new UnrecoverableError(`CloneRepoError: Failed to clone repository ${repoUrl} (exit code ${exitCode}): ${stdout}`)
  }

  return {
    success: true,
    jobId,
    volumeName
  }
}
