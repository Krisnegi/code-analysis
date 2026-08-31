import { SandboxOrchestrator } from '../sandbox/sandboxOrchestrator'

export async function volumeCleanupTool(jobId: string): Promise<void> {
  const volumeName = SandboxOrchestrator.getVolumeName(jobId)
  await SandboxOrchestrator.removeVolume(volumeName)
}
