import { exec } from 'child_process'
import { promisify } from 'util'
import { UnrecoverableError } from 'bullmq'

const execAsync = promisify(exec)

export class SandboxOrchestrator {
  public static getVolumeName(jobId: string): string {
    const cleanId = jobId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `workspace_${cleanId}`
  }

  public static async createVolume(jobId: string): Promise<string> {
    const volumeName = this.getVolumeName(jobId)
    try {
      await execAsync(`docker volume create ${volumeName}`)
      return volumeName
    } catch (err: any) {
      throw new UnrecoverableError(`VolumeCreateError: Failed to create Docker volume ${volumeName}: ${err.message}`)
    }
  }

  public static async runClonerContainer(
    repoUrl: string,
    volumeName: string
  ): Promise<{ stdout: string; exitCode: number }> {
    const cmd = `docker run --rm --network bridge -v ${volumeName}:/workspace cloner clone ${repoUrl} /workspace`
    try {
      const { stdout } = await execAsync(cmd, { timeout: 120000 })
      return { stdout, exitCode: 0 }
    } catch (err: any) {
      const stdout = err.stdout || ''
      const exitCode = err.code || 1
      return { stdout, exitCode }
    }
  }

  public static async runAnalyzerScript(
    volumeName: string,
    scriptName: string,
    args: string[] = [],
    timeoutMs: number = 60000
  ): Promise<{ stdout: string; exitCode: number }> {
    const safeArgs = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ')
    const cmd = `docker run --rm --network none --cpus 0.5 --memory 512m -v ${volumeName}:/workspace:ro analyzer /scripts/${scriptName} ${safeArgs}`

    try {
      const { stdout } = await execAsync(cmd, { timeout: timeoutMs })
      return { stdout, exitCode: 0 }
    } catch (err: any) {
      const stdout = err.stdout || ''
      const exitCode = err.code || 1
      return { stdout, exitCode }
    }
  }

  public static async removeVolume(volumeName: string): Promise<void> {
    try {
      await execAsync(`docker volume rm -f ${volumeName}`)
    } catch (err: any) {
      console.error(`[SandboxOrchestrator] Warning: Failed to remove volume ${volumeName}: ${err.message}`)
    }
  }
}
