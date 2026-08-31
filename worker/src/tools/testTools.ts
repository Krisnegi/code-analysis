import {
  cloneRepoTool,
  staticAnalysisTool,
  testRunnerTool,
  dependencyScanTool,
  securityScanTool,
  gitMetricsTool,
  readFileTool,
  scoringTool,
  volumeCleanupTool
} from './index'

async function main() {
  const repoUrl = 'https://github.com/sindresorhus/is'
  const jobId = `test_job_${Date.now()}`

  console.log(`Starting Phase 2 Tools integration test on ${repoUrl}...`)

  try {
    console.log('1. Testing cloneRepoTool...')
    const cloneRes = await cloneRepoTool(repoUrl, jobId)
    console.log('   Clone Result:', cloneRes)

    console.log('2. Testing staticAnalysisTool...')
    const staticRes = await staticAnalysisTool(cloneRes.volumeName)
    console.log('   Static Analysis Result:', staticRes)

    console.log('3. Testing testRunnerTool...')
    const testRes = await testRunnerTool(cloneRes.volumeName, false)
    console.log('   Test Runner Result:', testRes)

    console.log('4. Testing dependencyScanTool...')
    const depRes = await dependencyScanTool(cloneRes.volumeName)
    console.log('   Dependency Scan Result:', depRes)

    console.log('5. Testing securityScanTool...')
    const secRes = await securityScanTool(cloneRes.volumeName)
    console.log('   Security Scan Result:', secRes)

    console.log('6. Testing readFileTool...')
    const fileRes = await readFileTool(cloneRes.volumeName, 'readme.md')
    console.log('   Read File Result:', { path: fileRes.path, lineCount: fileRes.lineCount, success: fileRes.success })

    console.log('7. Testing gitMetricsTool...')
    const gitRes = await gitMetricsTool(repoUrl)
    console.log('   Git Metrics Result:', gitRes)

    console.log('8. Testing scoringTool...')
    const scores = scoringTool({
      staticAnalysis: staticRes,
      testRunner: testRes,
      dependencyScan: depRes,
      securityScan: secRes,
      gitMetrics: gitRes
    })
    console.log('   Scoring Result:', JSON.stringify(scores, null, 2))
  } catch (err) {
    console.error('Integration test failed:', err)
  } finally {
    console.log('9. Cleaning up volume...')
    await volumeCleanupTool(jobId)
    console.log('   Cleanup finished!')
  }
}

main().catch(console.error)
