import { runPipeline } from './pipeline.js'

runPipeline().catch(err => {
    console.error('CRITICAL BUILD FAILURE:', err)
    process.exit(1)
})
