import { convertLottieToVideo } from './src/lib/converter';
import fs from 'fs';
import path from 'path';

async function verifyOptimization() {
    try {
        console.log('[Test] Starting GIF/WebP optimization verification...');
        const lottieJson = JSON.parse(fs.readFileSync('./sample-lottie.json', 'utf8'));
        // Request all formats
        const formats = ['mp4', 'gif', 'webp'];
        
        console.log('[Test] Calling convertLottieToVideo with GIF and WebP requested...');
        const startTime = Date.now();
        const results = await convertLottieToVideo(lottieJson, formats);
        const endTime = Date.now();
        
        console.log('[Test] Success! Results:', results);
        console.log(`[Test] Total time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
        
        // Verify files exist in public/exports
        for (const format of formats) {
            const filePath = path.join(process.cwd(), 'public', results[format as keyof typeof results]!);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`[Test] Verified ${format.toUpperCase()}: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            } else {
                console.error(`[Test] FAILED: ${format.toUpperCase()} file not found at ${filePath}`);
            }
        }
    } catch (error) {
        console.error('[Test] Verification failed:', error);
    }
}

verifyOptimization();
