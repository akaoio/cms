import { FS } from '../core/FS.js'

/**
 * appendError — Log a build error to build/errors.log in newline-delimited JSON format.
 * Never throws, ensuring one bad file doesn't crash the build.
 */
export async function appendError(data) {
    try {
        const entry = JSON.stringify({
            ts: new Date().toISOString(),
            ...data
        })
        const logPath = ['build', 'errors.log']
        
        let existing = ''
        if (await FS.exist(logPath)) {
            existing = await FS.load(logPath)
        }
        
        await FS.write(logPath, existing + entry + '\n')
    } catch (err) {
        console.error('CRITICAL: Failed to write to errors.log', err)
    }
}
